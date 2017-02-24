'use strict';

// Menu Drawer logic
var draweropen = false;

function drawer () {
  if (draweropen) { // close
  	document.getElementById("interface-div").style.visibility = 'hidden';
  	document.getElementById("drawer-icon-div").style.visibility = 'visible';
  	draweropen = false;
  } else { // open
  	document.getElementById("interface-div").style.visibility = 'visible';
  	document.getElementById("drawer-icon-div").style.visibility = 'hidden';
  	draweropen = true;
  }
}

// Section Select
var sections = ["createSection", "editSection"];

function selectSection(section) {
  for (var i = 0; i < sections.length; i++) {
  	document.getElementById(sections[i]).style.display = 'none';
  }
  document.getElementById(section).style.display = 'block';  
}

// Form Select
var createForms = ["createEntityImageForm", "createEntityModelForm"];
var editForms = ["editEntityMoveForm", "editEntityRotateForm", "editEntityScaleForm"];

function selectForm (form) {
  var forms = form.startsWith("create") ? createForms : editForms;
  for (var i = 0; i < forms.length; i++) {
  	document.getElementById(forms[i]).style.display = 'none';
  }
  document.getElementById(form).style.display = 'block';
}

// Create Form logic
$(function(){
  var onUpload = function(ev) {
	  var oOutput = document.getElementById("createFormResultContainer"),
	      oData = new FormData(form);

      oOutput.innerHTML = "Uploading...";
	//  oData.append("CustomField", "This is some extra data");

	  var oReq = new XMLHttpRequest();
	  oReq.open("POST", "api/entities", true);
	  oReq.onload = function(oEvent) {
	    if (oReq.status == 200) {
	      var responseJson = JSON.parse(oReq.responseText);
	      oOutput.innerHTML = responseJson.message;
	    } else {
	      oOutput.innerHTML = "Error occurred. <br \/>" + responseJson.message;
	    }
	  };

	  oReq.send(oData);
	  ev.preventDefault();
  };

  var form = document.forms.namedItem("createEntityModel");
  form.addEventListener('submit', onUpload, false);
});

$(function(){
  var onUpload = function(ev) {
	  var oOutput = document.getElementById("createFormResultContainer"),
	      oData = new FormData(form);

      oOutput.innerHTML = "Uploading...";
	//  oData.append("CustomField", "This is some extra data");

	  var oReq = new XMLHttpRequest();
	  oReq.open("POST", "api/image", true);
	  oReq.onload = function(oEvent) {
	    if (oReq.status == 200) {
	      var responseJson = JSON.parse(oReq.responseText);
	      oOutput.innerHTML = responseJson.message;
	    } else {
	      oOutput.innerHTML = "Error occurred: <br \/>" + responseJson.message;
	    }
	  };

	  oReq.send(oData);
	  ev.preventDefault();
  };

  var form = document.forms.namedItem("createEntityImage");
  form.addEventListener('submit', onUpload, false);
});

// Edit Form mov/rot/scale logic
$(function(){
  var onUpload = function(ev) {
	  var oOutput = document.getElementById("editFormResultContainer"),
	      oData = new FormData(form);

      oOutput.innerHTML = "Updating...";

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
  form.addEventListener('submit', onUpload, false);
});

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

    // bind event listener for selected entity
    var onEntityHit = function(hitEntity) {
      document.getElementById("editEntityId").value = hitEntity.id;
      populateInputsForSelectedEntity(hitEntity);
	    movementEntity.enableInput();
	    raycastEntity.disableInput();
      document.getElementById("modeLabel").innerHTML = "Movement Mode";
      document.getElementById("modeLabel").className = "label label-mode-movement";
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