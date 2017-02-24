
'use strict';

var express = require('express');
var mysql = require('mysql');
var crypto = require('crypto');
const async = require('async');

var connection;

function handleDisconnect() {
  connection = mysql.createConnection({
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    socketPath: process.env.MYSQL_SOCKET_PATH,
    database: process.env.MYSQL_DATABASE
  });                                             // Recreate the connection, since
                                                  // the old one cannot be reused.

  connection.connect(function(err) {              // The server is either down
    if(err) {                                     // or restarting (takes a while sometimes).
      console.log('error when connecting to db:', err);
      setTimeout(handleDisconnect, 2000); // We introduce a delay before attempting to reconnect,
    }                                     // to avoid a hot loop, and to allow our node script to
  });                                     // process asynchronous requests in the meantime.
                                          // If you're also serving http, display a 503 error.
  connection.on('error', function(err) {
    console.log('db error', err);
    if(err.code === 'PROTOCOL_CONNECTION_LOST') { // Connection to the MySQL server is usually
      handleDisconnect();                         // lost due to either server restart, or a
    } else {                                      // connnection idle timeout (the wait_timeout
      throw err;                                  // server variable configures this)
    }
  });
}

handleDisconnect();

function toSqlStore (obj) {
  var entityRecord = {};
  var dependencyRecords = [];
  var results = {};
  
  if (!obj.hasOwnProperty('objectId') || obj.objectId === undefined) {
  	console.error('Attempted to write to Sql record without objectId');
  	return null;
  }
  
  Object.keys(obj).forEach(function (k) {
  	if (k == "assetIds") {
  	  for (var i = 0; i < obj.assetIds.length; i++) {
        dependencyRecords.push({
      	  objectId: obj.objectId,
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

// transform from [{k1:v1, k2,v2},..] to [[[v1, v2],..]]
function reformDependencyRecords (dependencyRecords) {
  var out = [];
  for (var i = 0; i < dependencyRecords.length; i++) {
    out.push([
      dependencyRecords[i].assetId, 
      dependencyRecords[i].objectId
      ]);
  }
  return [out];
}

function insertEntityRecord (entityRecord, callback) {
  var results = toSqlStore(entityRecord);
  if (!results) {
    return callback("Malformed entity for SQL storage: " + entityRecord);
  };
  var entityRecord = results.entityRecord;
  var dependencyRecords = results.dependencyRecords;

  connection.query('INSERT INTO entities SET ?', entityRecord, function (err, result) {
    if (err) {
      return callback(err);
    }
    if (dependencyRecords.length > 0) {
	    connection.query('INSERT INTO dependencies (assetId, objectId) VALUES ?', reformDependencyRecords(dependencyRecords), function (dErr, dResult) {
        if (dErr) {
	        return callback(dErr);
	      }
        if (dependencyRecords.length > dResult.affectedRows) {
          console.error("inserting dependencies for " + result.insertId + " has failed");
          console.error(dependencyRecords);
          return callback({message: "only " + dResult.affectedRows + "/" + dependencyRecords.length + "dependency records were updated for entity id " + entityRecord.id});
        }
	      console.log("Entity and " + dependencyRecords.length + " dependency records stored in SQL for id: " + result.insertId);
	      return callback(null, result.insertId);
	    });
    } else {
      console.log("Entity record stored in SQL for id: " + result.insertId);
	    return callback(null, result.insertId);
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
        connection.query('SELECT * FROM dependencies WHERE objectId = ?', entityRecord.objectId, function (err, results) {
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

function updateEntityRecord(id, posX, posY, posZ, rotX, rotY, rotZ, sclX, sclY, sclZ, callback) {
  var set = {posX: posX, posY: posY, posZ: posZ, rotX: rotX, rotY: rotY, rotZ: rotZ, sclX: sclX, sclY: sclY, sclZ: sclZ};
  connection.query('UPDATE entities SET ? WHERE id = ?', [set, id], function (err, res) {
    if (err) {
      return callback(err);
    }
    console.log("Entity record updated in SQL for id: " + id);
    return callback(null, res);
  });
}


module.exports = {
  insertEntityRecord: insertEntityRecord,
  listEntityRecords: listEntityRecords,
  updateEntityRecord: updateEntityRecord
};