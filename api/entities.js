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
var AdmZip = require('adm-zip');
const fs = require('fs');
const async = require('async');
const sqlRecord = require('./records-cloudsql');
const apiLib = require('./lib');
const phantomLib = require('./phantom');

const multer = Multer({//dest:'uploads'
  storage: Multer.MemoryStorage,
  limits: {
    fileSize: 10 * 1024 * 1024 // no larger than 10mb
  } 
});

var entitiesRe = /^\d+\.json$/;
var assetFilesRe = /^files\/assets\/\d+\/\d{1}\/.+$/;

var router = express.Router();

// Automatically parse request body as JSON
router.use(bodyParser.json());

function unzipEntries (req, res, next) {
  console.log("begin unzip");
  var zip = new AdmZip(req.file.buffer);
  var zipEntries = zip.getEntries();
  req.assetFiles = {};
  req.assets = {};
  req.entities = {};
  req.records = {};

  zipEntries.forEach(function(zipEntry) {
    //console.log(zipEntry.toString()); // outputs zip entries information 

    if (zipEntry.entryName == "config.json") {
      var dataString = zipEntry.getData().toString('utf8');
      var data = JSON.parse(dataString);
      req.assets = data.assets;
      Object.keys(req.assets).forEach(function(playcanvasId) {
        var asset = req.assets[playcanvasId];
        if (asset.file && asset.file.url) {
          asset.file.fullPath = asset.file.url;
        }
      });
      console.log("found " + Object.keys(req.assets).length + " assets");
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
        file: {
          buffer: zipEntry.getData()
        } // ...or use getCompressedData to avoid decompression and to save space (but client needs to decompress)
      };
      if ('file' in assetFile && 'buffer' in assetFile.file && assetFile.file.buffer.length) {
        req.assetFiles[zipEntry.entryName] = assetFile;
        console.log("found asset file: " + zipEntry.entryName);
      }
    }
  });
  console.log("finish unzip");
  next();
}

// same as in image.js but uses different sendRecordToSql
function sendRecordsToSql(req, res, next) {
  console.log("begin sql stores");
  async.each(req.entitiesDS, function(entity, callback) {
    if (!('components' in entity) || Object.keys(entity.components).length == 0) {
      return callback();
    }
    sendRecordToSql(req, entity, req.assets, callback);
  }, function(err, results) {
    // after all the callbacks
    if (err) {
      return next(err);
    }
    console.log("end sql stores");
    next();
  });
}


function sendRecordToSql (req, entity, assets, callback) {
  console.log("begin sql store");
  var entityRecord = {};
  entityRecord.objectId = entity.id; // latter should now exist after DS write
  
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

  var assetIds = req.dependentAssetIds[entity.resource_id];

  entityRecord.assetIds = assetIds;

  sqlRecord.insertEntityRecord(entityRecord, function (err, resultId) {
    if (err) {
      return callback(err);
    }
    console.log("entity '" + entity.name + "' stored in SQL: " + resultId);
    var record = {"objectId": entityRecord.objectId, "assetIds": entityRecord.assetIds};
    req.records[resultId] = record;
    callback();  
  });
}

function checkFormat (req, res, next) {
  if (req.file == undefined) {
    return res.json({"message":"No file given"});
  }
  if (req.file.mimetype != "application/x-zip-compressed") {
    // return res.json({"message":"Not zip format"});
  }
  next();
}

function phantomGetZip(req, res, next) {
  if (req.file.mimetype == "application/x-zip-compressed") {
    next();
  }

  fs.writeFile(req.file.originalname, req.file.buffer, function(err) {
    if(err) {
      return next(err);
    }

    // this will take a while..
    phantomLib.phantomConversion(req.file.originalname, function(filename, data) {
      if (data == null) {
        return res.json({"message":"Failed to convert model format"});
      }

      // converted zip file
      req.file.buffer = data;
      req.file.size = (new TextEncoder('utf-8').encode(data)).length;
      req.file.mimetype = "application/x-zip-compressed";
      req.file.originalname = filename;
      next();
    });
  }); 

}

// sets the parent of entities to SCENE unless the id is found in this upload
function setParentOnEntities(req, res, next) {
  async.each(req.entities, function(entity, callback) {
    var foundId = false;
    for (var entityPossibleParent in req.entities) {
      if (entityPossibleParent.resource_id == entity.resource_id) continue; // don't allow self-parenting
      if (entityPossibleParent.resource_id == entity.parent) {
        return callback(); // skip writing parent as SCENE, it is a child of another entity
      }
    }

    // write scene as parent (scene id stored in stock image json)
    fs.readFile("stock/entity/image.json", function(err, entityStockBuf) {
      if (err) {
        return next(err);
      }
      var entityStockJson = JSON.parse(entityStockBuf);

      entity.parent = entityStockJson.parent;
      callback();
    });
  }, function(err, results) {
    // after all the callbacks
    if (err) {
      return next(err);
    }
    console.log("end set parent");
    next();
  });
}

/**
 * POST /api/entities
 *
 */
router.post('/', multer.single('zipFile'), checkFormat, unzipEntries, apiLib.getReservedIds, apiLib.sendUploadToGCS, apiLib.rewriteAssetUrls, apiLib.extractAndRewriteDependentAssetIds, apiLib.sendAssetsToDatastore, setParentOnEntities, apiLib.sendEntitiesToDatastore, sendRecordsToSql, function (req, res, next) {
//  console.log(req.entities); 
//  console.log(req.assets); 
//  console.log(req.assetFiles);
  if (!req.entities) {
    return res.status(400).json({"message":"No entities found"});
  }
  if (!req.assets) {
    req.assets = {};
  }
  if (!req.assetFiles) {
    req.assetFiles = {};
  }
  if (req.cloudStorageError) {
    return res.status(500).json({"message":"Trouble uploading to cloud: " + req.cloudStorageError});
  } else {
    var entitiesByObjectId = {};
    Object.keys(req.entities).forEach(function (guid) {
      var objectId = req.entities[guid].id;
      if (objectId) {
        entitiesByObjectId[objectId] = req.entities[guid];
      }
    });
    console.log("completed storage");
    return res.status(200).json({
      "message":"Found "  + Object.keys(req.entitiesDS).length + " entities, " + Object.keys(req.assets).length + " assets and " + Object.keys(req.assetFiles).length + " asset files...",
      "records": req.records,
      "entities": req.entitiesDS,
      "assets": req.assets});
  }
});

/**
 * PUT /api/entities/:id
 *
 * Update a entity.
 */
router.put('/position/:entityId', multer.none(), function updatePosition (req, res, next) {
  if (!apiLib.isNumeric(req.params.entityId)) {
    return res.status(400).json({"message":"Must supply numeric entity id."});
  }
  if (!(apiLib.isNumeric(req.body.locX) && apiLib.isNumeric(req.body.locZ))) {
    return res.status(400).json({"message":"Must supply numeric location."});
  }
  if (!(apiLib.isNumeric(req.body.posX) && apiLib.isNumeric(req.body.posY) && apiLib.isNumeric(req.body.posZ))) {
    return res.status(400).json({"message":"Must supply numeric position."});
  }

  sqlRecord.updateEntityPosition(req.params.entityId, req.body.locX, req.body.locZ, req.body.posX, req.body.posY, req.body.posZ, function (err, result) {
    if (err) {
      return next(err);
    }
    if (result.affectedRows !== 1) {
      return res.status(404).json({"message":"Entity could not be updated (not found?)."});
    }
    console.log("Entity position updated for id: " + req.params.entityId);
    return res.status(200).json({"message":"Entity updated."});
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
