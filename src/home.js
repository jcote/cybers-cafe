'use strict';

// Menu Drawer logic
var draweropen = false;

function drawer () {
  if (draweropen) { // close
  	setTimeout(function() {
  	  $("#interface-div").css('visibility', 'hidden');
    }, 400);
  	$("#drawer-icon-div").css('visibility', 'visible');
  	$("#interface-div").animate({ opacity: 0 }, 400);
  	draweropen = false;
  } else { // open
  	$("#interface-div").css('visibility', 'visible');
  	$("#drawer-icon-div").css('visibility', 'hidden');
  	$("#interface-div").animate({ opacity: 1 }, 400);
   	draweropen = true;
  }
}

function warp(warpLocationName) { 
  // check name is valid
  var alphanumericRe = /^[0-9a-zA-Z]+$/;
  if (!warpLocationName.match(alphanumericRe)) { 
    alert("Alphanumeric names only.");
    return;
  }

  // setup - get modules
  var app = pc.Application.getApplication("application-canvas");
  var context = app.context;
  var playerEntity = context.root.findByName("Player");
  var movementEntity = playerEntity.script.movement;
  var sceneEntity = context.root.findByName("scene");
  var networkEntity = sceneEntity.script.network;    

  // compute location
  var warpLocationNumber = parseInt(warpLocationName,36);
  var warpLocationPair = MathUtils.zReverseCantorPair(warpLocationNumber);

  console.log("##### Warp to: [" + warpLocationPair + "] (" + warpLocationNumber + ") '" + warpLocationName + "'");
  console.log("Current loc: "+ movementEntity.locationX + ", " +movementEntity.locationZ);
  console.log("Current breadcrumb: "+ movementEntity.locationBreadcrumbVector[0] + ", " +movementEntity.locationBreadcrumbVector[1]);
  console.log("Current origin: "+networkEntity.origin);

  // compute delta from current origin to warp location, to be used for moving the objects
  var  warpLocationDelta = [ warpLocationPair[0] - networkEntity.origin[0], 
                             warpLocationPair[1] - networkEntity.origin[1] ];

  // update the 'current location'
  movementEntity.locationX = warpLocationPair[0];
  movementEntity.locationZ = warpLocationPair[1];

  // must recreate tiles around origin, or shuffle will occur and mess with locationX/Z
  movementEntity.createTileGrid(movementEntity.range, movementEntity.scale);

  // update the breadcrumb vector so that locationupdate may be triggered if warped far enough
  movementEntity.locationBreadcrumbVector[0] += warpLocationDelta[0];
  movementEntity.locationBreadcrumbVector[1] += warpLocationDelta[1];

  // update Network origin
  networkEntity.origin[0] = warpLocationPair[0];
  networkEntity.origin[1] = warpLocationPair[1];

  // clear the network queue (disabled)
 //  networkEntity.isQueueRunning = false;    
  // networkEntity.queue = new Queue();
  // networkEntity.progress = 0;
 //  networkEntity.progressExpected = 0;
//   $('#progress-inner-div').attr('aria-valuenow', 0).css('width','100%');
//   $('#progress-div').css('visibility', 'hidden');

  // handle existing entities
  Object.keys(app.entities).forEach(function(entityId) {
    var pos = app.entities[entityId].getLocalPosition();
    var newpos = {};
    newpos.x = pos.x - warpLocationDelta[0] * Network.scale;
    newpos.y = pos.y;
    newpos.z = pos.z - warpLocationDelta[1] * Network.scale;
    if (Math.abs(warpLocationPair[0] - newpos.x) < 50 || Math.abs(warpLocationPair[1] - newpos.z) < 50) {
      // move close entity relative to warp
      if ('rigidbody' in app.entities[entityId]) {            
        app.entities[entityId].rigidbody.teleport(newpos.x, newpos.y, newpos.z);
      } else {
        app.entities[entityId].translate(- warpLocationDelta[0] * Network.scale, 0, - warpLocationDelta[1] * Network.scale);
      }
    } else {
      // remove far entity
      app.entities[entityId].destroy();
      delete app.entities[entityId];
    }
  });

  // handle existing players
  if (!networkEntity.players) networkEntity.players = [];
  Object.keys(networkEntity.players).forEach(function(playerId) {
    if ('entity' in networkEntity.players[playerId]) {
      var pos = networkEntity.players[playerId].entity.getLocalPosition();
      var newpos = {};
      newpos.x = pos.x - warpLocationDelta[0] * Network.scale;
      newpos.y = pos.y;
      newpos.z = pos.z - warpLocationDelta[1] * Network.scale;
      if (Math.abs(warpLocationPair[0] - newpos.x) < 50 || Math.abs(warpLocationPair[1] - newpos.z) < 50) {
        // move close player relative to warp
        networkEntity.players[playerId].entity.rigidbody.teleport(newpos.x, newpos.y, newpos.z);
      } else {
        // remove far player
        networkEntity.players[playerId].entity.destroy();
//          delete networkEntity.players[i];
        // TODO: re-add players that come back into closeness
      }
    }
  });

  // move to new origin and report position
  networkEntity.player.rigidbody.teleport(0, 0.5, 0);
  networkEntity.updatePosition();

  // the following happen automatically
//    networkEntity.updateLocation();

  // update location div
  //$('#location-div').html(warpLocationName);
};

