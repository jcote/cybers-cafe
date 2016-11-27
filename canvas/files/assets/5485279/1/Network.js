var Network = pc.createScript('network');

// static variables
Network.id = null;
Network.socket = null;
Network.gotEntity = false;

// initialize code called once per entity
Network.prototype.initialize = function() {
    this.player = this.app.root.findByName('Player');
    this.other = this.app.root.findByName('Other');

    var socket = io.connect('http://service.cybers.cafe:59595/');
    Network.socket = socket;

    socket.emit ('initialize');

    var self = this;
    socket.on ('playerData', function (data) {
        console.log('Connected.');
        self.initializePlayers (data);
    });

    socket.on ('playerJoined', function (data) {
        self.addPlayer(data);
    });

    socket.on ('playerMoved', function (data) {
        self.movePlayer(data);
    });

    socket.on ('killPlayer', function (data) {
        self.removePlayer(data);
    });

    socket.on ('addEntity', function (data) {
        console.log('Add Entity');
        self.addEntity (data.entity);
    });

    setInterval (function () {
        if (self.initialized) {
            socket.emit('ping', Network.id);
            console.log('pinged as #' + Network.id);
        }
    }, 1000);
};

Network.prototype.initializePlayers = function (data) {
    this.players = data.players;
    Network.id = data.id;

    for (i = 0; i < this.players.length; i++) {
        if (i !== Network.id && !this.players[i].deleted) {
            this.players[i].entity = this.createPlayerEntity(data.players[i]);
            console.log('Found player.');
        }
        console.log(data);
    }

    this.initialized = true;
    console.log('initialized');
};

Network.prototype.addPlayer = function (data) {
    this.players.push(data);
    this.players[this.players.length - 1].entity = this.createPlayerEntity();
};

Network.prototype.movePlayer = function (data) {
    if (this.initialized && !this.players[data.id].deleted) {
        this.players[data.id].entity.rigidbody.teleport(data.x, data.y, data.z);
    }
};

Network.prototype.removePlayer = function (data) {
    if (this.players[data].entity) {
        this.players[data].entity.destroy ();
        this.players[data].deleted = true;
    }
};

Network.prototype.createPlayerEntity = function (data) {
    var newPlayer = this.other.clone();
    newPlayer.enabled = true;

    this.other.getParent().addChild(newPlayer);

    if (data)
        newPlayer.rigidbody.teleport(data.x, data.y, data.z);

    return newPlayer;
};

// update code called every frame
Network.prototype.update = function(dt) {
    this.updatePosition();
    this.getEntity();
};

Network.prototype.updatePosition = function () {
    if (this.initialized) {
        var pos = this.player.getPosition();
        Network.socket.emit('positionUpdate', {id: Network.id, x: pos.x, y: pos.y, z: pos.z});
    }
};

Network.prototype.getEntity = function () {
    if (!this.gotEntity) {
        Network.socket.emit('getEntity', {});
        this.gotEntity = true;
    }
};

Network.prototype.addEntity = function(data) {
    console.log('Entity Added');
    var children = data.children;
    delete data.children;
    var entity = jQuery.extend(true, new pc.Entity(), data);
    
    // from playcanvas entity.js: clone()
    if (data.children instanceof Array) {
        var i;
        for (i = 0; i < data.children.length; i++) {
            var child = data.children[i];
            if (child instanceof pc.Entity) {
                entity.addChild(child.clone());
            }
        }
    }

    this.app.root.addChild(entity);

};

Network.prototype.addAsset = function(data) {
    console.log('Asset Added');
    // from playcanvas' application.js: _parseAssets()
    var asset = new pc.Asset(data.name, data.type, data.file, data.data);
    asset.id = parseInt(data.id);
    asset.preload = data.preload ? data.preload : false;
    // tags
    asset.tags.add(data.tags);
    // registry
    this.app.assets.add(asset);
};