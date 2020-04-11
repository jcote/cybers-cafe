'use strict';

const fs = require('fs');
const async = require('async');
const config = require('../config');

const CLOUD_BUCKET = config.get('CLOUD_BUCKET');
const {Storage} = require('@google-cloud/storage');
const storage = new Storage({
  projectId: config.get('GCLOUD_PROJECT')
});
const bucket = storage.bucket(CLOUD_BUCKET);

function isNumeric(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

function getModel () {
  return require('./model-' + config.get('DATA_BACKEND'));
}

// Returns the public, anonymously accessable URL to a given Cloud Storage
// object.
// The object's ACL has to be set to public read.
function getPublicUrl (filename) {
  return `https://storage.googleapis.com/${CLOUD_BUCKET}/${filename}`;
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
      console.log("finish cloud upload: " + gcsname);
      callback();
    });

    if ('file' in assetFile && 'buffer' in assetFile.file) {
      stream.end(assetFile.file.buffer);      
    } else {
      return next({"message":"No file buffer to upload to GCS: " + assetFullPath});
    }
  }, function(err, results) {
    if (err) {
      return next(err);
    }
    console.log("finish cloud uploads");
    next();
  });
}

function sendEntitiesToDatastore (req, res, next) {
  console.log("begin entity processing");
  req.entitiesDS = {};
  if (Object.keys(req.entities).length == 0 && (!req.entitiesWithNoKey || req.entitiesWithNoKey.length == 0)) {
    console.log("no entities");
    return next();
  }

  var processEntityDS = function (entity, callback) {
    if (!('components' in entity) || Object.keys(entity.components).length == 0) {
      console.log("skipping entity with no components: " + entity.name);
      return callback();
    }
    if (req.body && req.body.title) {
      entity.name = req.body.title;
    }
    // write to datastore
    getModel().create('Entity', entity, function (err, entity) {
      // on callback
      if (err) {
        return callback(err);
      }
      req.entitiesDS[entity.id] = entity;
      console.log("entity '" + entity.name + "' stored in DS: " + entity.id);
      callback(null);
    });
  };

  async.each(req.entities, processEntityDS, function(err, results) {
    // after all the callbacks
    if (err) {
      return next(err);
    }
    async.each(req.entitiesWithNoKey, processEntityDS, function(err, results) {
      // after all the callbacks
      if (err) {
        return next(err);
      }
      next();
    });
  });
}

function getReservedIds(req, res, next) {
  req.assetIdMapOldToNew = {};
  var replacementAssets = {}; // contains the newly keyed req.assets that will be written at end of this function
  async.each(req.assets,function(asset, callback) {
    getModel().reserveIdCreate('Asset', function(err, reservedId) {
      if (err) {
        return callback(err);
      }
      // store mapping of old id to new one
      req.assetIdMapOldToNew[asset.id] = reservedId;
      // apply gotten id
      asset.id = reservedId;
      replacementAssets[reservedId] = asset;
      return callback();
    });
  }, function(err, results) {
  // after all the callbacks
    if (err) {
      return next(err);
    }
    req.assets = replacementAssets; // update the assets object to use the new keys
    console.log("end reserved ids");
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
      console.log("asset '" + asset.name + "' stored in DS: " + asset.id);
      callback(null);
    });
  }, function(err, results) {
    // after all the callbacks
    if (err) {
      console.log("end asset processing");
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
    if (!asset.file || !req.assetFiles[asset.file.fullPath]) { // no file property or no cloud url known
//      console.log("no file info in asset");
      continue;
    }

    var assetFullPath = decodeURIComponent(asset.file.fullPath);
    if (! (assetFullPath in req.assetFiles)) {
      console.log("asset file not found: " + assetFullPath);
      continue;
    }

    var assetFile = req.assetFiles[asset.file.fullPath];
    asset.file.url = assetFile.cloudStoragePublicUrl; // writing here writes req.assets[key]
    console.log("asset url rewrite: " + asset.file.url);
  }

  console.log("finish asset url rewrite");
  next();
}