// Warp To button
$(function(){
  var onClick = function(ev) {
    var warpLocationName = $('#warpToInput').val();
    warp(warpLocationName);
  }

  var button = document.getElementById("warpToButton");
  button.addEventListener('click', onClick, false);
});

// Section Select
var sections = ["createSection", "editSection"];

function selectSection(section) {
  for (var i = 0; i < sections.length; i++) {
  	document.getElementById(sections[i]).style.display = 'none';
  }
  document.getElementById(section).style.display = 'block';  
}

// Form Select
var createForms = ["createEntityImageForm", "createEntityModelForm", "createEntityHyperlinkForm"];
var editForms = ["editEntityMoveForm", "editEntityRotateForm", "editEntityScaleForm"];

function selectForm (form) {
  var forms = form.startsWith("create") ? createForms : editForms;
  for (var i = 0; i < forms.length; i++) {
  	document.getElementById(forms[i]).style.display = 'none';
  }
  document.getElementById(form).style.display = 'block';
}

// ---CREATE---

// Place entity and render onscreen from a create response
function entityPlacement (ev) {
	var button = ev.target;
	var data = button.entry;
 	// get "playcanvas entity" objects
	var app = pc.Application.getApplication("application-canvas");
	var context = app.context;
	var playerEntity = context.root.findByName("Player");
  var movementEntity = playerEntity.script.movement;
  var raycastEntity = playerEntity.script.raycast;
  var transformEntity = playerEntity.script.transform;
  // Switch to entity placement mode
	movementEntity.disableInput();
	raycastEntity.enableInput();
	transformEntity.disableInput();
	raycastEntity.modeRaycast();
  document.getElementById("modeLabel").innerHTML = "Placement Mode";
  document.getElementById("modeLabel").className = "label label-mode-placement";
  movementEntity.mode = "placement";

  // bind event listener for selected entity
	var sceneEntity = context.root.findByName("scene");
  var networkEntity = sceneEntity.script.network;
  
  var alreadyHit = false;
  var onHit = function(hit) {
  	if (alreadyHit) {
  		return;
  	}
  	alreadyHit = true;
  	if ('assets' in data) {
  		Object.keys(data.assets).forEach(function (assetId) {
        networkEntity.queue.enqueue(new QueueItem('asset', data.assets[assetId]));
        if (!networkEntity.isQueueRunning) {
            networkEntity.popQueue();
        }
	    });
	  }


    // Convert hit point to absolute positioning
    var relativePosition = [hit.point.x, hit.point.y, hit.point.z];
    var absolutePosition = MathUtils.getAbsolutePosition(relativePosition, networkEntity.origin, movementEntity.scale);

    if (networkEntity.origin[0] != 0 || networkEntity.origin[1] != 0) {
        var originByCurrentLocation = [
            movementEntity.locationX - networkEntity.origin[0], 
            movementEntity.locationZ - networkEntity.origin[1]];
        var absPosition = MathUtils.getAbsolutePosition(relativePosition, originByCurrentLocation, Network.scale);
        absolutePosition.position = absPosition.position;

    }

    data.entity.location = absolutePosition.location;
    data.entity.position = absolutePosition.position;

    networkEntity.queue.enqueue(new QueueItem('entity', data.entity));
    if (!networkEntity.isQueueRunning) {
        networkEntity.popQueue();
    }
	  // Switch to movement mode
    movementEntity.enableInput();
    raycastEntity.disableInput();
    document.getElementById("modeLabel").innerHTML = "Movement Mode";
    document.getElementById("modeLabel").className = "label label-mode-movement";
    movementEntity.mode = "movement";
    // effect in UI
    button.className += " disabled";
    var oOutput = document.getElementById("createFormResultContainer")
    oOutput.appendChild(document.createTextNode("Placing entity..."));
    // Report position to server
	  var oData = new FormData();
	  oData.append("locX", absolutePosition.location[0]);
	  oData.append("locZ", absolutePosition.location[1]);
	  oData.append("posX", absolutePosition.position[0]);
	  oData.append("posY", absolutePosition.position[1]);
	  oData.append("posZ", absolutePosition.position[2]);
	  var oReq = new XMLHttpRequest();
	  oReq.open("PUT", "api/entities/position/" + data.entity.id, true);
	  oReq.onload = function(oEvent) {
	    if (oReq.status == 200) {
	      var responseJson = JSON.parse(oReq.responseText);
	      oOutput.appendChild(document.createTextNode(responseJson.message));
	    } else {
	      oOutput.appendChild(document.createTextNode("Error occurred. "));
	      if (responseJson) {
	        oOutput.appendChild(document.createTextNode(responseJson.message));
	      }
	    }
	  };
	  oReq.send(oData);
  };
  raycastEntity.on('hit', onHit);
};

