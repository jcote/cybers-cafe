var fs = require('fs');
var utils = require('utils');
var clientutils = require('clientutils');
var casper = require('casper').create({
	waitTimeout: 60000, 
	viewportSize: {width: 1024, height: 768},
	clientScripts: ["scripts\\jquery-3.1.1.min.js"],
  pageSettings: {
    webSecurityEnabled: false
  }
});
var username;

function reportErrors(f) {
  var ret = null;
  try {
    ret = f();
  } catch (e) {
    casper.echo("ERROR: " + e);
    casper.exit();
  }
  return ret;
}


casper.userAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_7_5) AppleWebKit/537.4 (KHTML, like Gecko) Chrome/22.0.1229.94 Safari/537.4');

casper.start('https://login.playcanvas.com/', function() {
   this.waitForSelector('form[action="/login_password"]');
});

casper.then(function() {
   this.fill('form[action="/login_password"]', { username_or_email: 'anon@cybers.cafe', password: 'brilliantsun' }, true);
});

casper.then(function() {
	this.waitForSelector('.profile-details .profile-username');
});

casper.then(function() {
    username = this.evaluate(function() {
    	return $(".profile-details .profile-username")[0].innerHTML;
    });
    this.echo(username);
});

casper.then(function() {
	this.mouse.click('.tab-bar > ul:nth-child(1) > li:nth-child(2) > a:nth-child(1)');
});

casper.then(function() {
	this.waitForSelector('#new-project');
});
casper.then(function() {
	this.wait(2000);
});
casper.then(function() {
    this.echo("new project");
});

casper.then(function() {
	var self = this;
	reportErrors(function() {
	self.mouse.click('#new-project');
  });
});
casper.then(function() {
    this.capture('screenshot.png', {
        top: 0,
        left: 0,
        width: 1024,
        height: 768
    });
});
casper.then(function() {
	this.waitForSelector('.pc-modal-dialog form input[name="name"]');
});

casper.then(function() {
    this.echo("project form");
});
casper.then(function() {
    this.capture('screenshot.png', {
        top: 0,
        left: 0,
        width: 1024,
        height: 768
    });
});
casper.then(function() {
	var self = this;
	reportErrors(function() {
	self.fill('.pc-modal-dialog form', {
		name : Date.now()
	}, true);
  });
});
casper.then(function() {
    this.echo("project form2");
});

casper.then(function() {
    this.waitForSelector('.dashboard-project-bottom-buttons .btn-inner-icon[text="EDITOR"]');
});
var firstFrameName;
var secondFrameUrl;
casper.then(function() {
  firstFrameName = focusedFrameName;
});

// editor button
casper.then(function() {
	//this.mouse.click('.dashboard-project-bottom-buttons .btn-inner-icon[text="EDITOR"]');

    secondFrameUrl = this.evaluate(function() {
    	var editorButton = $('.dashboard-project-bottom-buttons .btn-inner-icon[text="EDITOR"]')
	    var scope = angular.element(editorButton).scope();
	    return 'https://playcanvas.com' + scope.getPackUrl(scope.packs[0]);
	  });
});

casper.then(function() {
    this.echo("editor");
});

casper.then(function() {
	this.wait(1000);
})

// casper.then(function() {
// 	 console.log(this.page.framesName);
//   this.switchToFrame(this.page.framesName);
// });
casper.then(function() {
  //secondFrameUrl = this.page.pages[0].frameUrl;
  console.log(secondFrameUrl);
});
casper.then(function() {
  //this.close();
});
casper.then(function() {
  this.open(secondFrameUrl);
});
// casper.then(function() {
//   this.page.pages[0].viewportSize = {
// 	  width: 1024,
// 	  height: 768
// 	};
// });

casper.then(function() {
	this.waitForSelector('.ui-button.create-asset');
});
casper.then(function() {
    this.echo("create asset");
});
casper.then(function() {
	this.wait(3000);
})

// add asset button
casper.then(function() {
	this.mouse.click('.ui-button.create-asset');
});

casper.then(function() {
    this.echo("add asset");
});

casper.then(function() {
    this.capture('screenshot.png', {
        top: 0,
        left: 0,
        width: 1024,
        height: 768
    });
});
casper.then(function() {
	this.wait(1000);
})

// upload button
casper.then(function() {
	this.waitForSelector('#ui-root > div > div.ui-menu.open > div.inner > div.ui-menu-item');
});

