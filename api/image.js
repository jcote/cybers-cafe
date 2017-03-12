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
var fs = require('fs');
var md5 = require('md5');
const async = require('async');
const sqlRecord = require('./records-cloudsql');
const apiLib = require('./lib');

const multer = Multer({dest:'uploads'
/*  storage: Multer.MemoryStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // no larger than 5mb
  }*/ 
});

var router = express.Router();

// Automatically parse request body as JSON
router.use(bodyParser.json());

function createImageAssetsAndEntity (req, res, next) {
  console.log("begin create image assets + entity");
  req.assets = {};
  req.assetFiles = {};
  req.entities = {};
  req.entitiesWithNoKey = [];
  req.records = {};
  
  // Obtain new id's for assets
  // TODO: have the datastore model create 2 blank assets to reserve these ids
  apiLib.getModel().reserveIdCreate('Asset', function(err, reservedId1) {
    if (err) {
      return next(err);
    }
      apiLib.getModel().reserveIdCreate('Asset', function(err, reservedId2) {
      if (err) {
        return next(err);
      }

      var assetFileId = reservedId1;
      var assetMaterialId = reservedId2;

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
            req.entitiesWithNoKey.push(entity);

            //console.log(req.assets);
            //console.log(req.assetFiles);
            //console.log(req.entities);
            console.log("finish create image assets + entity");
            next();
          });
        });
      });
    });
  });
}

function sendRecordsToSql(req, res, next) {
  async.each(req.entities, function(entity, callback) {
    if (!('components' in entity) || Object.keys(entity.components).length == 0) {
      return callback();
    }
    sendRecordToSql(req, entity, req.assets, callback);
  }, function(err, results) {
    // after all the callbacks
    if (err) {
      return next(err);
    }
    next();
  });
}

function sendRecordToSql (req, entity, assets, callback) {
  var entityRecord = {};
  entityRecord.objectId = entity.id; // should now exist after DS write

  entityRecord.locX = null; // will write after user places entity
  entityRecord.locZ = null;

  entityRecord.posX = null;
  entityRecord.posY = null;
  entityRecord.posZ = null;
  
  entityRecord.rotX = entity.rotation[0];
  entityRecord.rotY = entity.rotation[1];
  entityRecord.rotZ = entity.rotation[2];
  
  entityRecord.sclX = entity.scale[0];
  entityRecord.sclY = entity.scale[1];
  entityRecord.sclZ = entity.scale[2];

  entityRecord.assetIds = Object.keys(assets);

  sqlRecord.insertEntityRecord(entityRecord, function (err, resultId) {
    console.log("entity '" + entity.name + "' stored in SQL: " + resultId);
    req.records[resultId] = entityRecord;
    callback();    
  });
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
router.post('/', multer.single('imgFile'), checkFormatImg, createImageAssetsAndEntity, apiLib.sendUploadToGCS, apiLib.rewriteAssetUrls, apiLib.sendAssetsToDatastore, apiLib.sendEntitiesToDatastore, sendRecordsToSql, function (req, res, next) {
//  console.log(req.entities); 
//  console.log(req.assets); 
//  console.log(req.assetFiles);
  if (!req.entities) {
    return res.status(400).json({"message":"No entities found"});
  }
  if (!req.assets) {
    req.assets = [];
  }
  if (!req.assetFiles) {
    req.assetFiles = [];
  }
  if (req.cloudStorageError) {
    return res.status(500).json({"message":"Trouble uploading to cloud: " + req.cloudStorageError});
  } else {
    console.log("completed storage");
    return res.status(200).json({
      "message":"Created "  + Object.keys(req.entities).length + " entities, " + Object.keys(req.assets).length + " assets and " + Object.keys(req.assetFiles).length + " asset files...",
      "records": req.records,
      "entities": req.entities,
      "assets": req.assets});
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
 * PUT /api/entities/:id
 *
 * Update a entity.
 */
router.put('/:entity', function update (req, res, next) {
  apiLib.getModel().update(req.params.entity, req.body, function (err, entity) {
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
  apiLib.getModel().delete(req.params.entity, function (err) {
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
