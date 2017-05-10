var Movement = pc.createScript('movement');

Movement.attributes.add('camera', {
    type: 'entity'
});

Movement.attributes.add('power', {
    type: 'number',
    default: 150
});

Movement.attributes.add('lookSpeed', {
    type: 'number',
    default: 0.5,
    title: 'Look Speed'
});

Movement.attributes.add('panSpeed', {
    type: 'number',
    default: 0.025,
    title: 'Pan Speed'
});

Movement.attributes.add('maxElevation', {
    type: 'number',
    default: 70
});

Movement.prototype.tileGrid = [];

Movement.prototype.isBodyFocused = function () {
    return document.activeElement == document.getElementsByTagName("BODY")[0];
}

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

// find simple offset (greater, equal, less) from center point in 1 dimension
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
    var app = this.app;     

    ////////////////////
    // Touch controls //
    ////////////////////
    this.inputEnabled = true;
    this.viewPos = new pc.Vec3();
    this.targetViewPos = new pc.Vec3();
    this.tempVec = new pc.Vec3();
    
    this.distance = 3;
    this.targetDistance = 3;

    this.rotX = -180;
    this.rotY = 0;
    this.targetRotX = 0;
    this.targetRotY = 0;
    this.quatX = new pc.Quat();
    this.quatY = new pc.Quat();

    this.transformStarted = false;

    var options = {
        prevent_default: true,
        drag_max_touches: 2,
        transform_min_scale: 0.08,
        transform_min_rotation: 180,
        transform_always_block: true,
        touch: true,
        transform: false,
        hold: false,
        release: false,
        swipe: false,
        tap: false
    };
    this.hammer = Hammer(app.graphicsDevice.canvas, options);
    
    // Orbit (1 finger) and pan (2 fingers)    
    var cachedX, cachedY;
    this.hammer.on("dragstart", function (event) {
        if (this.inputEnabled) {
            if (!this.transformStarted) {
                var gesture = event.gesture;
                var numTouches = (gesture.touches !== undefined) ? gesture.touches.length : 1;
                this.panning = (numTouches === 2);
                this.dragStarted = true;

                cachedX = gesture.center.pageX;
                cachedY = gesture.center.pageY;
            }
        }
    }.bind(this));
    this.hammer.on("dragend", function (event) {
        if (this.dragStarted) {
            this.dragStarted = false;
            this.panning = false;
        }
    }.bind(this));
    this.hammer.on("drag", function (event) {
        if (this.inputEnabled) {
            var gesture = event.gesture;
            var dx = gesture.center.pageX - cachedX;
            var dy = gesture.center.pageY - cachedY;
            if (this.panning) {
                this.pan(dx * -this.panSpeed, dy * this.panSpeed);
            } else {
                this.orbit(dx * this.lookSpeed, dy * this.lookSpeed);
            }
            cachedX = gesture.center.pageX;
            cachedY = gesture.center.pageY;
        }
    }.bind(this));

    app.mouse.on(pc.input.EVENT_MOUSEMOVE, this.onMouseMove, this);
    app.mouse.on(pc.input.EVENT_MOUSEWHEEL, this.onMouseWheel, this);

    app.mouse.disableContextMenu();
    
    // Infinite tile
    this.tile = this.app.root.findByName('Tile');
    this.range = 5; // how many location tiles out to draw from center tile
    this.scale = 50; // how large a tile is from edge to edge
    this.createTileGrid(this.range, this.scale);

    this.locationX = 0;  // current location
    this.locationZ = 0;

    this.locationBreadcrumbVector = [0, 0]; // vector from starting location to current location
    this.locationUpdateRange = 2;

    // FP start
    this.force = new pc.Vec3();     

    // Check for required components
    if (!this.entity.collision) {
        console.error("First Person Movement script needs to have a 'collision' component");
    }

    if (!this.entity.rigidbody || this.entity.rigidbody.type !== pc.BODYTYPE_DYNAMIC) {
        console.error("First Person Movement script needs to have a DYNAMIC 'rigidbody' component");
    }
    // FP end
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
    if (this.inputEnabled && this.isBodyFocused()) {
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
    }

    // use force last set by touch/mouse to force the character
    if ((force.x !== 0 || force.z !== 0) && this.isBodyFocused()) {
        this.entity.rigidbody.applyForce(force);
    }
    // use direction from keypresses to apply a force to the character
    if (x !== 0 || z !== 0) {
        force.set(x, 0, z).normalize().scale(this.power);
        this.entity.rigidbody.applyForce(force);
    }
    this.force.x = 0;
    this.force.z = 0;
    
    // View
    // Implement a delay in camera controls by lerping towards a target
    this.viewPos.lerp(this.viewPos, this.targetViewPos, dt / 0.1);
    this.distance = pc.math.lerp(this.distance, this.targetDistance, dt / 0.2);
    this.rotX = pc.math.lerp(this.rotX, this.targetRotX, dt / 0.2);
    this.rotY = pc.math.lerp(this.rotY, this.targetRotY, dt / 0.2);

    // Calculate the camera's rotation
    this.quatX.setFromAxisAngle(pc.Vec3.RIGHT, -this.rotY);
    this.quatY.setFromAxisAngle(pc.Vec3.UP, -this.rotX);
    this.quatY.mul(this.quatX);

    // Set the camera's current orientation
    //this.camera.setPosition(this.viewPos);
    this.camera.setRotation(this.quatY);
    //this.camera.translateLocal(0, 0, this.distance);

    // FP end

    // Infinite tile start
    var gridOffset = this.findGridOffset(this.entity.getLocalPosition(), this.range, this.scale);
