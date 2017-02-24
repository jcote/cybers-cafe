// Copyright 2015-2016, Google, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// [START createTables]
'use strict';

// [START setup]
var mysql = require('mysql');
var prompt = require('prompt');
const async = require('async');
// [END setup]

// [START createTable]
var SQL_STRING_ENTITY = 'CREATE TABLE entities (\n' +
  '  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,\n' +
  '  objectId BIGINT UNSIGNED NOT NULL,\n' +
  '  timestamp DATETIME NULL,\n' +
  '  posX FLOAT NULL,\n' +
  '  posY FLOAT NULL,\n' +
  '  posZ FLOAT NULL,\n' +
  '  rotX FLOAT NULL,\n' +
  '  rotY FLOAT NULL,\n' +
  '  rotZ FLOAT NULL,\n' +
  '  sclX FLOAT NULL,\n' +
  '  sclY FLOAT NULL,\n' +
  '  sclZ FLOAT NULL,\n' +
  '  PRIMARY KEY (id)\n' +
  ');';

var SQL_STRING_DEPENDENCY = 'CREATE TABLE dependencies (\n' +
'    assetId BIGINT UNSIGNED NOT NULL,\n' +
'    objectId BIGINT UNSIGNED NOT NULL,\n' +
'    INDEX (objectId),\n' +
'    UNIQUE (assetId, objectId)\n' +
');';

function createEntitiesTable (connection, callback) {
  connection.query(SQL_STRING_ENTITY, callback);
}

function createDependenciesTable (connection, callback) {
  connection.query(SQL_STRING_DEPENDENCY, callback);
}

function processResult (result, result2, callback) {
  console.log(result, result2);
  callback(null);
}

var connection = mysql.createConnection({
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  socketPath: process.env.MYSQL_SOCKET_PATH,
  database: process.env.MYSQL_DATABASE
});

// [START main]
async.waterfall([
  createEntitiesTable.bind(null, connection),
  processResult,
  createDependenciesTable.bind(null, connection),
  processResult
  ], function (err, result) {
    if (err) {
      return console.error(err);
    }
    connection.end();
});
// [END main]
// [END createTables]