function createPlacementButton(entity, assets) {
	// create a button in the list that will drop entity
	var entityButton = document.createElement("button");
	entityButton.type = "button";
	entityButton.className = "list-group-item";
	entityButton.appendChild(document.createTextNode(entity.name + " : " + entity.id));
	entityButton.addEventListener('click', entityPlacement);
  entityButton.entry = {"entity": entity, "assets": assets};
	var entityChooseList = document.getElementById("entityChooseList");
	entityChooseList.appendChild(entityButton);
}

// Create 3D Model
$(function(){
  var onUpload = function(ev) {
	  var oOutput = document.getElementById("createFormResultContainer"),
	      oData = new FormData(form);

      oOutput.innerHTML = "Uploading...";

	  var oReq = new XMLHttpRequest();
	  oReq.open("POST", "api/entities", true);
	  oReq.onload = function(oEvent) {
	    if (oReq.status == 200) {
	      var responseJson = JSON.parse(oReq.responseText);
	      oOutput.appendChild(document.createTextNode(responseJson.message));
	      if (responseJson.records) {
	      	Object.keys(responseJson.records).forEach(function(entityId) {
	      		if (entityId == "undefined") return;
	      		// gather together the entity itself and its assets so we can render them
	      		var objectId = responseJson.records[entityId].objectId;
	      		var entity = responseJson.entities[objectId];
	      		entity.id = entityId;
	      		entity.objectId = objectId;
	      		// select dependent assets from aggregate
	      		var assets = responseJson.records[entityId].assetIds.reduce(
	      			function(o, k) {
	      				o[k] = responseJson.assets[k];
	      				return o;
	      			}, {});
            createPlacementButton(entity, assets);
	      		oOutput.appendChild(document.createTextNode("Ready to place entity..."));
	      	});
	      }
	    } else {
	      oOutput.appendChild(document.createTextNode("Error occurred. " + responseJson.message));
	    }
	  };

	  oReq.send(oData);
	  ev.preventDefault();
  };

  var form = document.forms.namedItem("createEntityModel");
  form.addEventListener('submit', onUpload, false);
});

