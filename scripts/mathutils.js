'use strict';

// https://en.wikipedia.org/wiki/Pairing_function
// https://codepen.io/LiamKarlMitchell/pen/xnEca
// N x N -> N
function cantorPair (x, y) {
    var n = ((x + y) * (x + y + 1)) / 2 + y;
    return n;
}

// N -> N x N
function reverseCantorPair (n) {
    var pair = [];
    var t = Math.floor((-1 + Math.sqrt(1 + 8 * n))/2);
    var x = t * (t + 3) / 2 - n;
    var y = n - t * (t + 1) / 2;
    pair[0] = x;
    pair[1] = y;
    return pair;
}

// http://mathhelpforum.com/discrete-math/216997-z-zxz-function.html
// Z -> N
function evenOddEncode (z) {
  var n = 2 * Math.abs(z);
  if (z < 0) n--;
  return n;
}

// N -> Z
function evenOddDecode (n) {
  var z = Math.ceil(n / 2);
  if (n % 2) z = -z;
  return z;
}

// Z x Z -> N x N -> N
function zCantorPair(z, o) {
  var x = evenOddEncode(z);
  var y = evenOddEncode(o);
  var n = cantorPair(x, y);
  return n;
}

// N -> N x N -> Z x Z
function zReverseCantorPair(n) {
  var nPair = reverseCantorPair(n);
  var zPair = [ evenOddDecode(nPair[0]), evenOddDecode(nPair[1]) ];
  return zPair;
}


// translates (location, position) into (position) using player's coordinates
// (origin of coordinate system is the location where player started)
function getRelativePosition(loc, pos, origin, scale) {
  var out = [];
  out[0] = pos[0] + scale * (loc[0] - origin[0]);
  out[1] = pos[1];
  out[2] = pos[2] + scale * (loc[1] - origin[1]);
  return out;
}

// takes a position in space anchored at origin
// and returns position XYZ anchored at closest location XZ 
function getAbsolutePosition (pos, scale) {
	var out = {location:[], position:[]};
	
	out.location[0] = Math.floor(pos[0] / scale);
	out.location[1] = Math.floor(pos[2] / scale);

	out.position[0] = pos[0] % scale;
	out.position[1] = pos[1];
	out.position[2] = pos[2] % scale;

	return out;
}


//------spiral-------
// http://math.stackexchange.com/questions/1860538/is-there-a-cantor-pairing-function-for-spirals
function spiralPair (x,y) {
  var s = (Math.abs(x) > Math.abs(y)) ? x : y;
	var z;
	if (s >= 0) {
		z = 4 * Math.pow(s, 2) - x + y;
	} else {
		var kroneckerDelta = s == x ? 1 : 0;
		z = 4 * Math.pow(s, 2) + Math.pow(-1, kroneckerDelta) * (2 * s + x + y);
	}
	return z;
}

module.exports = {
	cantorPair: cantorPair,
	reverseCantorPair: reverseCantorPair,
	evenOddEncode: evenOddEncode,
	evenOddDecode: evenOddDecode,
	zCantorPair: zCantorPair,
	zReverseCantorPair: zReverseCantorPair,
	getRelativePosition: getRelativePosition,
	getAbsolutePosition: getAbsolutePosition,
	spiralPair: spiralPair
};