function getDependentAssetIdsFromAsset(asset, assetIdMapOldToNew, assets, dependentAssetIds) {
  var assetIds = [];
  if (asset != undefined && 'data' in asset && asset.data != null) {
    if ('emissiveMap' in asset.data 
        && asset.data.emissiveMap > 0
        && assetIdMapOldToNew[asset.data.emissiveMap]) {
      var newId = assetIdMapOldToNew[asset.data.emissiveMap];
      asset.data.emissiveMap = newId;
      assetIds.push(newId);
      assetIds = assetIds.concat(getDependentAssetIdsFromAsset(assets[newId], assetIdMapOldToNew, assets, dependentAssetIds));
    }
    if ('diffuseMap' in asset.data
        && asset.data.diffuseMap > 0
        && assetIdMapOldToNew[asset.data.diffuseMap]){
      var newId = assetIdMapOldToNew[asset.data.diffuseMap];
      asset.data.diffuseMap = newId;
      assetIds.push(newId);
      assetIds = assetIds.concat(getDependentAssetIdsFromAsset(assets[newId], assetIdMapOldToNew, assets, dependentAssetIds));
    }
    //TODO: Other kinds of Maps    
    for (var key in asset.data) { 
      if (key.endsWith('Map')) {
        if (typeof asset.data[key] === 'number'
            && asset.data[key] > 0 
            && assetIdMapOldToNew[asset.data[key]]) {
          var newId = assetIdMapOldToNew[asset.data[key]];
          asset.data[key] = newId;
          assetIds.push(newId);
          assetIds = assetIds.concat(getDependentAssetIdsFromAsset(assets[newId], assetIdMapOldToNew, assets, dependentAssetIds));
        }
      }
    }
    if ('mapping' in asset.data && asset.data.mapping != null) {
      for (var i=0; i < asset.data.mapping.length; i++) {
        var entry = asset.data.mapping[i];
        if ('material' in entry
            && entry.material != null
            && assetIdMapOldToNew[entry.material]) {
          var newId = assetIdMapOldToNew[entry.material];
          entry.material = newId;
          assetIds.push(newId);
          assetIds = assetIds.concat(getDependentAssetIdsFromAsset(assets[newId], assetIdMapOldToNew, assets, dependentAssetIds));
        }
      }
    }
  }

  if (asset.id in dependentAssetIds)
    dependentAssetIds[asset.id] = arrayUnique(dependentAssetIds[asset.id].concat(assetIds));
  else
    dependentAssetIds[asset.id] = arrayUnique(assetIds);

  return assetIds;
}