// Create Image
$(function(){
  var onUpload = function(ev) {
	  var oOutput = document.getElementById("createFormResultContainer"),
	      oData = new FormData(form);

      oOutput.innerHTML = "Uploading...";

	  var oReq = new XMLHttpRequest();
	  oReq.open("POST", "api/image", true);
	  oReq.onload = function(oEvent) {
	    if (oReq.status == 200) {
	      var responseJson = JSON.parse(oReq.responseText);
	      oOutput.appendChild(document.createTextNode(responseJson.message));
    	  var entityId = Object.keys(responseJson.records)[0]; // only one entity right now...
    	  var objectId = responseJson.records[entityId].objectId;
	      var entity = responseJson.entities[objectId];
	      var assets = responseJson.assets;
	      entity.id = entityId;
    		entity.objectId =  responseJson.records[entityId].objectId;
        createPlacementButton(entity, assets);
    		oOutput.appendChild(document.createTextNode("Ready to place entity..."));
	    } else {
	      oOutput.appendChild(document.createTextNode("Error occurred. " + responseJson.message));
	    }
	  };

	  oReq.send(oData);
	  ev.preventDefault();
  };

  var form = document.forms.namedItem("createEntityImage");
  form.addEventListener('submit', onUpload, false);
});


// Create Link
$(function(){
  var onUpload = function(ev) {
    var oOutput = document.getElementById("createFormResultContainer"),
        oData = new FormData(form);

      oOutput.innerHTML = "Uploading...";

    var oReq = new XMLHttpRequest();
    oReq.open("POST", "api/hyperlink", true);
    oReq.onload = function(oEvent) {
      if (oReq.status == 200) {
        var responseJson = JSON.parse(oReq.responseText);
        oOutput.appendChild(document.createTextNode(responseJson.message));
        var entityId = Object.keys(responseJson.records)[0]; // only one entity right now...
        var objectId = responseJson.records[entityId].objectId;
        var entity = responseJson.entities[objectId];
        var assets = responseJson.assets;
        entity.id = entityId;
        entity.objectId =  responseJson.records[entityId].objectId;
        createPlacementButton(entity, assets);
        oOutput.appendChild(document.createTextNode("Ready to place entity..."));
      } else {
        oOutput.appendChild(document.createTextNode("Error occurred. " + responseJson.message));
      }
    };

    oReq.send(oData);
    ev.preventDefault();
  };

  var form = document.forms.namedItem("createEntityHyperlink");
  form.addEventListener('submit', onUpload, false);
});

//---EDIT---
// Edit Form mov/rot/scale logic
$(function(){
  var onUpload = function(ev) {
	  var oOutput = document.getElementById("editFormResultContainer"),
	      oData = new FormData(form);

      // convert position to absolute location & position
			var app = pc.Application.getApplication("application-canvas");
      var entityId = document.getElementById("editEntityId").value;
      if (!$.isNumeric(entityId) || !(entityId in app.entities)) {
        alert("Select an Entity first.");
        ev.preventDefault();
        return;
      }
			var playerEntity = app.context.root.findByName("Player");
		  var movementEntity = playerEntity.script.movement;
			var sceneEntity = app.context.root.findByName("scene");
		  var networkEntity = sceneEntity.script.network;
      var raycastEntity = playerEntity.script.raycast;
      var transformEntity = playerEntity.script.transform;

      var relativePosition = [ oData.get("posX"), oData.get("posY"), oData.get("posZ") ];
      var absolutePosition = MathUtils.getAbsolutePosition(relativePosition, networkEntity.origin, movementEntity.scale);
      oData.set("locX", absolutePosition.location[0]);
      oData.set("locZ", absolutePosition.location[1]);
      oData.set("posX", absolutePosition.position[0]);
      oData.set("posY", absolutePosition.position[1]);
      oData.set("posZ", absolutePosition.position[2]);

    oOutput.innerHTML = "Updating...";

    // Switch to movement mode
    movementEntity.enableInput();
    raycastEntity.disableInput();
    transformEntity.disableInput();
    document.getElementById("modeLabel").innerHTML = "Movement Mode";
    document.getElementById("modeLabel").className = "label label-mode-movement";
    movementEntity.mode = "movement";

	  var oReq = new XMLHttpRequest();
	  oReq.open("PUT", "api/entity/" + oData.get("id"), true);
	  
	  oReq.onload = function(oEvent) {
	    var responseJson = JSON.parse(oReq.responseText);
	    if (oReq.status == 200) {
	      oOutput.innerHTML = responseJson.message;
	    } else {
	    	if (responseJson != undefined) {
  	      oOutput.innerHTML = "Error occurred (" + oReq.status + "): <br \/>" + responseJson.message;	    		
	    	} else {
          oOutput.innerHTML = "Error occurred (" + oReq.status + "): <br \/>" + oReq.responseText;
	    	}
	    }
	  };

	  oReq.send(oData);
	  ev.preventDefault();
  };

  var form = document.forms.namedItem("editEntity");
  form.addEventListener('submit', onUpload, false); });

