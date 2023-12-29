const express = require('express');
const router = express.Router();
const bcrypt = require("bcryptjs");
const db = require("../db");
const { registerValidate, loginValidate, editValidate, generateToken, verifyAdmin } = require("../public/javascripts/users");

router.get("/", async (req, res) => {
    try {
        let result;
        if (req.query.q) {
            result = await db.query("SELECT * FROM Users WHERE first_name LIKE $1 OR last_name LIKE $1 OR email LIKE $1 ORDER BY id", [`%${req.query.q}%`]);
        } else {
            result = await db.query("SELECT * FROM Users");
        }
        res.json(result.rows);
    } catch (err) {
        console.log(err);
        res.status(500).send("Internal Server Error");
    }
});

router.get("/register", verifyAdmin, (req, res) => {
    res.render("users/register", {
        getErrorMsg: path => null,
        formValues: {}
    });
});
router.post("/register", verifyAdmin, registerValidate, async (req, res) => {
    const { email, firstName, lastName, password, role } = req.body;
    try {
        const salt = bcrypt.genSaltSync(10);
        const hash = bcrypt.hashSync(password, salt);

        await db.query("INSERT INTO Users VALUES(DEFAULT, $1, $2, $3, $4, $5)", [firstName, lastName, email, hash, role]);
        res.redirect("/admin_panel?msg=rg");
    } catch (err) {
        console.log(err);
        res.status(500).send("Internal Server Error");
    }
});

router.get("/login", (req, res) => {
    res.render("users/login", {
        errors: [],
        getErrorMsg: path => null,
        formValues: {}
    });
});
router.post("/login", loginValidate, async (req, res) => {
    const { email, password } = req.body;
    try {
        const { rows } = await db.query("SELECT * FROM Users WHERE email=$1", [email]);

        if (rows[0] && bcrypt.compareSync(password, rows[0].password)) {
            const token = generateToken(rows[0]);
            res.cookie("accessToken", token).redirect("/");
        } else {
            const errors = [{
                path: "password",
                msg: "Incorrect password"
            }];
            res.render("users/login", {
                getErrorMsg: path => errors.find(e => e.path === path)?.msg,
                formValues: { email }
            });
        }
    } catch (err) {
        console.log(err);
        res.status(500).send("Internal Server Error");
    }
});

router.get("/logout", (req, res) => {
    res.clearCookie("accessToken").redirect("login");
});

router.get("/:id", verifyAdmin, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (id) {
            const { rows } = await db.query("SELECT * FROM Users WHERE id=$1", [id]);
            if (rows[0]) {
                res.render("users/edit", {
                    getErrorMsg: path => null,
                    formValues: {
                        firstName: rows[0].first_name,
                        lastName: rows[0].last_name,
                        ...rows[0]
                    }
                });
            } else {
                res.status(400).send("Invalid User Id Param");
            }
        } else {
            throw new Error("Invalid User Id Param");
        }
    } catch (err) {
        console.log(err);
        res.status(500).send("Internal Server Error");
    }
});
router.post("/:id", verifyAdmin, editValidate, async (req, res) => {
    const { email, firstName, lastName, password, role } = req.body;
    try {
        if (password) {
            const salt = bcrypt.genSaltSync(10);
            const hash = bcrypt.hashSync(password, salt);

            await db.query("UPDATE Users SET first_name=$1, last_name=$2, email=$3, password=$4, role=$5 WHERE id=$6", [firstName, lastName, email, hash, role, req.params.id]);
            res.redirect("/admin_panel?msg=ed");
        } else {
            await db.query("UPDATE Users SET first_name=$1, last_name=$2, email=$3, role=$4 WHERE id=$5", [firstName, lastName, email, role, req.params.id]);
            res.redirect("/admin_panel?msg=ed");
        }
    } catch (err) {
        console.log(err);
        res.status(500).send("Internal Server Error");
    }
});

router.delete("/delete/:id", verifyAdmin, async (req, res) => {
    try {
        const result = await db.query("DELETE FROM Users WHERE id=$1", [req.params.id]);
        res.json(result.rows[0]);
    } catch (err) {
        console.log(err);
        res.status(500).send("Internal Server Error");
    }
});

module.exports = router;
