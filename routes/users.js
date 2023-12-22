const express = require('express');
const router = express.Router();
const { check, validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const db = require("../db");

const registerValidate = [
    check("email").isEmail().withMessage("Invalid email")
        .custom(async value => {
            const user = await db.query("SELECT * FROM Users WHERE email=$1", [value]);
            if (user.rowCount) {
                throw new Error("Email already in use");
            }
        }).trim().escape(),
    check("firstName").isLength({ min: 1 }).withMessage("You have a name, right?")
        .matches(/^[a-zA-Z]+$/).withMessage("First name can only contain letters").trim().escape(),
    check('password').isLength({ min: 7 }).withMessage('Password must be at least 7 characters')
        .matches(/[0-9]/).withMessage('Password must contain a number')
        .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter'),
    check('passwordRepeat').custom((value, { req }) => {
        if (value !== req.body.password) {
            throw new Error('Passwords do not match');
        }
        return true;
    }),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.render("users/register", {
                getErrorMsg: path => errors.array().find(e => e.path === path)?.msg,
                formValues: req.body
            });
        } else {
            next();
        }
    },
];

const loginValidate = [
    check("email").isEmail().withMessage("Invalid email")
        .custom(async value => {
            const user = await db.query("SELECT * FROM Users WHERE email=$1", [value]);
            if (!user.rowCount) {
                throw new Error("This email has not been registered");
            }
        }).trim().escape(),
    check('password').isLength({ min: 7 }).withMessage('Password must be at least 7 characters')
        .matches(/[0-9]/).withMessage('Password must contain a number')
        .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.render("users/login", {
                registered: false,
                errors: errors.array(),
                getErrorMsg: path => errors.array().find(e => e.path === path)?.msg,
                formValues: req.body
            });
        } else {
            next();
        }
    },
];

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
            res.redirect("/");
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

module.exports = router;
