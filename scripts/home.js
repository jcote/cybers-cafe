'use strict';

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

var forms = ["createEntityImageForm", "createEntityModelForm"];

function selectForm (form) {
  for (var i = 0; i < forms.length; i++) {
  	document.getElementById(forms[i]).style.display = 'none';
  }
  document.getElementById(form).style.display = 'block';
}

$(function(){
	var form = document.forms.namedItem("createEntityModel");
	form.addEventListener('submit', function(ev) {
	  var oOutput = document.getElementById("modelFormResultContainer"),
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
	      oOutput.innerHTML = "Error occurred.<br \/>";
	    }
	  };

	  oReq.send(oData);
	  ev.preventDefault();
	}, false);
});

$(function(){
	var form = document.forms.namedItem("createEntityImage");
	form.addEventListener('submit', function(ev) {
	  var oOutput = document.getElementById("imageFormResultContainer"),
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
	      oOutput.innerHTML = "Error occurred.<br \/>";
	    }
	  };

	  oReq.send(oData);
	  ev.preventDefault();
	}, false);
});