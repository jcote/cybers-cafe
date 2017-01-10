var Movement = pc.createScript('movement');

Movement.attributes.add('camera', {
    type: 'entity'
});

Movement.attributes.add('keyPower', {
    type: 'number'
});

Movement.attributes.add('touchPower', {
    type: 'number'
});

Movement.attributes.add('lookSpeed', {
    type: 'number',
    default: 0.25,
    title: 'Look Speed'
});

Movement.prototype.tileGrid = [];

// Figure out which tile the point is in
// Return array offsets as x and z
Movement.prototype.findGridOffset = function (point, range, scale) {
    var centerTile = this.tileGrid[range][range];
    var centerTilePosition = centerTile.getLocalPosition();
    var halfScale = scale / 2;
    var offset = {};
    
//console.log("one pos: " + this.tileGrid[1][1].getLocalPosition().x + " " + this.tileGrid[0][1].getLocalPosition().z);
//console.log("center pos: " + centerTilePosition.x + " " + centerTilePosition.z);
//console.log("two pos: " + this.tileGrid[2][1].getLocalPosition().x + " " + this.tileGrid[2][1].getLocalPosition().z);
//console.log("player pos: " + point.x + " " + point.z);

    offset.x = findOffset(point.x, centerTilePosition.x, range, halfScale);
    offset.z = findOffset(point.z, centerTilePosition.z, range, halfScale);
    return offset;
};

// find offset in 1 dimension
function findOffset (point, center, range, halfScale) {
    if (point < center - halfScale) {
        return range - 1;
    } else if (point > center + halfScale) {
        return range + 1;
    } else {
        return range;
    }
}

Movement.prototype.createTileEntity = function (data) {
    var newTile = this.tile.clone();
    newTile.enabled = true;

    this.tile.getParent().addChild(newTile);

    if (data)
        newTile.rigidbody.teleport(data.x, data.y, data.z);

    return newTile;
};

Movement.prototype.createTileGrid = function (range, scale) {
    for (var i = 0; i <= 2 * range; i++) {
        this.tileGrid[i] = [];
        for (var j = 0; j <= 2 * range; j++) {
            posX = (i - range) * scale;
            posZ = (j - range) * scale;
            var tileEntity = this.createTileEntity({x:posX, y:0, z:posZ});
            this.tileGrid[i][j] = tileEntity;
        }
    }
};

// initialize code called once per entity
Movement.prototype.initialize = function() {
    //  Infinite Tile start
    this.tile = this.app.root.findByName('Tile');
    this.range = 5;
    this.scale = 50;
    this.createTileGrid(this.range, this.scale);
    // Infinite Tile end

    // FP start
    this.force = new pc.Vec3();
    this.eulers = new pc.Vec3();
    
    var app = this.app;
    
    // Listen for mouse move events
    app.mouse.on("mousemove", this._onMouseMove, this);

    // when the mouse is clicked hide the cursor
    app.mouse.on("mousedown", function () {
        app.mouse.enablePointerLock();
    }, this);            

    // Check for required components
    if (!this.entity.collision) {
        console.error("First Person Movement script needs to have a 'collision' component");
    }

    if (!this.entity.rigidbody || this.entity.rigidbody.type !== pc.BODYTYPE_DYNAMIC) {
        console.error("First Person Movement script needs to have a DYNAMIC 'rigidbody' component");
    }
    // FP end

    this.lastTouch = null;
    this.lastSecondTouch = null;
    
    this.touchForce = new pc.Vec3();
        
    // Percentage of lookDelay time that has elapsed or lingered
    this.lookDelayPercent = 0;

    // Only register touch events if the device supports touch
    var touch = this.app.touch;
    if (touch) {
        touch.on(pc.EVENT_TOUCHSTART, this.onTouchStart, this);
        touch.on(pc.EVENT_TOUCHMOVE, this.onTouchMove, this);
        touch.on(pc.EVENT_TOUCHEND, this.onTouchEnd, this);
        touch.on(pc.EVENT_TOUCHCANCEL, this.onTouchCancel, this);
    }
};

