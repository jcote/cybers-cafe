
'use strict';

var express = require('express');
var mysql = require('mysql');
var crypto = require('crypto');

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
  
  if (!obj.hasOwnProperty(id) || obj.id === undefined) {
  	return;
  }
  
  Object.keys(obj).forEach(function (k) {
  	if (k == "assetIds") {
  	  for (var i = 0; i < obj.assetIds.length; i++) {
        dependencyRecords.push({
      	  entityId: obj.id,
      	  assetId: obj.assetIds[i]
      	});

  	  }
  	  continue;
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
  var entity = {};

  Object.keys(entityRecord).forEach(function(k) {
    entity[k] = entityRecord[k];
  });

  if (Array.isArray(dependencyRecords)) {
  	for (int i = 0; i < dependencyRecords.length; i++) {
  		if (!('assetId' in dependencyRecords[k])) {
  			console.error('No assetId in dependencyRecord of entity ' + entityRecord.id);
  			continue;
  		}
      entity.assetIds.push(dependencyRecords[k].assetId);
    }
  }

  return entity;
}


function insertEntityRecord (entityRecord, callback) {
  var results = toSqlStore(entityRecord);
  var entityRecord = results.entityRecord;
  var dependencyRecords = results.dependencyRecords;

  connection.query('INSERT INTO `entities` SET ?', entityRecord, function (err) {
    if (err) {
      return callback(err);
    }
    connection.query('INSERT INTO `dependencies` SET ?', dependencyRecords, function (err) {
      if (err) {
        return callback(err);
      }
    console.log("Entity record stored in Sql: " + entityRecord.id);
    return callback();
  });
}










module.exports = {
  create: function (kind, data, cb) {
    update(kind, null, data, cb);
  },
  insertEntityRecord: insertEntityRecord,
};