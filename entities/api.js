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
const Storage = require('@google-cloud/storage');
var config = require('../config');
var Multer  = require('multer')
var AdmZip = require('adm-zip');
const async = require('async');
const CLOUD_BUCKET = config.get('CLOUD_BUCKET');
const storage = Storage({
  projectId: config.get('GCLOUD_PROJECT')
});
const bucket = storage.bucket(CLOUD_BUCKET);

const multer = Multer({dest:'uploads'
/*  storage: Multer.MemoryStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // no larger than 5mb
  }*/ 
});

var entitiesRe = /^\d{6}\.json$/;
var assetFilesRe = /^files\/assets\/\d{7}\/\d{1}\/.+$/;

// Returns the public, anonymously accessable URL to a given Cloud Storage
// object.
// The object's ACL has to be set to public read.
function getPublicUrl (filename) {
  return `https://storage.googleapis.com/${CLOUD_BUCKET}/${filename}`;
}

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
  req.assetFiles = {};
  req.assets = {};
  req.entities = {};

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
      var entryPathLength = zipEntry.entryName.length - zipEntry.name.length;
      var assetFile = {
        originalName: zipEntry.name,
        originalPath: zipEntry.entryName.substring(0,entryPathLength),
//        mimetype: zipEntry.mimetype,
        data: zipEntry.getData() // ...or use getCompressedData to avoid decompression and to save space (but client needs to decompress)
      };
      req.assetFiles[zipEntry.entryName] = assetFile;
      console.log("found asset file: " + zipEntry.entryName);
    }
  });
  console.log("finish unzip");
  next();
}

function sendUploadToGCS (req, res, next) {
  console.log("begin cloud upload");
  if (Object.keys(req.assetFiles).length == 0) {
    console.log("nothing to upload");
    return next();
  }

  for (var assetFullPath in req.assetFiles) {
    var assetFile = req.assetFiles[assetFullPath];
    var assetFilename =  Date.now() + "+" + assetFile.originalName;
    const gcsname = assetFile.originalPath + assetFilename;
    const file = bucket.file(gcsname);

    console.log("begin upload: " + gcsname);

    const stream = file.createWriteStream({
      metadata: {
  //      contentType: req.file.mimetype
      }
    });

    stream.on('error', (err) => {
      req.cloudStorageError = err;
      console.log("error in cloud upload");
      next(err);
    });

    stream.on('finish', () => {
      assetFile.cloudStorageObject = gcsname;
      assetFile.cloudStoragePublicUrl = getPublicUrl(gcsname);
      assetFile.filename = assetFilename;
      console.log("finish cloud upload");
      next();
    });

    stream.end(assetFile.data);
  };
}


function sendEntitiesToDatastore (req, res, next) {
  console.log("begin entity processing");
  if (Object.keys(req.assets).length == 0) {
    console.log("no entities");
    return next();
  }

  async.each(req.entities, function(entity, callback) {
    // write to datastore
    getModel().create('Entity', entity, function (err, entity) {
      // on callback
      if (err) {
        callback(err);
      }
      console.log("entity stored: " + entity.name);
      callback(null);
    });
  }, function(err, results) {
    // after all the callbacks
    if (err) {
      return next(err);
    }
    next();
  });
}

function sendAssetsToDatastore (req, res, next) {
  console.log("begin asset processing");
  if (Object.keys(req.assets).length == 0) {
    console.log("no assets");
    return next();
  }

  // for each asset
  async.each(req.assets, function(asset, callback) {
    // write to datastore
    getModel().update('Asset', asset.id, asset, function (err, asset) {
      // on callback
      if (err) {
        callback(err);
      }
      console.log("asset stored: " + asset.name);
      callback(null);
    });
  }, function(err, results) {
    // after all the callbacks
    if (err) {
      return next(err);
    }
    next();
  });
}

function rewriteAssetUrls (req, res, next) {
  console.log("begin asset url rewrite");
  if (!Object.keys(req.assets).length) {
    console.log("no assets");
    return next();
  }

  for (var key in req.assets) {
    var asset = req.assets[key];
    if (!asset.file || !asset.file.filename || !asset.file.url) {
      console.log("no file info in asset");
      continue;
    }
    
    if (! (asset.file.url in req.assetFiles)) {
      console.log("asset file not found");
      continue;
    }

    var assetFile = req.assetFiles[asset.file.url];
    asset.file.url = assetFile.cloudStoragePublicUrl; // writing here writes req.assets[key]
    asset.file.filename = assetFile.filename;
    asset.name = assetFile.filename;
    console.log("asset url rewrite");
  }

  console.log("finish asset url rewrite");
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
router.post('/', multer.single('zipFile'), unzipEntries, sendUploadToGCS, rewriteAssetUrls, sendEntitiesToDatastore, sendAssetsToDatastore, function (req, res, next) {
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
    res.json({"message":"Found "  + Object.keys(req.entities).length + " entities, " + Object.keys(req.assets).length + " assets and " + Object.keys(req.assetFiles).length + " asset files"});
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