casper.then(function() {
    this.echo("upload button");
});

// upload button
casper.then(function() {
	this.mouse.click('#ui-root > div > div.ui-menu.open > div.inner > div.ui-menu-item');
});

casper.then(function() {
    this.echo("upload form");
});

var testFile;
casper.then(function() {
  testFile = fs.read('test.fbx');
});

var testFileD;
casper.then(function() {
//	reportErrors(function() {
    testFileD = new File([testFile], 'test.fbx');
//  });
  console.log(testFileD.size);
//var testSize = fs.size("test.fbx");
//console.log(testSize);
});
casper.on('remote.message', function(msg) {
    this.echo('remote message caught: ' + msg);
});
casper.on( 'page.error', function (msg, trace) {
    this.echo( 'Page Error: ' + JSON.stringify(msg), 'ERROR' );
});


casper.then(function() {
	var output = this.evaluate(function() {
//    editor.call('assets:upload:picker', {parent: null});

       var args = { };

        var parent = args.parent || editor.call('assets:panel:currentFolder');

        var formUploadFile = document.createElement('form');
        formUploadFile.id = 'formUploadFile';
        formUploadFile.action = '/api/assets';
        formUploadFile.method = 'POST';
        var fileInput = document.createElement('input');
        formUploadFile.appendChild(fileInput);
        var fileSubmit = document.createElement('input');
        formUploadFile.appendChild(fileSubmit);
        fileSubmit.id = 'submitUploadFile';
        fileSubmit.type = 'submit';
        fileSubmit.value = 'submit';
        fileInput.id = 'inputUploadFile';
        fileInput.type = 'file';
        // fileInput.accept = '';
        fileInput.multiple = true;
        fileInput.style.display = 'none';
        editor.call('layout.assets').append(fileInput);

        var onChange = function() {
            editor.call('assets:upload:files', this.files);

            this.value = null;
            fileInput.removeEventListener('change', onChange);
        };

        fileInput.addEventListener('change', onChange, false);
        fileInput.click();

  });

});

//upload form
casper.then(function() {
	this.waitForSelector('#inputUploadFile');
});	

casper.then(function() {
    this.echo("upload file");
});

//upload file (hidden/dynamically created)
casper.then(function() {
	var filename = 'C:\\Users\\jordo\\OneDrive\\Documents\\GitHub\\cybers-cafe\\test.fbx';
  casper.page.uploadFile('#inputUploadFile', filename);
  page.evaluate(function(){
      // document.querySelectorAll("input[type=submit]")[0].click();
      document.querySelectorAll("#formUploadFile")[0].submit();
  });
  // casper.fill('#formUploadFile',{
  // 	file: filename
  // },true);
});
casper.then(function() {
    this.echo(".json element");
});
// xxx.fbx button
// casper.then(function() {
// 	this.waitForSelector('li.ui-grid-item:nth-child(1)');//'.ui-grid-item');
// });
casper.then(function() {
    this.wait(32000);
});

var jsonElementClassName;
// xxx.json button
casper.then(function() {
//	this.page.injectJs('https://code.jquery.com/jquery-3.2.1.min.js');
  this.waitFor(function check() {
	  jsonElementClassName = this.evaluate(function() {
		  var selector = null;
		  var elements = document.querySelectorAll('div.ui-panel.files li.ui-grid-item.type-model .label');
		  var arrayLength = elements.length;
	    for (var i = 0; i < arrayLength; i++) {//'.ui-panel.assets .content .ui-panel.files .content .ui-grid-item')) {

				var element = elements[i];

	     	var found = element.innerHTML && element.innerHTML.includes("test.json");
	     	if (!found) {
	     		continue;
	     	}

				function fullPath(el){
				  var names = [];
				  while (el.parentNode){
				    if (el.id){
				      names.unshift('#'+el.id);
				      break;
				    }else{
				      if (el==el.ownerDocument.documentElement) names.unshift(el.tagName);
				      else{
				        for (var c=1,e=el;e.previousElementSibling;e=e.previousElementSibling,c++);
				        names.unshift(el.tagName+":nth-child("+c+")");
				      }
				      el=el.parentNode;
				    }
				  }
				  return names.join(" > ");
				}

				selector = fullPath(element.parentElement);
	   		break;
	   	}
			return selector;
		});
		return jsonElementClassName != null;
	});
});

casper.then(function() {
    this.echo("selector: " + jsonElementClassName);
});