//    console.log("grid offset: " + gridOffset.x + " " + gridOffset.z);

    // update current location square and update the name location div
    //  gridOffset is guaranteed be outside of range for only one pass because 
    //  the treadmill functions reset tileGrid, so next pass localposition will
    //  be inside the center tile (equal to range)
    this.locationX += gridOffset.x - this.range;
    this.locationZ += gridOffset.z - this.range;
    var locationNumber = MathUtils.zCantorPair(this.locationX, this.locationZ);
    var locationName = locationNumber.toString(36);
    $('#location-div').html(locationName);

    // send location update & get location info
    var sceneEntity = app.context.root.findByName("scene");
    var networkEntity = sceneEntity.script.network;

    this.locationBreadcrumbVector[0] += gridOffset.x - this.range;
    this.locationBreadcrumbVector[1] += gridOffset.z - this.range;
    if (  Math.abs(this.locationBreadcrumbVector[0]) > this.locationUpdateRange || 
          Math.abs(this.locationBreadcrumbVector[1]) > this.locationUpdateRange) {
        console.log("Location Update");

        // request for entities
        networkEntity.updateLocation();

        this.locationBreadcrumbVector = [0, 0];
    }

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
//            console.log(this.tileGrid[i][gridOffsetZ].getLocalPosition());
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

        
Movement.prototype.reset = function(target, distance) {
    this.viewPos.copy(target);
    this.targetViewPos.copy(target);

    this.distance = distance;
    this.targetDistance = distance;

    this.rotX = -180;
    this.rotY = 0;
    this.targetRotX = 0;
    this.targetRotY = 0;
};
            
Movement.prototype.pan = function(movex, movey) {
    // Pan around the entity in the XZ plane
      var forward = this.camera.forward;
      var right = this.camera.right;
      var x = - right.x * movex - forward.x * movey;
      var z = - right.z * movex - forward.z * movey;
      this.force.set(x, 0, z).normalize().scale(this.power);
};

Movement.prototype.orbit = function (movex, movey) {
    // Look around the character in XY plane
    this.targetRotX += movex;
    this.targetRotY += movey;
    this.targetRotY = pc.math.clamp(this.targetRotY, -this.maxElevation, this.maxElevation);
};

Movement.prototype.onMouseMove = function (event) {
    if (this.inputEnabled) {
      if (event.buttons[pc.input.MOUSEBUTTON_LEFT]) {
        this.orbit(event.dx * 0.2, event.dy * 0.2);
      } else if (event.buttons[pc.input.MOUSEBUTTON_RIGHT]) {
        var factor = this.distance / 700;
        this.pan(event.dx * -factor, event.dy * factor);
      }
    }
};

Movement.prototype.enableInput = function () {
  this.inputEnabled = true;
};

Movement.prototype.disableInput = function () {
  this.inputEnabled = false;
};