const express = require('express');
const router = express.Router();
const bcrypt = require("bcryptjs");
const db = require("../db");
const { createValidate } = require("../public/javascripts/projects");
const { verifyToken, verifyAdmin, verifyManager, verifyWorker } = require("../public/javascripts/users");

router.get("/", async (req, res) => {
    try {
        let result;
        if (req.query.q) {
            result = await db.query("SELECT * FROM Projects WHERE name LIKE $1 OR description LIKE $1 ORDER BY id", [`%${req.query.q}%`]);
        } else {
            result = await db.query("SELECT * FROM Users");
        }
        res.json(result.rows);
    } catch (err) {
        console.log(err);
        res.status(500).send("Internal Server Error");
    }
});

router.get("/create", verifyManager, (req, res) => {
    res.render("projects/create", {
        getErrorMsg: path => null,
        formValues: {}
    });
});
router.post("/create", verifyManager, createValidate, async (req, res) => {
    const { name, description, startDate, endDate } = req.body;
    try {
        const ownerId = verifyToken(req).id;

        const { rows } = await db.query("INSERT INTO Projects VALUES(DEFAULT, $1, $2, $3, $4, $5) RETURNING id", [name, description, startDate, endDate, ownerId]);
        res.redirect(`${rows[0].id}`);
    } catch (err) {
        console.log(err);
        res.status(500).send("Internal Server Error");
    }
});

router.get("/:id", verifyWorker, async (req, res) => {
    try {
        const project = await db.query("SELECT * FROM Projects WHERE id=$1", [req.params.id]);
        const owner = await db.query("SELECT * FROM Users WHERE id=$1", [project.rows[0].owner]);
        const workers = await db.query("SELECT * FROM user_projects up INNER JOIN users u ON up.user_id=u.id WHERE up.project_id=$1", [project.rows[0].id]);

        if (req.user.role === "worker") {
            
        }

        res.render("projects/read", {
            project: project.rows[0],
            owner: owner.rows[0],
            user: req.user,
            workers: workers.rows
        });
    } catch (err) {
        console.log(err);
        res.status(500).send("Internal Server Error");
    }
});

router.post("/:pId/new-task", verifyManager, async (req, res) => {
    console.log(req.user);
    // create task and add it to client

    res.json("najs");
});
router.post("/:pId/:uId", verifyManager, async (req, res) => {
    try {
        await db.query("INSERT INTO user_projects VALUES($1, $2)", [parseInt(req.params.uId), parseInt(req.params.pId)]);
        const worker = await db.query("SELECT * FROM user_projects up INNER JOIN users u ON up.user_id=u.id WHERE u.id=$1", [parseInt(req.params.uId)]);

        res.json(worker.rows[0]);
    } catch (err) {
        console.log(err);
        res.status(500).send("Internal Server Error");
    }
});

module.exports = router;
