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

$(function(){
	var form = document.forms.namedItem("createEntity");
	form.addEventListener('submit', function(ev) {
	  var oOutput = document.getElementById("formResultContainer"),
	      oData = new FormData(form);

      oOutput.innerHTML = "Uploading...";
	//  oData.append("CustomField", "This is some extra data");

	  var oReq = new XMLHttpRequest();
	  oReq.open("POST", "api/entities", true);
	  oReq.onload = function(oEvent) {
	    if (oReq.status == 200) {
	      oOutput.innerHTML = "Uploaded!";
	    } else {
	      oOutput.innerHTML = "Error " + oReq.status + " occurred when trying to upload your file.<br \/>";
	    }
	  };

	  oReq.send(oData);
	  ev.preventDefault();
	}, false);
});