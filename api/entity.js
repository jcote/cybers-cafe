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
var bodyParser = require('body-parser');
var Multer  = require('multer');
const apiLib = require('./lib');
const sqlRecord = require('./records-cloudsql');
const multer = Multer();
var router = express.Router();

/**
 * POST /api/entities
 *
 */
router.post('/', function (req, res, next) {
//  console.log(req.entities); 
//  console.log(req.assets); 
  console.log(req.assetFiles);
  if (!req.entities) {
    res.status(400).json({"message":"No entities found"});
  }
  if (!req.assets) {
    req.assets = [];
  }
  if (!req.assetFiles) {
    req.assetFiles = [];
  }
  if (req.cloudStorageError) {
    res.json({"message":"Trouble uploading to cloud: " + req.cloudStorageError});
  } else {
    res.json({"message":"Found "  + Object.keys(req.entities).length + " entities, " + Object.keys(req.assets).length + " assets and " + Object.keys(req.assetFiles).length + " asset files"});
  }
});

/**
 * GET /api/entities/:id
 *
 * Retrieve a entity.
 */
router.get('/:entity', function get (req, res, next) {
  apiLib.getModel().read(req.params.entity, function (err, entity) {
    if (err) {
      return next(err);
    }
    res.json(entity);
  });
});

/**
 * PUT /api/entity/pos:id
 *
 * Update a entity's position from the req.params.entity pos to the req.body pos
 */
router.put('/pos/:entityId', multer.none(), function update (req, res, next) {
  console.log(req.body);
  if (!apiLib.isNumeric(req.params.entityId)) {
    return res.status(400).json({"message":"Must supply numeric entity id."});
  }
  if (apiLib.isNumeric(req.posX) && apiLib.isNumeric(req.posY) && apiLib.isNumeric(req.posZ)) {
    return res.status(400).json({"message":"Must supply numeric position."});
  }

  sqlRecord.updateEntityRecordPos(req.params.entityId, req.body.posX, req.body.posY, req.body.posZ, function (err, result) {
    if (err) {
      return next(err);
    }
    if (result.affectedRows !== 1) {
      return res.status(404).json({"message":"Entity not found."});
    }
    console.log("Entity position updated for id: " + req.params.entityId);
    return res.status(200).json({"message":"Entity position updated."});
  });
});

/**
 * DELETE /api/entities/:id
 *
 * Delete a entity.
 */
router.delete('/:id', function _delete (req, res, next) {
  apiLib.getModel().delete("Entity", req.params.id, function (err) {
    if (err) {
      return next(err);
    }
    res.status(200).send('OK');
  });
});

/**
 * Errors on "/api/entities/*" routes.
 */
router.use(function handleRpcError (err, req, res, next) {
  // Format error and forward to generic error handler for logging and
  // responding to the request
  err.response = {
    message: err.message,
    internalCode: err.code
  };
  next(err);
});

module.exports = router;
