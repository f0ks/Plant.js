/* ======= TODO
    -collisons check (rectangle, ellipse)
    -opacity
*/
var plant = {

    Scene: function(options) {
        options = options || {};
        this.width = options.width || '320';
        this.height = options.height || '240';
        this.background = options.background || 'black';
        this.nodes = [];
        this.htmlNode = document.getElementById(options.htmlNodeId);
        if (this.htmlNode.getContext) {
            this.context = this.htmlNode.getContext('2d');
            this.htmlNode.width = options.width;
            this.htmlNode.height = options.height;
        }

    },

    Rectangle: function(options) {
        options = options || {};
        this.width = options.width || 50;
        this.height = options.height || 50;
        this.color = options.color || 'white';
        this.x = options.x || 0;
        this.y = options.y || 0;
        this.zindex = options.zindex || 1;
        this.visible = options.visible || true;
        this.type = function() {
            return 'rectangle';
        };
    },

    Ellipse: function(options) {
        options = options || {};
        this.width = options.width || 50;
        this.height = options.height || 50;
        this.color = options.color || 'white';
        this.x = options.x || 0;
        this.y = options.y || 0;
        this.zindex = options.zindex || 1;
        this.visible = options.visible || true;
        this.type = function() {
            return 'ellipse';
        };
    },

    Sprite: function(options) {

        this.node = new Image();

        // src option required
        this.src = options.src;

        this.width = options.width || 50;
        this.height = options.height || 50;
        this.frameWidth = options.frameWidth || 50;
        this.frameHeight = options.frameHeight || 50;

        // current x and y frames
        this.xFrame = options.xFrame || 0;
        this.yFrame = options.yFrame || 0;

        this.x = options.x || 0;
        this.y = options.y || 0;

        this.zindex = options.zindex || 1;
        this.visible = options.visible || true;
        
        this.type = function() {
            return 'sprite';
        };
    },

    Text: function(options) {
        options = options || {};
        this.font = options.font || '12pt sans-serif';
        this.color = options.color || 'white';
        this.x = options.x || 0;
        this.y = options.y || 0;

        this.text = options.text || '';

        this.zindex = options.zindex || 1;
        this.visible = options.visible || true;

        this.type = function() {
            return 'text';
        };
    },

    Collision: function(obj1, obj2) {

        var x1 = obj1.x;
        var y1 = obj1.y;
        var w1 = obj1.width;
        var h1 = obj1.height;

        var x2 = obj2.x;
        var y2 = obj2.y;
        var w2 = obj2.width;
        var h2 = obj2.height;

        w2 += x2;
        w1 += x1;

        if (x2 > w1 || x1 > w2) {
            return false;
        }

        h2 += y2;
        h1 += y1;

        if (y2 > h1 || y1 > h2) {
            return false;
        }

        return true;
    }
        
};


plant.Scene.prototype.update = function() {

    // clear canvas
    this.context.fillStyle = this.background;
    this.context.fillRect(0, 0, this.htmlNode.width, this.htmlNode.height);

    // sort objects by zindexes
    this.nodes = PlantSortByIndexes('zindex', this.nodes);

    for(var i=0; i < this.nodes.length; i++) {

        var T = this.nodes[i];
        var ctx = this.context;
        
        if (T.visible === true) {
            switch(T.type()) {

                case 'rectangle':
                    ctx.fillStyle = T.color;
                    ctx.fillRect(T.x, T.y, T.width, T.height);
                break;

                case 'ellipse':
                    ctx.fillStyle = T.color;
                    var kappa = .5522848;
                    var ox = (T.width / 2) * kappa;
                    var oy = (T.height / 2) * kappa;
                    var xe = T.x + T.width;
                    var ye = T.y + T.height;
                    var xm = T.x + T.width / 2;
                    var ym = T.y + T.height / 2;

                    ctx.beginPath();
                    ctx.moveTo(T.x, ym);
                    ctx.bezierCurveTo(T.x, ym - oy, xm - ox, T.y, xm, T.y);
                    ctx.bezierCurveTo(xm + ox, T.y, xe, ym - oy, xe, ym);
                    ctx.bezierCurveTo(xe, ym + oy, xm + ox, ye, xm, ye);
                    ctx.bezierCurveTo(xm - ox, ye, T.x, ym + oy, T.x, ym);
                    ctx.closePath();
                    ctx.fill();
                break;

                case 'sprite':
                    T.node.src = T.src;
                    var sx = T.frameWidth * T.xFrame;
                    var sy = T.frameHeight * T.yFrame;
                    ctx.drawImage(T.node, sx, sy, T.frameWidth, T.frameHeight, T.x, T.y, T.width, T.height);
                break;

                case 'text':
                    ctx.font = T.font;
                    ctx.fillStyle = T.color;
                    ctx.textBaseline = 'top';
                    ctx.fillText(T.text, T.x, T.y);
                break;

                default:
                    /* nop */
                break;
            }
        }
    }
}

plant.Scene.prototype.addChild = function(child) {
    if (child.type == 'sprite') {
        child.node.src = child.src;
    }
    this.nodes.push(child);
}

var PlantSortByIndexes = function (prop, arr) {
    prop = prop.split('.');
    var len = prop.length;

    arr.sort(function (a, b) {
        var i = 0;
        while( i < len ) { a = a[prop[i]]; b = b[prop[i]]; i++; }
        if (a < b) {
            return -1;
        } else if (a > b) {
            return 1;
        } else {
            return 0;
        }
    });
    return arr;
};

