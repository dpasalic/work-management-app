var express = require('express');
var router = express.Router();
const { verifyToken } = require("../public/javascripts/users");

/* GET home page. */
router.get('/', verifyToken, function(req, res, next) {
    console.log(req.user);
  res.render('index', { title: 'Express' });
});

module.exports = router;