// update code called every frame
Movement.prototype.update = function(dt) {
    // FP start    
    var force = this.force;
    var app = this.app;

    // Get camera directions to determine movement directions
    var forward = this.camera.forward;
    var right = this.camera.right;
       

    // movement
    var x = 0;
    var z = 0;

    // Use W-A-S-D keys to move player
    // Check for key presses
    if (app.keyboard.isPressed(pc.KEY_A) || app.keyboard.isPressed(pc.KEY_LEFT)) {
        x -= right.x;
        z -= right.z;
    }

    if (app.keyboard.isPressed(pc.KEY_D) || app.keyboard.isPressed(pc.KEY_RIGHT)) {
        x += right.x;
        z += right.z;
    }

    if (app.keyboard.isPressed(pc.KEY_W) || app.keyboard.isPressed(pc.KEY_UP)) {
        x += forward.x;
        z += forward.z;
    }

    if (app.keyboard.isPressed(pc.KEY_S) || app.keyboard.isPressed(pc.KEY_DOWN)) {
        x -= forward.x;
        z -= forward.z;
    }

    // use direction from keypresses to apply a force to the character
    if (x !== 0 && z !== 0) {
        force.set(x, 0, z).normalize().scale(this.keyPower);
        this.entity.rigidbody.applyForce(force);
    }

    // update camera angle from mouse and touch events
    this.camera.setLocalEulerAngles(this.eulers.y, this.eulers.x, 0);
        
    // Touch movement
    if (this.app.touch) {
        this.entity.rigidbody.applyForce(this.touchForce);
    }
    // FP end

    // Infinite tile start
    var gridOffset = this.findGridOffset(this.entity.getLocalPosition(), this.range, this.scale);
    console.log("grid offset: " + gridOffset.x + " " + gridOffset.z);

    this.treadmillX(gridOffset.x);
    this.treadmillZ(gridOffset.z);
    // Infinite tile end 
};

Movement.prototype.treadmillX = function(gridOffsetX) {
    if (gridOffsetX != this.range) {
        console.log("begin tile shuffle X");
        var tileGridTmp = [];
        // get closest row's position
        var closePos = [];
        for (var i = 0; i <= this.range * 2; i++) {
            closePos[i] = this.tileGrid[gridOffsetX][i].getLocalPosition().clone();
        }
        // add or subtract a range based on what tile the player is now on
        var sign = gridOffsetX > this.range ? 1 : -1;
        var offset = this.scale * this.range * sign;
        for (i = 0; i <= this.range * 2; i++) {
            closePos[i].x += offset;
        }
        // use closest row's previous position in tileGrid for teleported row
        var close = this.range + this.range * sign;
        var far = this.range - this.range * sign;
        // use far row objects and place them in front of player
        tileGridTmp[close] = this.tileGrid[far];
        for (i = 0; i <= this.range * 2; i++) {
            tileGridTmp[close][i].setLocalPosition(closePos[i]);
            tileGridTmp[close][i].rigidbody.teleport(closePos[i]);            
        }
        // shift remaining (nonfar) rows back in tileGrid
        for (i = 1; i <= this.range * 2; i++) {
            if (sign > 0) {
              tileGridTmp[this.range * 2 - i] = this.tileGrid[this.range * 2 - i + 1];  
            } else {
              tileGridTmp[i] = this.tileGrid[i-1];
            }
        }
        // swap in tileGridTmp 
        // (do this incase frame rate is so high that findGridOffset is called before this logic finishes)
        this.tileGrid = tileGridTmp;
        console.log("finished tile shuffle X");
    }
};

