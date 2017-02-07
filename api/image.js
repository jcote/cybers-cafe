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
var Multer  = require('multer');
var fs = require('fs');
var md5 = require('md5');
const async = require('async');
const sqlRecord = require('./records-cloudsql');
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

function createImageAssetsAndEntity (req, res, next) {
  console.log("begin create image assets + entity");
  req.assets = {};
  req.assetFiles = {};
  req.entities = {};
  
  // Obtain new id's for assets
  // TODO: have the datastore model create 2 blank assets to reserve these ids
  getModel().getHighestId('Asset', function(err, highestId) {
    if (err) {
      return next(err);
    }
console.log(highestId);
    var assetFileId = highestId + 1;
    var assetMaterialId = assetFileId + 1;

    // Populate Asset Files and save to req
    var assetFullPath = "files/assets/" + assetFileId + "/1/" + req.file.originalname;
    req.assetFiles[assetFullPath] = req.file;

    fs.readFile("stock/asset/image.json", function(err, assetStockBuf) {
      if (err) {
        return next(err);
      }
      var assetStockJson = JSON.parse(assetStockBuf);

      // populate the stock File Asset
      var fileAsset = assetStockJson[6451433];
      fileAsset.id = assetFileId;
      fileAsset.name = req.file.originalname;
      fileAsset.file.filename = assetFullPath;
      fileAsset.file.size = req.file.size;
      fileAsset.file.url = assetFullPath;

      fs.readFile("uploads/" + req.file.filename, function(err, assetFileBuf) {
        if (err) {
          return next(err);
        }
        fileAsset.file.hash = md5(assetFileBuf);

        // Populate the stock Material Asset
        var materialAsset = assetStockJson[6451449];
        materialAsset.id = assetMaterialId;
        materialAsset.data.diffuseMap = assetFileId;
        materialAsset.data.emissiveMap = assetFileId;

        // save assets to req
        req.assets[assetFileId] = fileAsset;
        req.assets[assetMaterialId] = materialAsset;

        fs.readFile("stock/entity/image.json", function(err, entityStockBuf) {
          if (err) {
            return next(err);
          }
          var entityStockJson = JSON.parse(entityStockBuf);

          // Populate the stock Entity
          var entity = entityStockJson;
          entity.components.model.materialAsset = assetMaterialId;
          req.entities[entity.id] = entity;

          //console.log(req.assets);
          //console.log(req.assetFiles);
          //console.log(req.entities);
          console.log("finish create image assets + entity");
          next();
        });
      });
    });
  });
}

function sendUploadToGCS (req, res, next) {
  console.log("begin cloud uploads");
  if (Object.keys(req.assetFiles).length == 0) {
    console.log("nothing to upload");
    return next();
  }

  async.eachSeries(Object.keys(req.assetFiles), function(assetFullPath, callback) {
    var assetFile = req.assetFiles[assetFullPath];
//    var assetFilename =  Date.now() + "+" + assetFile.originalName;
//    const gcsname = assetFile.originalPath + assetFilename;
    const gcsname = Date.now() + "/" + assetFullPath;
    const file = bucket.file(gcsname);

    console.log("begin cloud upload: " + gcsname);

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
//      assetFile.filename = assetFilename;
      console.log("finish cloud upload: " + gcsname);
      callback();
    });

    // read from memory
    if ('data' in assetFile) {
      stream.end(assetFile.data);
    } else {
      // or disk
      fs.readFile(assetFile.path, function(err, assetFileBuf) {
        stream.end(assetFileBuf);
      });
    }
  }, function(err, results) {
    if (err) {
      return next(err);
    }
    console.log("finish cloud uploads");
    next();
  });
}

function sendRecordToSql (entity, assets, callback) {
  var entityRecord = {};
  entityRecord.id = entity.id; // should now exist after DS write
  entityRecord.posX = entity.position[0];
  entityRecord.posY = entity.position[1];
  entityRecord.posZ = entity.position[2];

  // extract entity's dependent asset ids
//  var assetIds = getDependentAssetIdsFromEntity(entity);

  // extract entity's assets' dependent asset ids
/*  for (var key in assets) {
    var asset = assets[key];
    if (assetIds.includes(parseInt(key))) {
      var depAssetsIds = getDependentAssetIdsFromAsset(asset);
      assetIds = arrayUnique(assetIds.concat(depAssetsIds));
    }
  }
*/
  entityRecord.assetIds = Object.keys(assets);

  sqlRecord.insertEntityRecord(entityRecord, callback);
}

function sendEntitiesToDatastore (req, res, next) {
  console.log("begin entity processing");
  if (Object.keys(req.entities).length == 0) {
    console.log("no entities");
    return next();
  }

  async.each(req.entities, function(entity, callback) {
    if (!('components' in entity) || Object.keys(entity.components).length == 0) {
      console.log("skipping entity with no components: " + entity.name);
      return callback();
    }
    // write to datastore
    getModel().create('Entity', entity, function (err, entity) {
      // on callback
      if (err) {
        return callback(err);
      }
      console.log("entity '" + entity.name + "' stored in DS: " + entity.id);
      sendRecordToSql(entity, req.assets, callback);
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

  // in parallel
  async.each(req.assets, function(asset, callback) {
    // write to datastore
    getModel().update('Asset', asset.id, asset, function (err, asset) {
      // on callback
      if (err) {
        return callback(err);
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
//      console.log("no file info in asset");
      continue;
    }
    
    if (! (asset.file.url in req.assetFiles)) {
      console.log("asset file not found: " + asset.file.url);
      continue;
    }

    var assetFile = req.assetFiles[asset.file.url];
    asset.file.url = assetFile.cloudStoragePublicUrl; // writing here writes req.assets[key]
    asset.file.filename = assetFile.filename;
    asset.name = assetFile.filename;
    console.log("asset url rewrite: " + asset.file.url);
  }

  console.log("finish asset url rewrite");
  next();
}

var imgMimeTypes = ["image/gif", "image/jpeg", "image/png", "image/svg+xml"];

function checkFormatImg (req, res, next) {
  if (req.file == undefined) {
    return res.json({"message":"No file given"});
  }
  if (!imgMimeTypes.includes(req.file.mimetype)) {
    return res.json({"message":"Not an image format (jpeg, gif, png, svg): " + req.file.mimetype});
  }
  next();
}

/**
 * POST /api/image
 *
 */
router.post('/', multer.single('imgFile'), checkFormatImg, createImageAssetsAndEntity, sendUploadToGCS, rewriteAssetUrls, sendAssetsToDatastore, sendEntitiesToDatastore, function (req, res, next) {
//  console.log(req.entities); 
//  console.log(req.assets); 
//  console.log(req.assetFiles);
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
