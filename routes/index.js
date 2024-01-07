var express = require('express');
var router = express.Router();
const db = require("../db");
const { verifyAdmin } = require("../public/javascripts/users");

/* GET home page. */
router.get('/', (req, res, next) => {
    res.render('index', { title: 'Express' });
});

router.get("/admin_panel", verifyAdmin, async (req, res, next) => {
    try {
        const users = await db.query("SELECT * FROM Users ORDER BY id");
        const projects = await db.query("SELECT * FROM Projects ORDER BY id");

        const msg = req.query.msg === "rg" ?
            "Registered a user successfully" :
            req.query.msg === "ed" ?
                "Edited a user successfully" : "";
        res.render("admin-panel", {
            users: users.rows,
            projects: projects.rows,
            msg: msg
        });
    } catch (err) {
        console.log(err);
        res.status(500).send("Internal Server Error");
    }
});

module.exports = router;
