var Transform = pc.createScript('transform');

Transform.attributes.add('cameraEntity', {type: 'entity', title: 'Camera Entity'});
Transform.attributes.add('translateSensitivity', {
    type: 'number', 
    default: 0.03, 
    title: 'Translate Sensitivity', 
    description: 'How fast the entity moves around the space. Higher is faster'
});
Transform.attributes.add('orbitSensitivity', {
    type: 'number', 
    default: 0.3, 
    title: 'Orbit Sensitivity', 
    description: 'How fast the entity moves around the orbit. Higher is faster'
});
Transform.attributes.add('scaleSensitivity', {
    type: 'number', 
    default: 0.003, 
    title: 'Scale Sensitivity', 
    description: 'How fast the entity grows and shrinks. Higher is faster'
});

// initialize code called once per entity
Transform.prototype.initialize = function() {
    this.inputEnabled = false;
    
    this.mode = "move"; // or "rotate" or "scale"
    
    this.app.mouse.on(pc.EVENT_MOUSEMOVE, this.onMouseMove, this);
    this.app.mouse.on(pc.EVENT_MOUSEUP, this.onMouseUp, this);
    
    this.lastTouchPoint = new pc.Vec2();
    if (this.app.touch) {
        this.app.touch.on(pc.EVENT_TOUCHSTART, this.onTouchStart, this);
        this.app.touch.on(pc.EVENT_TOUCHMOVE, this.onTouchMove, this);        
    }

    this.lastScaleLength = NaN;
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
    var moveVec = Transform.moveVec;
    moveVec.x = dx * this.translateSensitivity;
    if (this.app.keyboard.isPressed(pc.KEY_SHIFT)) {
      moveVec.y = - dy * this.translateSensitivity;
      moveVec.z = 0;
    } else {
      moveVec.y = 0;
      moveVec.z = dy * this.translateSensitivity;
    }
    
    this.entity.translate(moveVec);
    this.fire("move", this.entity.id);
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
    this.fire("rotate", this.entity.id);
};

Transform.selectVec = new pc.Vec2();
Transform.posVec = new pc.Vec2();
Transform.deltaVec = new pc.Vec2();

Transform.prototype.scale = function (x, y, dx, dy) {
    var selectVec = Transform.selectVec;
    var posVec = Transform.posVec;
    var deltaVec = Transform.deltaVec;

    selectVec.x = x;
    selectVec.y = y;
    deltaVec.x = dx;
    deltaVec.y = dy;

    // obtain entity center position in 2d (mouse) space
    var screenVec = this.cameraEntity.camera.worldToScreen(this.entity.getPosition());
    posVec.x = screenVec.x;
    posVec.y = screenVec.y;

    // obtain vector from entity center to selection point
    posVec.sub(selectVec);
    
    if (!isNaN(this.lastScaleLength)) {
        var delta = posVec.length() - this.lastScaleLength;
        delta *= this.scaleSensitivity;
        var scaleVec = this.entity.getLocalScale();
        scaleVec.x += delta;
        scaleVec.y += delta;
        scaleVec.z += delta;
        
        this.entity.setLocalScale(scaleVec);
        this.fire("scale", this.entity.id);
    }
    this.lastScaleLength = posVec.length();
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

Transform.prototype.onMouseUp = function (event) {
    this.lastScaleLength = NaN;
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