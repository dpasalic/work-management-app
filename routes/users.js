const express = require('express');
const router = express.Router();
const bcrypt = require("bcryptjs");
const db = require("../db");
const { registerValidate, loginValidate, generateToken } = require("../public/javascripts/users");

router.get("/", async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM Users");
        res.json(result.rows);
    } catch (err) {
        console.log(err);
        res.status(500).send("Internal Server Error");
    }
});

router.get("/register", (req, res) => {
    res.render("users/register", {
        getErrorMsg: path => null,
        formValues: {}
    });
});
router.post("/register", registerValidate, async (req, res) => {
    const { email, firstName, lastName, password, role } = req.body;
    try {
        const salt = bcrypt.genSaltSync(10);
        const hash = bcrypt.hashSync(password, salt);

        await db.query("INSERT INTO Users VALUES(DEFAULT, $1, $2, $3, $4, $5)", [firstName, lastName, email, hash, role]);
        res.redirect("login?r=true");
    } catch (err) {
        console.log(err);
        res.status(500).send("Internal Server Error");
    }
});

router.get("/login", (req, res) => {
    res.render("users/login", {
        registered: req.query.r,
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
            // generateToken
            // res.redirect("/");
        } else {
            const errors = [{
                path: "password",
                msg: "Incorrect password"
            }];
            res.render("users/login", {
                registered: false,
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

module.exports = router;
