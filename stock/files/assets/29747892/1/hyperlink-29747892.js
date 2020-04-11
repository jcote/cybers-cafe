var Hyperlink = pc.createScript('hyperlink-29747892');

Hyperlink.attributes.add('text', { type: 'string', default: 'Hello World'});

Hyperlink.prototype.initialize = function () {
    // Create a canvas to do the text rendering
    this.canvas = document.createElement('canvas');
    this.canvas.height = 128;
    this.canvas.width = 512;
    this.context = this.canvas.getContext('2d');

    this.texture = new pc.Texture(this.app.graphicsDevice, {
        format: pc.PIXELFORMAT_R8_G8_B8,
        autoMipmap: true
    });
    this.texture.setSource(this.canvas);
    this.texture.minFilter = pc.FILTER_LINEAR_MIPMAP_LINEAR;
    this.texture.magFilter = pc.FILTER_LINEAR;
    this.texture.addressU = pc.ADDRESS_CLAMP_TO_EDGE;
    this.texture.addressV = pc.ADDRESS_CLAMP_TO_EDGE;

    this.updateText();

    var material = this.entity.model.material;
    material.emissiveMap = this.texture;
    material.opacityMap = this.texture;
    material.blendType = pc.BLEND_NORMAL;
    material.update();
    
    this.on('attr', function (name, value, prev) {
        this.updateText();
    });
};

Hyperlink.prototype.updateText = function () {
    var ctx = this.context;
    var w = ctx.canvas.width;
    var h = ctx.canvas.height;

    // Clear the context to transparent
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, w, h);

    // Write white text
    ctx.fillStyle = 'white';
    ctx.font = 'bold 70px Verdana';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.text, w / 2, h / 2);

    // Copy the canvas into the texture
    this.texture.upload();
};