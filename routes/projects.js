const express = require('express');
const router = express.Router();
const bcrypt = require("bcryptjs");
const db = require("../db");
const { createValidate } = require("../public/javascripts/projects");
const { verifyToken, verifyAdmin, verifyManager, verifyWorker, verifyTaskOwner } = require("../public/javascripts/users");

router.get("/", verifyWorker, async (req, res) => {
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
        const tasks = await db.query("SELECT * FROM Users u INNER JOIN Tasks t ON u.id=t.user_id WHERE project_id=$1 ORDER BY t.created_at DESC", [req.params.id]);

        if (req.user.role === "worker") {

        }

        res.render("projects/read", {
            project: project.rows[0],
            owner: owner.rows[0],
            user: req.user,
            workers: workers.rows,
            tasks: tasks.rows,
            user: req.user
        });
    } catch (err) {
        console.log(err);
        res.status(500).send("Internal Server Error");
    }
});

router.post("/:pId/tasks/create", verifyManager, async (req, res) => {
    const { name, description, worker } = req.body;

    try {
        const task = await db.query("INSERT INTO Tasks VALUES(DEFAULT, $1, $2, $3, $4, DEFAULT) RETURNING *", [name, description, req.params.pId, worker]);
        const user = await db.query("SELECT first_name, last_name FROM Users WHERE id=$1", [worker]);

        await db.query("INSERT INTO Workhours VALUES(DEFAULT, $1, $2, $3, CURRENT_DATE, 0)", [worker, req.params.pId, task.rows[0].id]);

        res.json({
            ...task.rows[0],
            ...user.rows[0],
            project_id: req.params.pId
        });
    } catch (err) {
        console.log(err);
        res.status(500).json("Internal Server Error");
    }
});

router.patch("/tasks/:tId", verifyWorker, async (req, res) => {
    try {
        const result = await db.query("UPDATE Workhours SET hours=hours+$1 WHERE user_id=$2 AND task_id=$3 RETURNING *", [req.body.hours, req.user.id, req.params.tId]);
        if (result.rows.length !== 0) {
            res.json("Added successfully");
        } else {
            res.json("Adding failed");
        }
    } catch (err) {
        console.log(err);
        res.status(500).send("Internal Server Error");
    }
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

router.get("/:pId/tasks/:tId", verifyTaskOwner, async (req, res) => {
    res.render("projects/task-read", { task: req.task, owner: req.owner });
});
router.patch("/:pId/tasks/:tId", async (req, res) => {
    try {
        await db.query("UPDATE Tasks SET progress=$1 WHERE id=$2", [req.body.progress, req.params.tId]);
        if (req.body.hours) {
            await db.query("UPDATE Workhours SET hours=hours+$1 WHERE task_id=$2", [req.body.hours, req.params.tId]);
        }
        res.json("");
    } catch (err) {
        console.log(err);
        res.status(500).json("Internal Server Error");
    }
});

module.exports = router;
