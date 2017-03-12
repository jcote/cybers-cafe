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
};

// takes a position in space anchored at origin
// and returns position XYZ anchored at closest location XZ 
MathUtils.getAbsolutePosition = function (pos, scale) {
	var out = {location:[], position:[]};
	
	out.location[0] = pos[0] / scale;
	out.location[1] = pos[2] / scale;

	out.position[0] = pos[0] % scale + pos[0];
	out.position[1] = pos[1];
	out.position[2] = pos[2] % scale + pos[2];

	return out;
};