var populateInputsForSelectedEntity = function (entity) {
    document.getElementById("editEntityTitle").value = entity.name;
    if ("localPosition" in entity) {
      document.getElementById("editEntityPosX").value = entity.localPosition.x;
      document.getElementById("editEntityPosY").value = entity.localPosition.y;
      document.getElementById("editEntityPosZ").value = entity.localPosition.z;
    }
    if ("localRotation" in entity) {
      	var eulerAngles = entity.getLocalEulerAngles();
	      document.getElementById("editEntityRotX").value = eulerAngles.x;
	      document.getElementById("editEntityRotY").value = eulerAngles.y;
	      document.getElementById("editEntityRotZ").value = eulerAngles.z;
    }
    if ("localScale" in entity) {
    	document.getElementById("editEntitySclX").value = entity.localScale.x;
    	document.getElementById("editEntitySclY").value = entity.localScale.y;
      document.getElementById("editEntitySclZ").value = entity.localScale.z;
    }
}

// Edit select Entity
$(function(){
  var onClick = function(ev) { 
  	// get "playcanvas entity" objects
	var app = pc.Application.getApplication("application-canvas");
	var context = app.context;
	var playerEntity = context.root.findByName("Player");
    var movementEntity = playerEntity.script.movement;
    var raycastEntity = playerEntity.script.raycast;
    var transformEntity = playerEntity.script.transform;
  	// Switch to entity selection mode
	movementEntity.disableInput();
	raycastEntity.enableInput();
	transformEntity.disableInput();
	raycastEntity.modeFramebuffer();
    document.getElementById("modeLabel").innerHTML = "Select Mode";
    document.getElementById("modeLabel").className = "label label-mode-select";
    movementEntity.mode = "select";

    // bind event listener for selected entity
    var onEntityHit = function(hitEntity) {
      document.getElementById("editEntityId").value = hitEntity.id;
      populateInputsForSelectedEntity(hitEntity);
	    movementEntity.enableInput();
	    raycastEntity.disableInput();
      document.getElementById("modeLabel").innerHTML = "Movement Mode";
      document.getElementById("modeLabel").className = "label label-mode-movement";
      movementEntity.mode = "movement";
    };
    raycastEntity.on('hit', onEntityHit);
  };

  var button = document.getElementById("editEntitySelectButton");
  button.addEventListener('click', onClick, false);
});

// Move entity in Edit mode
$(function(){
  var onClick = function(ev) { 
		// get entity to move
		var app = pc.Application.getApplication("application-canvas");
    var entityId = document.getElementById("editEntityId").value;
    if (!$.isNumeric(entityId) || !(entityId in app.entities)) {
      alert("Select an Entity first.");
      return;
    }
    var entity = app.entities[entityId];
  	// get "playcanvas entity" objects
		var context = app.context;
		var playerEntity = context.root.findByName("Player");
    var movementEntity = playerEntity.script.movement;
    var raycastEntity = playerEntity.script.raycast;
    var transformEntity = playerEntity.script.transform;
  	// Switch to entity move mode
		movementEntity.disableInput();
		raycastEntity.disableInput();
		transformEntity.modeMove();
		transformEntity.setEntity(entity);
		transformEntity.enableInput();
    document.getElementById("modeLabel").innerHTML = "Translate Mode";
    document.getElementById("modeLabel").className = "label label-mode-translate";
    movementEntity.mode = "translate";

    // bind event listener for entity movement
    var onEntityMove = function(entityId) {
      if ("localPosition" in entity) {
	      document.getElementById("editEntityPosX").value = entity.localPosition.x;
	      document.getElementById("editEntityPosY").value = entity.localPosition.y;
	      document.getElementById("editEntityPosZ").value = entity.localPosition.z;
	    }
    };
    transformEntity.on('move', onEntityMove);
  };

  var link = document.getElementById("moveLink");
  link.addEventListener('click', onClick, false);
});

