
'use strict';

var express = require('express');
var mysql = require('mysql');
var crypto = require('crypto');
const async = require('async');

var connection = mysql.createConnection({
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  socketPath: process.env.MYSQL_SOCKET_PATH,
  database: process.env.MYSQL_DATABASE
});

function toSqlStore (obj) {
  var entityRecord = {};
  var dependencyRecords = [];
  var results = {};
  
  if (!obj.hasOwnProperty('id') || obj.id === undefined) {
  	console.error('Attempted to write to Sql record without id');
  	return null;
  }
  
  Object.keys(obj).forEach(function (k) {
  	if (k == "assetIds") {
  	  for (var i = 0; i < obj.assetIds.length; i++) {
        dependencyRecords.push({
      	  entityId: obj.id,
      	  assetId: obj.assetIds[i]
      	});

  	  }
  	  return; // "continue"
  	}

    if (obj[k] === undefined) {
      return;
    }
    entityRecord[k] = obj[k];
  });

  results.entityRecord = entityRecord;
  results.dependencyRecords = dependencyRecords;
  return results;
}

function fromSqlStore (entityRecord, dependencyRecords) {
  var entity = {assetIds:[]};

  Object.keys(entityRecord).forEach(function(k) {
    entity[k] = entityRecord[k];
  });

  if (Array.isArray(dependencyRecords)) {
  	for (var i = 0; i < dependencyRecords.length; i++) {
  		if (!('assetId' in dependencyRecords[i])) {
  			console.error('No assetId in dependencyRecord of entity ' + entityRecord.id);
  			continue;
  		}
      entity.assetIds.push(dependencyRecords[i].assetId);
    }
  }

  return entity;
}


function insertEntityRecord (entityRecord, callback) {
  var results = toSqlStore(entityRecord);
  if (!results) {
    return callback("Malformed entity for SQL storage: " + entityRecord);
  };
  var entityRecord = results.entityRecord;
  var dependencyRecords = results.dependencyRecords;

  connection.query('INSERT INTO `entities` SET ?', entityRecord, function (err) {
    if (err) {
      return callback(err);
    }
    if (dependencyRecords.length > 0) {
	    connection.query('INSERT INTO `dependencies` SET ?', dependencyRecords, function (err) {
	      if (err) {
	        return callback(err);
	      }
	      console.log("Entity and " + dependencyRecords.length + " dependency records stored in SQL for id: " + entityRecord.id);
	      return callback();
	    });
    } else {
        console.log("Entity record stored in SQL for id: " + entityRecord.id);
	    return callback();
    }
  });
}


function listEntityRecords (point, range, limit, token, callback) {
  var x = point[0];
  var y = point[1];
  var z = point[2];
  token = token ? parseInt(token, 10) : 0;
  
  var entityRecords = [];

  // obtain all entities within bounding box from point position
  connection.query('SELECT * FROM entities ' +
  	'WHERE posX < ? ' +
  	'AND posX > ? ' +
  	'AND posY < ? ' +
  	'AND posY > ? ' +
  	'AND posZ < ? ' +
  	'AND posZ > ? ' +
  	'LIMIT ? ' +
  	'OFFSET ?',
  	[x + range, x - range, y + range, y - range, z + range, z - range, limit, token ], 
  	function (err, results) {
      if (err) {
        return callback(err);
      }
      var hasMore = results.length === limit ? token + results.length : false;
      async.concat(results, function (entityRecord, cb) {
      	// obtain all dependent asset ids for entity
      	connection.query('SELECT * FROM dependencies WHERE entityId = ?', entityRecord.id, function (err, results) {
          if (err) {
            return cb(err);
	      }
	      // process the entityRecord and its dependent assetIds together for single object format
	      cb(null, fromSqlStore(entityRecord, results));
        });
      }, function (err, results) {
      	// after all dependencies have been queried and processed
      	if (err) {
      	  return callback(err);
      	}
      	var res = {};
      	for (var i = 0; i < results.length; i++) {
          var entityRecord = results[i];
          res[entityRecord.id] = entityRecord;
      	}
        callback(null, res, hasMore);
      });
    });
}


module.exports = {
  insertEntityRecord: insertEntityRecord,
  listEntityRecords: listEntityRecords
};