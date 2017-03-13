// Copyright 2015-2016, Google, Inc.
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

'use strict';

var express = require('express');
var Multer  = require('multer');
const apiLib = require('./lib');
const sqlRecord = require('./records-cloudsql');
const mathUtils = require('../scripts/mathutils');

const multer = Multer();
var router = express.Router();

/**
 * GET /location/address
 *
 */
router.get('/address/:address', function (req, res, next) {
  if (!req.params.address) {
    res.status(400).json({"message":"No address given"});
  }
  
  //var nAddress = stringToNaturalNumber(req.params.address); 
  //var locationPair = mathUtils.zReverseCantorPair(nAddress);

});

module.exports = router;