// Rotate entity in Edit mode
$(function(){
  var onClick = function(ev) { 
		// get entity to move
		var app = pc.Application.getApplication("application-canvas");
    var entityId = document.getElementById("editEntityId").value;
    if (!$.isNumeric(entityId) || !(entityId in app.entities)) {
      alert("Select an Entity first.");
      return;
    }
    var entity = app.entities[entityId];
  	// get "playcanvas entity" objects
		var context = app.context;
		var playerEntity = context.root.findByName("Player");
    var movementEntity = playerEntity.script.movement;
    var raycastEntity = playerEntity.script.raycast;
    var transformEntity = playerEntity.script.transform;
  	// Switch to entity move mode
		movementEntity.disableInput();
		raycastEntity.disableInput();
		transformEntity.modeRotate();
		transformEntity.setEntity(entity);
		transformEntity.enableInput();
    document.getElementById("modeLabel").innerHTML = "Rotate Mode";
    document.getElementById("modeLabel").className = "label label-mode-rotate";
    movementEntity.mode = "rotate";

    // bind event listener for entity rotation
    var onEntityRotate = function(entityId) {
      if ("localRotation" in entity) {
      	var eulerAngles = entity.getLocalEulerAngles();
	      document.getElementById("editEntityRotX").value = eulerAngles.x;
	      document.getElementById("editEntityRotY").value = eulerAngles.y;
	      document.getElementById("editEntityRotZ").value = eulerAngles.z;
      }
    };
    transformEntity.on('rotate', onEntityRotate);
  };

  var link = document.getElementById("rotateLink");
  link.addEventListener('click', onClick, false);
});

// Scale entity in Edit mode
$(function(){
  var onClick = function(ev) { 
		// get entity to move
		var app = pc.Application.getApplication("application-canvas");
    var entityId = document.getElementById("editEntityId").value;
    if (!$.isNumeric(entityId) || !(entityId in app.entities)) {
      alert("Select an Entity first.");
      return;
    }
    var entity = app.entities[entityId];
  	// get "playcanvas entity" objects
		var context = app.context;
		var playerEntity = context.root.findByName("Player");
    var movementEntity = playerEntity.script.movement;
    var raycastEntity = playerEntity.script.raycast;
    var transformEntity = playerEntity.script.transform;
  	// Switch to entity move mode
		movementEntity.disableInput();
		raycastEntity.disableInput();
		transformEntity.modeScale();
		transformEntity.setEntity(entity);
		transformEntity.enableInput();
    document.getElementById("modeLabel").innerHTML = "Scale Mode";
    document.getElementById("modeLabel").className = "label label-mode-scale";
    movementEntity.mode = "scale";

    // bind event listener for entity rotation
    var onEntityScale = function(entityId) {
      if ("localScale" in entity) {
      	document.getElementById("editEntitySclX").value = entity.localScale.x;
      	document.getElementById("editEntitySclY").value = entity.localScale.y;
        document.getElementById("editEntitySclZ").value = entity.localScale.z;
      }
    };
    transformEntity.on('scale', onEntityScale);
  };

  var link = document.getElementById("scaleLink");
  link.addEventListener('click', onClick, false);
});

// onBlur ID
$(function() {
	var onBlur = function(ev) {
		var app = pc.Application.getApplication("application-canvas");
		if (input.value in app.entities) {
			populateInputsForSelectedEntity(app.entities[input.value]);
		}
	};
	var input = document.getElementById("editEntityId");
	input.addEventListener('blur', onBlur, false);
});

