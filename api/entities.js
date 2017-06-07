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

var entitiesRe = /^\d{6}\.json$/;
var assetFilesRe = /^files\/assets\/\d{7}\/\d{1}\/.+$/;

function getDependentAssetIdsFromAsset(asset) {
  var assetIds = [];
  if ('data' in asset && asset.data != null) {
    for (var key in asset.data) {
      if (key.endsWith('Map')) {
        if (typeof asset.data[key] === 'number' && asset.data[key] > 0 && !assetIds.includes(asset.data[key])) {
          assetIds.push(asset.data[key]);
        }
      }
    }
    if ('mapping' in asset.data && asset.data.mapping != null) {
      for (var i=0; i < asset.data.mapping.length; i++) {
        var entry = asset.data.mapping[i];
        if ('material' in entry && entry.material != null) {
          var assetId = parseInt(entry.material);
          if (!isNaN(assetId)) {
            assetIds.push(assetId);
          }
        }
      }
    }
  }
  return assetIds;
}

function getDependentAssetIdsFromEntity(entity) {
    var assetIds = [];
    if ('components' in entity && entity.components != null) {
      if ('model' in entity.components && entity.components.model != null) {
        if ('asset' in entity.components.model) {
          if (typeof entity.components.model.asset === 'number') {
            assetIds.push(entity.components.model.asset);
          }
        }
        if ('materialAsset' in entity.components.model) {
          if (typeof entity.components.model.materialAsset === 'number') {
            assetIds.push(entity.components.model.materialAsset);
          }
        }
      }
      if ('collision' in entity.components && entity.components.collision != null) {
        if ('asset' in entity.components.collision) {
          if (typeof entity.components.collision.asset === 'number') {
            assetIds.push(entity.components.collision.asset);
          }
        }
      }
      if ('animation' in entity.components && entity.components.animation != null) {
        if ('assets' in entity.components.animation) {
          if (Array.isArray(entity.components.animation.assets)) {
            if (entity.components.animation.assets.length > 0) {
              if (typeof entity.components.animation.assets[0] === 'number') {
                assetIds = assetIds.concat(entity.components.animation.assets);
              }
            }
          }
        }
      }
    }
    return assetIds;
}

function arrayUnique(array) {
    var a = array.concat();
    for(var i=0; i<a.length; ++i) {
        for(var j=i+1; j<a.length; ++j) {
            if(a[i] === a[j])
                a.splice(j--, 1);
        }
    }

    return a;
}

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
      if (assetFile.data.length) {
        req.assetFiles[zipEntry.entryName] = assetFile;
        console.log("found asset file: " + zipEntry.entryName);
      }
    }
  });
  console.log("finish unzip");
  next();
}

function sendRecordsToSql(req, res, next) {
  console.log("begin sql stores");
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

  // extract entity's dependent asset ids
  var assetIds = getDependentAssetIdsFromEntity(entity);

  // extract entity's assets' dependent asset ids
  for (var key in assets) {
    var asset = assets[key];
    if (assetIds.includes(parseInt(key))) {
      var depAssetsIds = getDependentAssetIdsFromAsset(asset);
      assetIds = arrayUnique(assetIds.concat(depAssetsIds));
    }
  }

  entityRecord.assetIds = assetIds;

  sqlRecord.insertEntityRecord(entityRecord, function (err, resultId) {
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

/**
 * POST /api/entities
 *
 */
router.post('/', multer.single('zipFile'), checkFormat, phantomGetZip, unzipEntries, apiLib.sendUploadToGCS, apiLib.rewriteAssetUrls, apiLib.sendAssetsToDatastore, apiLib.sendEntitiesToDatastore, sendRecordsToSql, function (req, res, next) {
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
      "message":"Found "  + Object.keys(req.entities).length + " entities, " + Object.keys(req.assets).length + " assets and " + Object.keys(req.assetFiles).length + " asset files...",
      "records": req.records,
      "entities": entitiesByObjectId,
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
