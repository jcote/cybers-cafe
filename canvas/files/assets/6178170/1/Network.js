var Network = pc.createScript('network');

// static variables
Network.id = null;
Network.socket = null;
Network.scale = 50; // size of XZ tiles. MUST BE THE SAME AS IN movement.js

function QueueItem(type, resource) {
	this.type = type;
	this.resource = resource;
}

// initialize code called once per entity
Network.prototype.initialize = function() {
    this.player = this.app.root.findByName('Player');
    this.other = this.app.root.findByName('Other');

    this.queue = new Queue();
    this.isQueueRunning = false;
    this.progress = 0;
    this.progressExpected = 0;

    this.origin = [0, 0]; // what XZ location to consider the tile at 0,0

    var socket = io.connect('http://service.cybers.cafe:59595/');
    Network.socket = socket;

    this.app.entities = {};

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

    socket.on ('playerDropped', function (data) {
        self.removePlayer(data);
    });
    
    socket.on ('expect', function (data) {
        self.progressExpected += data;
    });

    socket.on ('addAsset', function (data) {
        console.log('Add Asset');
        if (!self.app.assets.get(data.asset.id)) {
	        self.queue.enqueue(new QueueItem('asset', data.asset));
	        if (!self.isQueueRunning) {
	            self.popQueue();
	        }
	      }
    });

    socket.on ('addEntity', function (data) {
        console.log('Add Entity');
        if (!(data.entity.id in self.app.entities)) {
	        self.queue.enqueue(new QueueItem('entity', data.entity));
	        if (!self.isQueueRunning) {
	            self.popQueue();
	        }
	      }
    });

    setInterval (function () {
        if (self.initialized) {
            socket.emit('ping', Network.id);
//            console.log('pinged as #' + Network.id);
        }
    }, 1000);
};

Network.prototype.initializePlayers = function (data) {
    this.players = data.players;
    Network.id = data.id;

    for (i = 0; i < this.players.length; i++) {
        if (i !== Network.id && !this.players[i].deleted) {
            this.players[i].entity = this.createPlayerEntity(data.players[i]);
        }
    }

    this.initialized = true;
    console.log('initialized');
};

Network.prototype.addPlayer = function (data) {
    this.players.push(data);
    this.players[this.players.length - 1].entity = this.createPlayerEntity();
};

Network.prototype.movePlayer = function (data) {
    if (this.initialized && this.players[data.id] && !this.players[data.id].deleted) {
    	  var relativePosition = MathUtils.getRelativePosition(data.location, data.position, this.origin, Network.scale);
        this.players[data.id].entity.rigidbody.teleport(relativePosition[0], relativePosition[1], relativePosition[2]);
    }
};

Network.prototype.removePlayer = function (data) {
    if (data in this.players && this.players[data].entity) {
        this.players[data].entity.destroy ();
        delete this.players[data];
    }
};

Network.prototype.createPlayerEntity = function (data) {
    var newPlayer = this.other.clone();
    newPlayer.enabled = true;

    this.other.getParent().addChild(newPlayer);

    if (data) {
    	  var relativePosition = MathUtils.getRelativePosition(data.location, data.position, this.origin, Network.scale);
        newPlayer.rigidbody.teleport(relativePosition[0], relativePosition[1], relativePosition[2]);
    }
    return newPlayer;
};

// update code called every frame
Network.prototype.update = function(dt) {
    this.updatePosition();
};

Network.prototype.updatePosition = function () {
    if (this.initialized) {
        var pos = this.player.getPosition();
        var absolutePosition = MathUtils.getAbsolutePosition(pos.data, this.origin, Network.scale);
        Network.socket.emit('positionUpdate', {
        	id: Network.id, 
        	location: absolutePosition.location, 
        	position: absolutePosition.position
        });
    }
};

Network.prototype.updateLocation = function () {
    if (this.initialized) {
        var pos = this.player.getPosition();
        var absolutePosition = MathUtils.getAbsolutePosition(pos.data, this.origin, Network.scale);
        console.log("Update location: " + absolutePosition.location);
        Network.socket.emit('locationUpdate', {
        	location: absolutePosition.location
        });
    }
};

Network.prototype.popQueue = function() {
	if (this.queue.getLength() === 0) {
		this.isQueueRunning = false;

		var self = this;
		setTimeout(function(){
			if (!self.isQueueRunning) {
				self.progress = 0;
			  self.progressExpected = 0;
	      $('#progress-inner-div').attr('aria-valuenow', 100).css('width','100%');
	      setTimeout(function(){
			    $('#progress-div').css('visibility', 'hidden');
			  },2000);
			}			
		},10000);

    return;
	}

	if (!this.isQueueRunning) {
		$('#progress-inner-div').attr('aria-valuenow', 0).css('width',0);
		$('#progress-div').css('visibility', 'visible');
	}

	this.isQueueRunning = true;

  this.progress++;
  if (this.progressExpected) {
  	var percent = this.progress / this.progressExpected * 100;
	  $('#progress-inner-div').attr('aria-valuenow', percent).css('width',percent + '%');
  }

	var queueItem = this.queue.dequeue();
	if (queueItem.type == 'asset') {
        this.addAsset (queueItem.resource);
    } else if (queueItem.type == 'entity') {
        this.addEntity (queueItem.resource);
    } else {
    	console.log("Unknown QueueItem type: " + queueItem.type);
    	this.popQueue();
    }
};

Network.prototype.addAsset = function(data) {
    // from playcanvas application.js: _parseAssets()
    var asset = new pc.Asset(data.name, data.type, data.file, data.data);
    asset.id = parseInt(data.id);
    asset.preload = data.preload ? data.preload : false;
    asset.tags.add(data.tags);
    asset.revision = data.revision;

    try {
      this.app.assets.add(asset);
    } catch (err) {
    	console.log("Asset error: " + err);
    }
//    console.log('Asset Added');
//    console.log(data);
    
    var self = this;
    var onAssetLoad = function() {
        self.popQueue();
    };
    
    if (asset.resource) {
        // The asset has already been loaded 
        onAssetLoad();
    } else {
        // Start async loading the asset
        asset.once('load', onAssetLoad);
        try {
          this.app.assets.load(asset);
        } catch (err) {
        	console.log("Asset error: " + err);
        }
    }
};

Network.prototype.addEntity = function(data) {
    var entity = new pc.Entity();

    // from playcanvas entity.js: clone()
/*    if (data.children instanceof Array) {
        var i;
        for (i = 0; i < data.children.length; i++) {
            var child = data.children[i];
            if (child instanceof pc.Entity) {
                entity.addChild(child.clone());
            }
        }
    }
*/

    for (var component in data.components) {
    	if (component == "camera") {
    		continue;
    	}
        entity.addComponent(component, data.components[component]);
    }

    entity.id = data.id;
    entity.objectId = data.objectId;
    entity.name = data.name;

    var relativePosition = MathUtils.getRelativePosition(data.location, data.position, this.origin, Network.scale);
    entity.setLocalPosition(relativePosition[0],relativePosition[1],relativePosition[2]);
    entity.setLocalScale(data.scale[0],data.scale[1],data.scale[2]);
    entity.setEulerAngles(data.rotation[0],data.rotation[1],data.rotation[2]);
    if (entity.rigidbody) {
      entity.rigidbody.teleport(relativePosition[0],relativePosition[1],relativePosition[2]);
    }
    this.app.root.addChild(entity);
    this.app.entities[entity.id] = entity;

//    console.log('Entity Added');
//    console.log(data);
    this.popQueue();
};
