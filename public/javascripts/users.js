const { check, validationResult } = require("express-validator");
const jwt = require("jsonwebtoken");
const db = require("../../db");

const JWT_SECRET = "hi"; // DEV ONLY!!!

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

function generateToken(user) {
    const payload = {
        id: user.id,
        email: user.email,
        role: user.role
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });
    return token;
};

function verifyToken(req, res, next) {
    const token = req.cookies.accessToken;
    
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).json({ message: "Invalid token" });
        }
        req.user = decoded;
        next();
    });
};

module.exports = {
    registerValidate,
    loginValidate,
    generateToken,
    verifyToken
};