casper.then(function() {
    this.echo("drag n drop");
});

casper.then(function() {
  casper.then(function () {
      casper.mouseEvent('click', jsonElementClassName);
  });
});
casper.then(function() {
	this.wait(1000);
});
// drag n drop
casper.then(function() {
  casper.then(function () {
      casper.mouse.down(jsonElementClassName);
  });
});
casper.then(function() {
	this.wait(1000);
});
casper.then(function() {
  casper.then(function () {
      casper.mouse.move('#canvas-3d');
  });
});
casper.then(function() {
	this.wait(1000);
});
casper.then(function() {
  casper.then(function () {
      this.mouse.up('#canvas-3d');
  });
});

casper.then(function() {
	this.wait(5000);
});

// publish
casper.then(function() {
	this.mouse.click('div.ui-button:nth-child(16)');
});

casper.then(function() {
	this.wait(200);
});
casper.then(function() {
	this.waitForSelector('div.download:nth-child(2)');
});

// download button
casper.then(function() {
	this.mouse.click('div.download:nth-child(2)');
});

casper.then(function() {
	this.wait(200);
});
casper.then(function() {
	this.waitForSelector('div.options:nth-child(8) > div:nth-child(1) > div:nth-child(2) > div:nth-child(1) > div:nth-child(1)');
});

// concatenate scripts
casper.then(function() {
	this.mouse.click('div.options:nth-child(8) > div:nth-child(1) > div:nth-child(2) > div:nth-child(1) > div:nth-child(1)');
});

casper.then(function() {
	this.wait(200);
});
casper.then(function() {
	this.waitForSelector('.web-download');
});

casper.then(function() {
  this.evaluate(function(){	
    var urlToDownload = null;

    // download app for specified target (web or ios)
    var download = function (target) {
        jobInProgress = true;

//        refreshButtonsState();

        // post data
        var data = {
            name: 'download',
            project_id: config.project.id,
//            scenes: selectedScenes.map(function (scene) { return scene.id; }),
            target: target,
            scripts_concatenate: false
        };

        var sceneLi = $('li[id^="picker-scene-"]');
//        console.log('scene:',JSON.stringify(sceneLi));
        var sceneId = sceneLi.attr('id').split('-')[2];
        data.scenes = [parseInt(sceneId)];
        console.log('scene id ',sceneId);


		    // Download app
		     function ajaxDownload(data, callback) {
		        Ajax({
		            url: '{{url.api}}/apps/download',
		            auth: true,
		            method: 'POST',
		            data: data
		        })
		        .on('load', function (status, result) {
		            if (callback)
		                callback(result);
		        })
		        .on('error', function (code,error) {
		            console.log(JSON.stringify(error));
		        });
		    };

        // ajax call
        ajaxDownload( data, function (job) {

        		console.log('level 1');
            // when job is updated get the job and
            // proceed depending on job status
            var evt = editor.on('messenger:job.update', function (msg) {

        				console.log('level 2');
                if (msg.job.id === job.id) {
                    evt.unbind();

						        console.log('level 3 jobid ',job.id);

                    // get job
                    Ajax({
                        url: '{{url.api}}/jobs/' + job.id,
                        auth: true
                    })
                    .on('load', function (status, data) {

        								console.log('level 4');
                        var job = data;
                        // success ?
                        if (job.status === 'complete') {
                            jobInProgress = false;
                            var urlToDownload = job.data.download_url;
											    	console.log("<download_url>" + urlToDownload + "</download_url>");
//											    	casper.download(urlToDownload, fs.workingDirectory+'/download.zip');	        
                        }
                        // handle error
                        else if (job.status === 'error') {

                        }
                    }).on('error', function () {
                        // error
                    });
                }
            });
            events.push(evt);
        
        });
    };

    download('web');
  });
});

// web download
// casper.then(function() {
// 	this.mouse.click('.web-download');
// });


casper.then(function() {
	this.wait(200);
});
// your download is ready button
casper.then(function() {
	this.waitForSelector('div.progress:nth-child(15) > span:nth-child(2) > div:nth-child(2)');
});
// casper.then(function() {
// 	this.wait(2000);
// });

// casper.then(function() {
// 	this.mouse.click('div.progress:nth-child(15) > span:nth-child(2) > div:nth-child(2)');
// });

casper.run(function() {
    this.echo('Logged in as: ' + username).exit();
});