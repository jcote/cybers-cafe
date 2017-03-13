var MathUtils = pc.createScript('mathUtils');

// initialize code called once per entity
MathUtils.prototype.initialize = function() {
    
};

// update code called every frame
MathUtils.prototype.update = function(dt) {
    
};

// translates (location, position) into (position) using player's coordinates
// (origin of coordinate system is the location where player started)
MathUtils.getRelativePosition = function(loc, pos, origin, scale) {
  var out = [];
  out[0] = pos[0] + scale * (loc[0] - origin[0]);
  out[1] = pos[1];
  out[2] = pos[2] + scale * (loc[1] - origin[1]);
  return out;
}

// takes a position in space anchored at origin
// and returns position XYZ anchored at closest location XZ 
MathUtils.getAbsolutePosition = function(pos, scale) {
	var out = {location:[], position:[]};
	
	out.location[0] = Math.floor(pos[0] / scale);
	out.location[1] = Math.floor(pos[2] / scale);

	out.position[0] = pos[0] % scale;
	out.position[1] = pos[1];
	out.position[2] = pos[2] % scale;

	return out;
}

// https://en.wikipedia.org/wiki/Pairing_function
// https://codepen.io/LiamKarlMitchell/pen/xnEca
// N x N -> N
MathUtils.cantorPair = function(x, y) {
    var n = ((x + y) * (x + y + 1)) / 2 + y;
    return n;
}

// N -> N x N
MathUtils.reverseCantorPair = function(n) {
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
MathUtils.evenOddEncode = function(z) {
  var n = 2 * Math.abs(z);
  if (z < 0) n--;
  return n;
}

// N -> Z
MathUtils.evenOddDecode = function(n) {
  var z = Math.ceil(n / 2);
  if (n % 2) z = -z;
  return z;
}

// Z x Z -> N x N -> N
MathUtils.zCantorPair = function(z, o) {
  var x = MathUtils.evenOddEncode(z);
  var y = MathUtils.evenOddEncode(o);
  var n = MathUtils.cantorPair(x, y);
  return n;
}

// N -> N x N -> Z x Z
MathUtils.zReverseCantorPair = function(n) {
  var nPair = MathUtils.reverseCantorPair(n);
  var zPair = [ MathUtils.evenOddDecode(nPair[0]), MathUtils.evenOddDecode(nPair[1]) ];
  return zPair;
}
