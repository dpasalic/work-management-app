const express = require('express');
const router = express.Router();
const bcrypt = require("bcryptjs");
const db = require("../db");
const { registerValidate, loginValidate, editValidate, generateToken, verifyAdmin } = require("../public/javascripts/users");

router.get("/", async (req, res) => {
    try {
        let result;
        if (req.query.w) {
            result = await db.query("SELECT u.* FROM Users as u LEFT JOIN user_projects as up ON u.id=up.user_id WHERE up.user_id IS NULL AND u.role=$1 AND (LOWER(u.first_name) LIKE $2 OR LOWER(u.last_name) LIKE $2) ORDER BY u.id", ["worker", `%${req.query.q}%`]);
        } else if (req.query.q) {
            result = await db.query("SELECT * FROM Users WHERE LOWER(first_name) LIKE $1 OR LOWER(last_name) LIKE $1 OR LOWER(email) LIKE $1 ORDER BY id", [`%${req.query.q}%`]);
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
        formValues: {},
        user: undefined
    });
});
router.post("/login", loginValidate, async (req, res) => {
    const { email, password } = req.body;
    try {
        const { rows } = await db.query("SELECT * FROM Users WHERE email=$1", [email]);

        if (rows[0] && bcrypt.compareSync(password, rows[0].password)) {
            const token = generateToken(rows[0]);
            res.cookie("accessToken", token).redirect("/projects");
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

router.get("/:id", async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM Users WHERE id=$1", [req.params.id]);
        res.json(result.rows[0]);
    } catch (err) {
        console.log(err);
        res.status(500).send("Internal Server Error");
    }
});
router.get("/:id/edit", verifyAdmin, async (req, res) => {
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
    // delete user from projects, delete workhours and tasks
    try {
        const result = await db.query("DELETE FROM Users WHERE id=$1", [req.params.id]);
        res.json(result.rows[0]);
    } catch (err) {
        console.log(err);
        res.status(500).send("Internal Server Error");
    }
});

module.exports = router;