function getDependentAssetIdsFromEntityAndRewriteIds(entity, assetIdMapOldToNew, assets, dependentAssetIds) {
    var assetIds = [];
    if ('components' in entity && entity.components != null) {
      if ('model' in entity.components && entity.components.model != null) {
        if ('asset' in entity.components.model) {
          if (typeof entity.components.model.asset === 'number'
              && entity.components.model.asset != null
              && assetIdMapOldToNew[entity.components.model.asset]) {
            var newId = assetIdMapOldToNew[entity.components.model.asset];
            entity.components.model.asset = newId;
            assetIds.push(newId);
            assetIds = assetIds.concat(dependentAssetIds[newId]);
          }
        }
        if ('materialAsset' in entity.components.model) {
          if (typeof entity.components.model.materialAsset === 'number'
            && entity.components.model.materialAsset != null
            && assetIdMapOldToNew[entity.components.model.materialAsset]) {
            var newId = assetIdMapOldToNew[entity.components.model.materialAsset];
            entity.components.model.materialAsset = newId;
            assetIds.push(newId);
            assetIds = assetIds.concat(dependentAssetIds[newId]);
          }
        }
      }
      if ('collision' in entity.components && entity.components.collision != null) {
        if ('asset' in entity.components.collision) {
          if (typeof entity.components.collision.asset === 'number'
              && entity.components.collision.asset != null
              && assetIdMapOldToNew[entity.components.collision.asset]) {
            var newId = assetIdMapOldToNew[entity.components.collision.asset];
            entity.components.collision.asset = newId;
            assetIds.push(newId);
            assetIds = assetIds.concat(dependentAssetIds[newId]);
          }
        }
      }
      if ('animation' in entity.components && entity.components.animation != null) {
        if ('assets' in entity.components.animation) {
          if (Array.isArray(entity.components.animation.assets)) {
            if (entity.components.animation.assets.length > 0) {
              if (typeof entity.components.animation.assets[0] === 'number'
                && entity.components.animation.assets[0] != null
                && assetIdMapOldToNew[entity.components.animation.assets[0]]) {
                // TODO: GET all animations, not just first one
                var newId = assetIdMapOldToNew[entity.components.animation.assets[0]];
                entity.components.animation.assets[0] = newId;
                assetIds.push(newId);
                assetIds = assetIds.concat(dependentAssetIds[newId]);
              }
            }
          }
        }
      }
      if ('script' in entity.components && entity.components.script != null) {
        if ('scripts' in entity.components.script && entity.components.script.scripts != null) {
          for (var scriptName in entity.components.script.scripts) {
            var script = entity.components.script.scripts[scriptName];
            if (script != null && 'attributes' in script && script.attributes != null) {
              for (var scriptCandidateAssetId in assets) {
                var scriptCandidateAsset = assets[scriptCandidateAssetId];
                if (scriptCandidateAsset.name == scriptName + ".js") {
                  assetIds.push(scriptCandidateAsset.id);
                }
              }
              if ('materials' in script.attributes && script.attributes.materials != null) {
                for (var i = 0; i < script.attributes.materials.length; i++) {
                  var material = script.attributes.materials[i];
                  if (typeof material === 'number'
                      && material != null
                      && assetIdMapOldToNew[material]) {
                    var newId = assetIdMapOldToNew[material];
                    script.attributes.materials[i] = newId;
                    assetIds.push(newId);
                    assetIds = assetIds.concat(dependentAssetIds[newId]);
                  }
                }
              }
              if ('video' in script.attributes && script.attributes.video != null) {
                if (typeof script.attributes.video === 'number'
                    && script.attributes.video != null
                    && assetIdMapOldToNew[script.attributes.video]) {
                  var newId = assetIdMapOldToNew[script.attributes.video];
                  script.attributes.video = newId;
                  assetIds.push(newId);
                  assetIds = assetIds.concat(dependentAssetIds[newId]);
                }
              }
            }
          }
        }
      }

    }
    return arrayUnique(assetIds);
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


function extractAndRewriteDependentAssetIds(req, res, next) {
  req.dependentAssetIds = {};

  Object.keys(req.assets).forEach(function(assetId) {
    var asset = req.assets[assetId];
    // extract assets's dependent asset ids
    var assetIds = getDependentAssetIdsFromAsset(asset, req.assetIdMapOldToNew, req.assets, req.dependentAssetIds);
    req.dependentAssetIds[assetId] = assetIds;
  });

  Object.keys(req.entities).forEach(function(entityGuid) {
    var entity = req.entities[entityGuid];
    // extract entity's dependent asset ids
    var assetIds = getDependentAssetIdsFromEntityAndRewriteIds(entity, req.assetIdMapOldToNew, req.assets, req.dependentAssetIds);
    req.dependentAssetIds[entity.resource_id] = assetIds;
  });

  console.log("end extract and rewrite asset ids");
  next();
}

module.exports = {
  isNumeric: isNumeric,
  getModel: getModel,
  sendUploadToGCS: sendUploadToGCS,
  sendEntitiesToDatastore: sendEntitiesToDatastore,
  sendAssetsToDatastore: sendAssetsToDatastore,
  rewriteAssetUrls: rewriteAssetUrls,
  getReservedIds: getReservedIds,
  getDependentAssetIdsFromAsset: getDependentAssetIdsFromAsset,
  getDependentAssetIdsFromEntityAndRewriteIds: getDependentAssetIdsFromEntityAndRewriteIds,
  arrayUnique: arrayUnique,
  extractAndRewriteDependentAssetIds: extractAndRewriteDependentAssetIds
};
