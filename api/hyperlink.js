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
var fs = require('fs');
var md5 = require('md5');
const uuidv4 = require('uuid/v4');
const async = require('async');
const sqlRecord = require('./records-cloudsql');
const apiLib = require('./lib');
var Multer  = require('multer');

const multer = Multer({//dest:'uploads'
  storage: Multer.MemoryStorage,
  limits: {
    fileSize: 10 * 1024 * 1024 // no larger than 10mb
  } 
});

var router = express.Router();

// Automatically parse request body as JSON
router.use(bodyParser.json());


function createHyperlinkAssets(assets, assetFiles, callback) {
  // Obtain new id's for assets
  // TODO: have the datastore model create 2 blank assets to reserve these ids
  apiLib.getModel().reserveIdCreate('Asset', function(err, reservedId) {
    if (err) {
      return callback(err);
    }

    var assetFontFileId = reservedId;
    
    var assetFontFullPath = "stock/files/assets/29754627/1/Roboto-Medium.png";

  fs.readFile(assetFontFullPath, function(err, assetFontBuf) {
      if (err) {
        return callback(err);
      }

      var assetFile = {
        originalName: "Roboto-Medium.png",
        originalPath: "stock/files/assets/29754627/1/",
        data: assetFontBuf
      };

      assetFiles[assetFontFullPath] = assetFile;

      fs.readFile("stock/asset/hyperlink.json", function(err, assetStockBuf) {
        if (err) {
          return callback(err);
        }
        var assetStockJson = JSON.parse(assetStockBuf);

        // populate the stock File Asset
        var hyperlinkFontAsset = assetStockJson[29754627];
        hyperlinkFontAsset.id = assetFontFileId;
        hyperlinkFontAsset.file.fullPath = assetFontFullPath;

        // save assets to req
        assets[assetFontFileId] = hyperlinkFontAsset;

        return callback(null, hyperlinkFontAsset);
   		});
    });
  });
}

function createHyperlinkAssetsAndEntity (req, res, next) {
  console.log("begin create image assets + entity");
  req.assets = {};
  req.assetFiles = {};
  req.entities = {};
  req.entitiesWithNoKey = [];
  req.records = {};
console.log(req.body);
  if (!req.body.linkText || req.body.linkText.length == 0) {
  	return next("No link Text given!");
  }
  
  apiLib.getModel().readByName('Asset', "Roboto-Medium.ttf", function(err, hyperlinkFontAssetId) {
    
  	if (err) {
    	console.log("Hyperlink asset font not found, creating one")
    	createHyperlinkAssets(req.assets, req.assetFiles, function(err, hyperlinkFontAsset) {
    		createEntity(hyperlinkFontAsset.id, req.entitiesWithNoKey, req.body.linkText, next);
    	});
		} else {
			createEntity(hyperlinkFontAssetId, req.entitiesWithNoKey, req.body.linkText, next);
		}
  });

}

function createEntity(hyperlinkFontAssetId, entitiesWithNoKey, inputText, callback) {
  fs.readFile("stock/entity/hyperlink.json", function(err, entityStockBuf) {
    if (err) {
      return callback(err);
    }
    var entityStockJson = JSON.parse(entityStockBuf);

    // Populate the stock Entity
    var entity = entityStockJson;
    entity.components.fontAsset = hyperlinkFontAssetId;
    entity.resource_id = uuidv4();
    entity.components.element.text = inputText;
    entitiesWithNoKey.push(entity);

    //console.log(req.assets);
    //console.log(req.assetFiles);
    //console.log(req.entities);
    console.log("finish create image assets + entity");
    callback();
  });
}

// same as in entities.js but uses different sendRecordToSql
function sendRecordsToSql(req, res, next) {
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
    if (err) {
      return callback(err);
    }
    console.log("entity '" + entity.name + "' stored in SQL: " + resultId);
    req.records[resultId] = entityRecord;
    callback();    
  });
}

/**
 * POST /api/hyperlink
 *
 */
router.post('/', multer.fields([{name: 'linkText'}]), createHyperlinkAssetsAndEntity, apiLib.sendUploadToGCS, apiLib.rewriteAssetUrls, apiLib.sendAssetsToDatastore, apiLib.sendEntitiesToDatastore, sendRecordsToSql, function (req, res, next) {
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
      "entities": req.entitiesDS,
      "assets": req.assets});
  }
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
