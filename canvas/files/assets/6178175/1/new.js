var New = pc.createScript('new');

// initialize code called once per entity
New.prototype.initialize = function() {
    console.log('start');
};

// update code called every frame
New.prototype.update = function(dt) {
    console.log('frame');
};

// swap method called for script hot-reloading
// inherit your script state here
New.prototype.swap = function(old) {
    console.log('swap');
};

// to learn more about script anatomy, please read:
// http://developer.playcanvas.com/en/