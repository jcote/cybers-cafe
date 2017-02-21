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

// Edit select Entity
$(function(){
  var onClick = function(ev) { 
  	// get "playcanvas entity" objects
	var app = pc.Application.getApplication("application-canvas");
	var context = app.context;
	var playerEntity = context.root.findByName("Player");
    var movementEntity = playerEntity.script.movement;
    var raycastEntity = playerEntity.script.raycast;
  	// Switch to entity selection mode
	movementEntity.disableInput();
	raycastEntity.enableInput();
	raycastEntity.modeFramebuffer();
    
    // bind event listener for selected entity
    var onEntityHit = function(hitEntity) {
      document.getElementById("editEntityId").value = hitEntity.id;
      document.getElementById("editEntityTitle").value = hitEntity.name;
      if ("localPosition" in hitEntity) {
	      document.getElementById("editEntityPosX").value = hitEntity.localPosition.x;
	      document.getElementById("editEntityPosY").value = hitEntity.localPosition.y;
	      document.getElementById("editEntityPosZ").value = hitEntity.localPosition.z;
	    }
      if ("localRotation" in hitEntity) {
	      document.getElementById("editEntityRotW").value = hitEntity.localRotation.w;
	      document.getElementById("editEntityRotX").value = hitEntity.localRotation.x;
	      document.getElementById("editEntityRotY").value = hitEntity.localRotation.y;
	      document.getElementById("editEntityRotZ").value = hitEntity.localRotation.z;
      }
      if ("localScale" in hitEntity) {
      	document.getElementById("editEntitySclX").value = hitEntity.localScale.x;
      	document.getElementById("editEntitySclY").value = hitEntity.localScale.y;
        document.getElementById("editEntitySclZ").value = hitEntity.localScale.z;
      }
	    movementEntity.enableInput();
	    raycastEntity.disableInput();
    };
    raycastEntity.on('hit', onEntityHit);
  };

  var button = document.getElementById("editEntitySelectButton");
  button.addEventListener('click', onClick, false);
});

