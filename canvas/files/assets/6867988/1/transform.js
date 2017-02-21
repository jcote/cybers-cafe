var Transform = pc.createScript('transform');

Transform.attributes.add('cameraEntity', {type: 'entity', title: 'Camera Entity'});
Transform.attributes.add('orbitSensitivity', {
    type: 'number', 
    default: 0.3, 
    title: 'Orbit Sensitivity', 
    description: 'How fast the camera moves around the orbit. Higher is faster'
});


// initialize code called once per entity
Transform.prototype.initialize = function() {
    this.inputEnabled = false;
    
    this.mode = "move"; // or "rotate" or "scale"
    
    this.app.mouse.on(pc.EVENT_MOUSEMOVE, this.onMouseMove, this);
    
    this.lastTouchPoint = new pc.Vec2();
    if (this.app.touch) {
        this.app.touch.on(pc.EVENT_TOUCHSTART, this.onTouchStart, this);
        this.app.touch.on(pc.EVENT_TOUCHMOVE, this.onTouchMove, this);        
    }
};

Transform.prototype.transform = function (x, y, dx, dy) {
    if (this.mode == "move") {
      this.move(dx, dy);
    } else if (this.mode == "rotate") {
      this.rotate(dx, dy);
    } else if (this.mode == "scale") {
      this.scale(x, y, dx, dy);
    }
};

Transform.moveVec = new pc.Vec3();

Transform.prototype.move = function (dx, dy) {
    this.moveVec.x = dx;
    this.moveVec.y = dy;
    
    this.entity.translate(moveVec);
};

Transform.horizontalQuat = new pc.Quat();
Transform.verticalQuat = new pc.Quat();
Transform.resultQuat = new pc.Quat();

Transform.prototype.rotate = function (dx, dy) {
    var horzQuat = Transform.horizontalQuat;
    var vertQuat = Transform.verticalQuat;
    var resultQuat = Transform.resultQuat;

    // Create a rotation around the camera's orientation in order for them to be in 
    // screen space  
    horzQuat.setFromAxisAngle(this.cameraEntity.up, dx * this.orbitSensitivity);
    vertQuat.setFromAxisAngle(this.cameraEntity.right, dy * this.orbitSensitivity);

    // Apply both the rotations to the existing entity rotation
    resultQuat.mul2(horzQuat, vertQuat);
    resultQuat.mul(this.entity.getRotation());

    this.entity.setRotation(resultQuat);    
};

Transform.selectVec = new pc.Vec2();
Transform.posVec = new pc.Vec2();
Transform.deltaVec = new pc.Vec2();
Transform.scaleVec = new pc.Vec3();

Transform.prototype.scale = function (x, y, dx, dy) {
    this.selectVec.x = x;
    this.selectVec.y = y;
    this.deltaVec.x = dx;
    this.deltaVec.y = dy;

    this.posVec = this.camera.worldToScreen(this.entity.getPosition());

    this.posVec.sub(this.selectVec);
    this.posVec.dot(this.deltaVec);

    var scale = this.entity.getLocalScale();
    
    var delta = this.posVec.length;
    this.scaleVec.x += delta;
    this.scaleVec.y += delta;
    this.scaleVec.z += delta;
    
    this.entity.setLocalScale(this.scaleVec);
};

Transform.prototype.onTouchStart = function (event) {
    if (this.inputEnabled) {
        var touch = event.touches[0];
        this.lastTouchPoint.set(touch.x, touch.y);
    }
};


Transform.prototype.onTouchMove = function (event) {
    if (this.inputEnabled) {
        var touch = event.touches[0];
        var dx = touch.x - this.lastTouchPoint.x;
        var dy = touch.y - this.lastTouchPoint.y;

        this.transform(touch.x, touch.y, dx, dy);

        this.lastTouchPoint.set(touch.x, touch.y);
    }
};

Transform.prototype.onMouseMove = function (event) {
    if (this.inputEnabled) {
        var mouse = this.app.mouse;
        if (mouse.isPressed(pc.MOUSEBUTTON_LEFT)) {
            this.transform(event.x, event.y, event.dx, event.dy);
        }
    }
};


Transform.prototype.enableInput = function () {
  this.inputEnabled = true;
};

Transform.prototype.disableInput = function () {
  this.inputEnabled = false;
};

Transform.prototype.modeMove = function () {
  this.mode = "move";
};

Transform.prototype.modeRotate = function () {
  this.mode = "rotate";
};

Transform.prototype.modeScale = function () {
  this.mode = "scale";
};

Transform.prototype.setEntity = function (entity) {
  this.entity = entity;
};