// More information: http://developer.playcanvas.com/en/api/pc.RigidBodyComponentSystem.html
var Raycast = pc.createScript('raycast');

Raycast.attributes.add('camera', {
    type: 'entity'
});

// initialize code called once per entity
Raycast.prototype.initialize = function() {
    this.inputEnabled = false;
    this.mode = "raycast"; // or "framebuffer"
    
    // Find the first entity in the hierarchy with the name 'Camera'
    this.cameraEntity = this.camera;
    
    // Create a frame buffer picker with a resolution of 1024x1024
    this.picker = new pc.Picker(this.app.graphicsDevice, 1024, 1024);

    // Add a mousedown event handler
    this.app.mouse.on(pc.EVENT_MOUSEDOWN, this.mouseDown, this);
    
    // Add touch event only if touch is available
    if (this.app.touch) {
        this.app.touch.on(pc.EVENT_TOUCHSTART, this.touchStart, this);
    }
};

Raycast.prototype.mouseDown = function (e) {
    if (this.inputEnabled) {
      this.doSelect(e);
    }
};

Raycast.prototype.touchStart = function (e) {
    // Only perform the raycast if there is one finger on the screen
    if (this.inputEnabled) {
      if (e.touches.length == 1) {
        this.doSelect(e.touches[0]);
      }
      e.event.preventDefault();
    }
};

Raycast.prototype.doSelect = function (event) {
    if (this.mode == "raycast") {
        this.doRaycast(event);
    } else {
        this.doFramebuffer(event);
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
        this.fire("hit", result);
    }    
};

Raycast.prototype.doFramebuffer = function (event) {
    var canvas = this.app.graphicsDevice.canvas;
    var canvasWidth = parseInt(canvas.clientWidth, 10);
    var canvasHeight = parseInt(canvas.clientHeight, 10);

    var camera = this.cameraEntity.camera.camera;
    var scene = this.app.scene;
    var picker = this.picker;

    picker.prepare(camera, scene);

    // Map the mouse coordinates into picker coordinates and
    // query the selection
    var selected = picker.getSelection({
        x: Math.floor(event.x * (picker.width / canvasWidth)),
        y: picker.height - Math.floor(event.y * (picker.height / canvasHeight))
    });

    if (selected.length > 0) {
        // Get the graph node used by the selected mesh instance
        var entity = selected[0].node;

        // Bubble up the hierarchy until we find an actual Entity
        while (!(entity instanceof pc.Entity) && entity !== null) {
            entity = entity.getParent();
        }
        if (entity) {
            this.fire("hit", entity);
        }
    }
};

Raycast.prototype.enableInput = function () {
  this.inputEnabled = true;
};

Raycast.prototype.disableInput = function () {
  this.inputEnabled = false;
};

Raycast.prototype.modeRaycast = function () {
  this.mode = "raycast";
};

Raycast.prototype.modeFramebuffer = function () {
  this.mode = "framebuffer";
};