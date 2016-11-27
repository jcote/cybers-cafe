'use strict';

var draweropen = true;

function drawer () {
  if (draweropen) {
  	document.getElementById("interface-div").hidden = true;
  } else {
  	document.getElementById("interface-div").hidden = false;
  }
}