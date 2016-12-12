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
var Multer  = require('multer')
var AdmZip = require('adm-zip');

const multer = Multer({dest:'uploads'
/*  storage: Multer.MemoryStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // no larger than 5mb
  }*/ 
});

var entitiesRe = /^\d{6}\.json$/;
var assetFilesRe = /^files\/assets\/\d{7}\/\d{1}\/.+$/;


function getModel () {
  return require('./model-' + config.get('DATA_BACKEND'));
}

var router = express.Router();

// Automatically parse request body as JSON
router.use(bodyParser.json());

function unzipEntries (req, res, next) {
  console.log("begin unzip");
  var zip = new AdmZip(req.file.path);
  var zipEntries = zip.getEntries();
  req.assetFiles = [];

  zipEntries.forEach(function(zipEntry) {
    //console.log(zipEntry.toString()); // outputs zip entries information 

    if (zipEntry.entryName == "config.json") {
      var dataString = zipEntry.getData().toString('utf8');
      var data = JSON.parse(dataString);
      req.assets = data.assets;
      console.log("found assets");
    } else if (entitiesRe.exec(zipEntry.entryName)) {
      var dataString = zipEntry.getData().toString('utf8');
      var data = JSON.parse(dataString);
      req.entities = data.entities;
      console.log("found entities");
    } else if (assetFilesRe.exec(zipEntry.entryName)) {
      var assetFile = {
        originalname: zipEntry.entryName,
//        mimetype: zipEntry.mimetype,
        data: zipEntry.getData() // ...or use getCompressedData to avoid decompression and to save space (but client needs to decompress)
      };
      req.assetFiles.push(assetFile);
      console.log("found asset file");
    }
  });
  console.log("finish unzip");
  next();
}

function sendUploadToGCS (req, res, next) {
  console.log("begin cloud upload");
  if (req.assetFiles.length == 0) {
    console.log("nothing to upload");
    return next();
  }

  req.assetFiles.forEach(function(assetFile) {
    const gcsname = Date.now() + assetFile.originalname;
    const file = bucket.file(gcsname);

    console.log("begin upload: " + gcsname);

    const stream = file.createWriteStream({
      metadata: {
  //      contentType: req.file.mimetype
      }
    });

    stream.on('error', (err) => {
      req.cloudStorageError = err;
      next(err);
    });

    stream.on('finish', () => {
      assetFile.cloudStorageObject = gcsname;
      assetFile.cloudStoragePublicUrl = getPublicUrl(gcsname);
      next();
    });

    stream.end(assetFile.data);

    console.log("finish upload");
  });
  console.log("finish cloud upload");
  next();
}

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
router.post('/', multer.single('zipFile'), unzipEntries, sendUploadToGCS, function (req, res, next) {
//  console.log(req.entities); 
//  console.log(req.assets); 
  console.log(req.assetFiles);
  if (!req.entities) {
    res.json({"message":"No entities found"});
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
    res.json({"message":"Found "  + Object.keys(req.entities).length + " entities, " + Object.keys(req.assets).length + " assets and " + req.assetFiles.length + " asset files"});
  }
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