// Edit Entity Proof button
$(function(){
  var onClick = function(ev) { 
  	// get "playcanvas entity" objects
		var app = pc.Application.getApplication("application-canvas");
    var entityId = document.getElementById("editEntityId").value;
    if (!$.isNumeric(entityId) || !(entityId in app.entities)) {
      alert("Select an Entity first.");
      return;
    }
    var entity = app.entities[entityId];
		var context = app.context;
		var playerEntity = context.root.findByName("Player");
    var movementEntity = playerEntity.script.movement;
    var raycastEntity = playerEntity.script.raycast;
    var transformEntity = playerEntity.script.transform;
  	// Switch to movement mode
		movementEntity.enableInput();
		raycastEntity.disableInput();
		transformEntity.disableInput();
	  document.getElementById("modeLabel").innerHTML = "Movement Mode";
	  document.getElementById("modeLabel").className = "label label-mode-movement";
    movementEntity.mode = "movement";
    // gather all the data
    var posX = document.getElementById("editEntityPosX").value;
	  var posY = document.getElementById("editEntityPosY").value;
	  var posZ = document.getElementById("editEntityPosZ").value;
    var rotX = document.getElementById("editEntityRotX").value;
    var rotY = document.getElementById("editEntityRotY").value;
    var rotZ = document.getElementById("editEntityRotZ").value;
  	var sclX = document.getElementById("editEntitySclX").value;
  	var sclY = document.getElementById("editEntitySclY").value;
    var sclZ = document.getElementById("editEntitySclZ").value;
    if (!($.isNumeric(posX) && $.isNumeric(posY) && $.isNumeric(posZ) && 
    	    $.isNumeric(rotX) && $.isNumeric(rotY) && $.isNumeric(rotZ) && 
    	    $.isNumeric(sclX) && $.isNumeric(sclY) && $.isNumeric(sclZ) )) {
      alert("Values must be numeric.");
      return;
    }
    // update the entity
    entity.setLocalPosition(new pc.Vec3(posX, posY, posZ));
    entity.setLocalEulerAngles(new pc.Vec3(rotX, rotY, rotZ));
    entity.setLocalScale(new pc.Vec3(sclX, sclY, sclZ));
  };

  var button = document.getElementById("editEntityProofButton");
  button.addEventListener('click', onClick, false);
});

// Remove entity
$(function(){
  var onClick = function(ev) {
    // get "playcanvas entity" objects
    var app = pc.Application.getApplication("application-canvas");
    var entityId = document.getElementById("editEntityId").value;
    if (!$.isNumeric(entityId) || !(entityId in app.entities)) {
      alert("Select an Entity first.");
      return;
    }
    var entity = app.entities[entityId];

    var oOutput = document.getElementById("editFormResultContainer");

     oOutput.appendChild(document.createTextNode("Removing..."));

    var oReq = new XMLHttpRequest();
    oReq.open("DELETE", "api/entity/" + entityId, true);
    oReq.onload = function(oEvent) {
      if (oReq.status == 200) {
        entity.destroy();
        delete app.entities[entityId];

        oOutput.appendChild(document.createTextNode(oReq.responseText));
      } else {
        oOutput.appendChild(document.createTextNode("Error occurred. " + oReq.responseText));
      }
    };

    oReq.send();
    ev.preventDefault();
  };

  var button = document.getElementById("removeEntityButton");
  button.addEventListener('click', onClick, false);
});

// Send Feedback
$(function() {
  var onUpload = function(ev) {
    var oData = new FormData(form);
    var oReq = new XMLHttpRequest();
    oReq.open("POST", "api/feedback", true);
    oReq.onload = function(oEvent) {
      if (oReq.status == 200) {
        alert("Feedback sent - Thank you");
        $('#contactModal').modal('hide');
      } else {
        alert("Error occurred. " + oReq.responseText);
      }
    };

    oReq.send(oData);
    ev.preventDefault();
  };

  var form = document.forms.namedItem("contact");
  form.addEventListener('submit', onUpload, false);
});

// Focus canvas
$(function() {
  var onClick = function(ev) {
    canvas.focus();
  };

  var canvas = document.getElementById("application-canvas");
  canvas.addEventListener('click', onClick, false);
});
