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
var editForms = ["editEntityMoveForm", "editEntityRotateForm", "editEntityScaleForm", "editEntityRemoveForm"];

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
	      oOutput.innerHTML = "Error occurred. <br \/>" + responseJson.message;
	    }
	  };

	  oReq.send(oData);
	  ev.preventDefault();
  };

  var form = document.forms.namedItem("createEntityImage");
  form.addEventListener('submit', onUpload, false);
});

// Edit Form logic
$(function(){
  var onUpload = function(ev) {
	  var oOutput = document.getElementById("editFormResultContainer"),
	      oData = new FormData(form);

      oOutput.innerHTML = "Updating...";
	//  oData.append("CustomField", "This is some extra data");

	  var oReq = new XMLHttpRequest();
	  oReq.open("PUT", "api/entity/pos", true);
	  oReq.onload = function(oEvent) {
	    if (oReq.status == 200) {
	      var responseJson = JSON.parse(oReq.responseText);
	      oOutput.innerHTML = responseJson.message;
	    } else {
	      oOutput.innerHTML = "Error occurred.<br \/>";
	    }
	  };

	  oReq.send(oData);
	  ev.preventDefault();
  };

  var form = document.forms.namedItem("editEntityMove");
  form.addEventListener('submit', onUpload, false);
});

// Edit select Entity

$(function(){
  var onClick = function(ev) { 
  	// get playcanvas objects
	var app = pc.Application.getApplication("application-canvas");
	var context = app.context;
	var playerEntity = context.root.findByName("Player");
  	// Switch to entity selection mode
    var movementEntity = playerEntity.script.movement;
    movementEntity.disableInput();
    var raycastEntity = playerEntity.script.raycast;
    raycastEntity.enableInput();
    
    // bind event listener for selected entity
    var onEntityHit = function(hitEntity) {
      document.getElementById("selectEntityMoveId").value = hitEntity.id;
      document.getElementById("selectEntityMoveTitle").value = hitEntity.name;
    };
    raycastEntity.on('hit', onEntityHit);
  };

  var button = document.getElementById("selectEntityMoveButton");
  button.addEventListener('click', onClick, false);
});