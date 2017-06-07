'use strict';

var spawn = require('child_process').spawn;
var http = require('http');

function phantomConversion(inputFilename, callback) {
    var env = Object.create( process.env );
    env.MOZ_HEADLESS = '1';
//    env.DISPLAY = '77';
//    env.SLIMERJS_EXECUTABLE='%APPDATA%\\npm\\slimerjs.cmd';
    const casper = spawn('node_modules\\casperjs\\bin\\casperjs', ['--engine=slimerjs', 'pccasper.js', inputFilename]);

    casper.on('error', (err) => {
      console.log('Child process failed to start: ', err);
    });

    casper.stdout.on('data', (data) => {
      console.log(`stdout: ${data}`);

      var downloadTag = data.indexOf('<download_url>');
      var downloadEnd = data.indexOf('</download_url>');
      if (downloadTag > -1 && downloadEnd > -1) {
        var downloadBegin = downloadTag + 14;
        var downloadUrl = data.slice(downloadBegin, downloadEnd);
        console.log(`downloading: ${downloadUrl}`);

        var zipData = '';
        var request = http.get(downloadUrl, function(response) {
            response.on('data', function(chunk) {
                zipData += chunk;
            });
            response.on('end', function() {
              var zipFilename = downloadUrl.substring(downloadUrl.lastIndexOf('/')+1);
              console.log(`download finished ${zipFilename}`);
              callback(zipFilename, zipData);
            });
        });
      }
    });

    casper.stderr.on('data', (data) => {
      console.log(`stderr: ${data}`);
    });

    casper.on('close', (code) => {
      console.log(`child process exited with code ${code}`);
      callback(null, null);
    });


}

module.exports = {
  phantomConversion: phantomConversion,
};

// phantomConversion();