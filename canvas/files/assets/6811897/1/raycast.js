// More information: http://developer.playcanvas.com/en/api/pc.RigidBodyComponentSystem.html
var Raycast = pc.createScript('raycast');

Raycast.attributes.add('camera', {
    type: 'entity'
});

// initialize code called once per entity
Raycast.prototype.initialize = function() {
    this.inputEnabled = false;
    
    // Find the first entity in the hierarchy with the name 'Camera'
    this.cameraEntity = this.camera;
    
    // Add a mousedown event handler
    this.app.mouse.on(pc.EVENT_MOUSEDOWN, this.mouseDown, this);
    
    // Add touch event only if touch is available
    if (this.app.touch) {
        this.app.touch.on(pc.EVENT_TOUCHSTART, this.touchStart, this);
    }
};

Raycast.prototype.mouseDown = function (e) {
    if (this.inputEnabled) {
      this.doRaycast(e);
    }
};

Raycast.prototype.touchStart = function (e) {
    // Only perform the raycast if there is one finger on the screen
    if (this.inputEnabled) {
      if (e.touches.length == 1) {
        this.doRaycast(e.touches[0]);
      }
      e.event.preventDefault();
    }
};

Raycast.prototype.doRaycast = function (screenPosition) {
    // The vec3 to raycast from
    var from = this.cameraEntity.getPosition ();
    // The vec3 to raycast to 
    var to = this.cameraEntity.camera.screenToWorld(screenPosition.x, screenPosition.y, this.cameraEntity.camera.farClip);

    // Raycast between the two points
    var result = this.app.systems.rigidbody.raycastFirst(from, to);
    
    // If there was a hit, store the entity
    if (result) {
        var hitEntity = result.entity;
        this.fire("hit", hitEntity);
    }    
};

Raycast.prototype.enableInput = function () {
  this.inputEnabled = true;
};

Raycast.prototype.disableInput = function () {
  this.inputEnabled = false;
};