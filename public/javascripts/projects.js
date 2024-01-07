const { check, validationResult } = require("express-validator");
const db = require("../../db");

const createValidate = [
    check("name").isLength({ min: 1 }).withMessage("Project name is required")
        .matches(/^[a-zA-Z\s]+$/).withMessage("Project name can only contain letters")
        .custom(async value => {
            const project = await db.query("SELECT * FROM Projects WHERE name=$1", [value]);
            if (project.rowCount) {
                throw new Error("Project name already in use");
            }
        }).trim().escape(),
    check('startDate').isLength({ min: 1 }).withMessage('Start date is required')
        .custom((value) => {
            // Check if the value is a valid date
            const date = new Date(value);
            return !isNaN(date.getTime());
        })
        .withMessage('Invalid start date'),
    check('endDate').isLength({ min: 1 }).withMessage('End date is required')
        .custom((value) => {
            // Check if the value is a valid date
            const date = new Date(value);
            return !isNaN(date.getTime());
        })
        .withMessage('Invalid end date'),
    check("description").isLength({ min: 1 }).withMessage("Description is required").trim().escape(),
    (req, res, next) => {
        const errors = validationResult(req);
        console.log(errors);
        if (!errors.isEmpty()) {
            res.render("projects/create", {
                getErrorMsg: path => errors.array().find(e => e.path === path)?.msg,
                formValues: req.body
            });
        } else {
            next();
        }
    },
];

module.exports = {
    createValidate
};