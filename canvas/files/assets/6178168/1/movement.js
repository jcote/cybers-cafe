var Movement = pc.createScript('movement');

// optional, assign a camera entity, otherwise one is created
Movement.attributes.add('camera', {
    type: 'entity'
});

Movement.attributes.add('power', {
    type: 'number'
});

Movement.attributes.add('lookSpeed', {
    type: 'number'
//    default: 0.25,
//    title: 'Look Speed'
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
console.log("player pos: " + point.x + " " + point.z);

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
    this.tile = this.app.root.findByName('Tile');
    this.range = 5;
    this.scale = 50;
    this.createTileGrid(this.range, this.scale);

    // FP start
    this.force = new pc.Vec3();
    this.camera = null;
    this.eulers = new pc.Vec3();
    
    var app = this.app;

    document.getElementById('drawer-icon-div').onmouseover = function () {
        this.mouseOverDrawerIcon = true;
    }

    document.getElementById('drawer-icon-div').onmouseout = function () {
        this.mouseOverDrawerIcon = false;
    }

    // Listen for mouse move events
    app.mouse.on("mousemove", this._onMouseMove, this);

    // when the mouse is clicked hide the cursor
    app.mouse.on("mousedown", function () {
        if (this.mouseOverDrawerIcon) {
            app.mouse.enablePointerLock();
        }
    }, this);            

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
    // If a camera isn't assigned from the Editor, create one
    if (!this.camera) {
        this._createCamera();
    }
    
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
    if (app.keyboard.isPressed(pc.KEY_A) || app.keyboard.isPressed(pc.KEY_Q)) {
        x -= right.x;
        z -= right.z;
    }

    if (app.keyboard.isPressed(pc.KEY_D)) {
        x += right.x;
        z += right.z;
    }

    if (app.keyboard.isPressed(pc.KEY_W)) {
        x += forward.x;
        z += forward.z;
    }

    if (app.keyboard.isPressed(pc.KEY_S)) {
        x -= forward.x;
        z -= forward.z;
    }

    // use direction from keypresses to apply a force to the character
    if (x !== 0 && z !== 0) {
        force.set(x, 0, z).normalize().scale(this.power);
        this.entity.rigidbody.applyForce(force);
    }

    // update camera angle from mouse events
    this.camera.setLocalEulerAngles(this.eulers.y, this.eulers.x, 0);
    // FP end

    // Infinite tile start
    var gridOffset = this.findGridOffset(this.entity.getLocalPosition(), this.range, this.scale);
    console.log("grid offset: " + gridOffset.x + " " + gridOffset.z);
    // TESTED ON RANGE 1 ONLY
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

Movement.prototype._createCamera = function () {
    // If user hasn't assigned a camera, create a new one
    this.camera = new pc.Entity();
    this.camera.setName("First Person Camera");
    this.camera.addComponent("camera");
    this.entity.addChild(this.camera);
    this.camera.translateLocal(0, 0.5, 0);
};