Movement.prototype.treadmillZ = function(gridOffsetZ) {
    if (gridOffsetZ != this.range) {
        console.log("begin tile shuffle Z");
        var tileGridTmp = [];
        // get closest column's position
        var closePos = [];
        for (var i = 0; i <= this.range * 2; i++) {
            console.log(this.tileGrid[i][gridOffsetZ].getLocalPosition());
            closePos[i] = this.tileGrid[i][gridOffsetZ].getLocalPosition().clone();
        }
        // add or subtract a range based on what tile the player is now on
        var sign = gridOffsetZ > this.range ? 1 : -1;
        var offset = this.scale * this.range * sign;
        for (i = 0; i <= this.range * 2; i++) {
            closePos[i].z += offset;
        }
        // use closest column's previous position in tileGrid for teleported column
        var close = this.range + this.range * sign;
        var far = this.range - this.range * sign;
        // use far column objects and place them in front of player
        for (i = 0; i <= this.range * 2; i++) {
            tileGridTmp[i] = [];
            tileGridTmp[i][close] = this.tileGrid[i][far];
//            console.log(this.tileGrid[i][far]);
            tileGridTmp[i][close].setLocalPosition(closePos[i]);
            tileGridTmp[i][close].rigidbody.teleport(closePos[i]);            
        }
        // shift closest (nonfar) columns back in tileGrid
        for (i = 1; i <= this.range * 2; i++) {
            if (sign > 0) {
                for (j = 0; j <= this.range * 2; j++) {
                    tileGridTmp[j][this.range * 2 - i] = this.tileGrid[j][this.range * 2 - i + 1];
                }
            } else {
                for (j = 0; j <= this.range * 2; j++) {
                    tileGridTmp[j][i] = this.tileGrid[j][i-1];
                }
            }
        }
        // swap in tileGridTmp 
        // (do this incase frame rate is so high that findGridOffset is called before this logic finishes)
        this.tileGrid = tileGridTmp;
        console.log("finished tile shuffle Z");
    }
};


Movement.prototype._onMouseMove = function (e) {
    // If pointer is disabled
    // If the left mouse button is down update the camera from mouse movement
    if (pc.Mouse.isPointerLocked() || e.buttons[0]) {
        this.eulers.x -= this.lookSpeed * e.dx;
        this.eulers.y -= this.lookSpeed * e.dy;
    }            
};

Movement.prototype.onTouchStart = function (event) {
    if (event.touches.length === 1) {
        this.lastTouch = event.touches[0];
    } else {
        this.lastTouch = event.touches[0];
        this.lastSecondTouch = event.touches[1];
    }
};


Movement.prototype.onTouchMove = function (event) {
    // Use only the first touch screen x y position to move the camera
    var touch = event.touches[0];
    var dx = touch.x - this.lastTouch.x;
    var dy = touch.y - this.lastTouch.y;
    if (event.touches.length == 1) {
      this.eulers.x -= this.lookSpeed * dx;
      this.eulers.y -= this.lookSpeed * dy;
    } else {
      // Use two touch to control movement
      var touch2 = event.touches[1];
      var dx2 = touch2.x - this.lastSecondTouch.x;
      var dy2 = touch2.y - this.lastSecondTouch.y;
      var dxAvg = (dx + dx2) / 2;
      var dyAvg = (dy + dy2) / 2;
      var forward = this.camera.forward;
      var right = this.camera.right;
      var x = right.x * dxAvg - forward.x * dyAvg;
      var z = right.z * dxAvg - forward.z * dyAvg;
      this.touchForce.set(x, 0, z).normalize().scale(this.touchPower);
      this.lastSecondTouch = touch2;
    }
    this.lastTouch = touch;
};


Movement.prototype.onTouchEnd = function (event) {
    if (event.touches.length === 0) {
        // Change only if the last touch has ended
        this.lastTouch = null;
    } else if (event.touches.length === 1) {
        // Change only if the second to last touch has ended
        this.lastSecondTouch = null;
        this.touchForce.x = 0;
        this.touchForce.y = 0;
        this.touchForce.z = 0;
    }
};


Movement.prototype.onTouchCancel = function (event) {
    if (event.touches.length === 0) {
        // Change only if the last touch has ended
        this.lastTouch = null;
    } else if (event.touches.length === 1) {
        // Change only if the second to last touch has ended
        this.lastSecondTouch = null;
        this.touchForce.x = 0;
        this.touchForce.y = 0;
        this.touchForce.z = 0;
    }
};