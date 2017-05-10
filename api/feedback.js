
'use strict';

var express = require('express');
var Multer  = require('multer');
const apiLib = require('./lib');

const multer = Multer();
var router = express.Router();

/**
 * POST /feedback
 *
 */
router.post('/', multer.none(), function (req, res, next) {
  if (!req.body.message) {
    return res.status(400).json({"message":"No message given"});
  }
  var feedback = {
  	message: req.body.message,
  	email: req.body.email
  };
  apiLib.getModel().create("Feedback", feedback, function(err, entity) {
  	if (err) {
      return next(err);
  	}
    console.log("Feedback recorded");
    return res.status(200).json({"message":"Feedback recorded."});
  });
  
  //var nAddress = stringToNaturalNumber(req.params.address); 
  //var locationPair = mathUtils.zReverseCantorPair(nAddress);

});

module.exports = router;
