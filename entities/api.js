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
var config = require('../config');
var multer  = require('multer')
var AdmZip = require('adm-zip');

var upload = multer({ dest: 'uploads' });

function getModel () {
  return require('./model-' + config.get('DATA_BACKEND'));
}

var router = express.Router();

// Automatically parse request body as JSON
router.use(bodyParser.json());

/**
 * GET /api/entities
 *
 * Retrieve a page of entities (up to ten at a time).
 */
/*router.get('/', function list (req, res, next) {
  getModel().list(10, req.query.pageToken, function (err, entities, cursor) {
    if (err) {
      return next(err);
    }
    res.json({
      items: entities,
      nextPageToken: cursor
    });
  });
});
*/
/**
 * POST /api/entities
 *
 * Create a new entity.
 */
/*router.post('/', function insert (req, res, next) {
    console.log(req.files);
  getModel().create(req.body, function (err, entity) {
    if (err) {
      return next(err);
    }
    res.json(entity);
  });
});
*/
router.post('/', upload.single('zipFile'), function (req, res, next) {
  console.log(req.file); 
  console.log(req.body); 
  var zip = new AdmZip(req.file.path);
    var zipEntries = zip.getEntries(); // an array of ZipEntry records 
 
    zipEntries.forEach(function(zipEntry) {
        //console.log(zipEntry.toString()); // outputs zip entries information 
        if (zipEntry.entryName == "474142.json") {
          var data = zipEntry.getData().toString('utf8');
          console.log(JSON.parse(data)); 
        }
    });
});

/**
 * GET /api/entities/:id
 *
 * Retrieve a entity.
 */
router.get('/:entity', function get (req, res, next) {
  getModel().read(req.params.entity, function (err, entity) {
    if (err) {
      return next(err);
    }
    res.json(entity);
  });
});

/**
 * PUT /api/entities/:id
 *
 * Update a entity.
 */
router.put('/:entity', function update (req, res, next) {
  getModel().update(req.params.entity, req.body, function (err, entity) {
    if (err) {
      return next(err);
    }
    res.json(entity);
  });
});

/**
 * DELETE /api/entities/:id
 *
 * Delete a entity.
 */
router.delete('/:entity', function _delete (req, res, next) {
  getModel().delete(req.params.entity, function (err) {
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
