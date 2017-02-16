'use strict';

const fs = require('fs');
const async = require('async');
const config = require('../config');

const CLOUD_BUCKET = config.get('CLOUD_BUCKET');
const Storage = require('@google-cloud/storage');
const storage = Storage({
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
      callback(null);
    });
  }, function(err, results) {
    // after all the callbacks
    if (err) {
      console.log("end entity processing");
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

module.exports = {
  isNumeric: isNumeric,
  getModel: getModel,
  sendUploadToGCS: sendUploadToGCS,
  sendEntitiesToDatastore: sendEntitiesToDatastore,
  sendAssetsToDatastore: sendAssetsToDatastore,
  rewriteAssetUrls: rewriteAssetUrls
};