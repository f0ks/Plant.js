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

plant = {

    Scene: function(options) {
        this.width = options.width || 320;
        this.height = options.height || 240;
        this.nodes = [];
        this.htmlNode = document.getElementById(options.htmlNodeId);
        if (this.htmlNode.getContext) {
            this.context = this.htmlNode.getContext('2d');
            this.htmlNode.width = options.width;
            this.htmlNode.height = options.height;
        }
    },

    primitives: Object =  {

        Rectangle: function(options) {
            options = options || {};
            this.width = options.width || 50;
            this.height = options.height || 50;
            this.color = options.color || 'white';
            this.x = options.x || 0;
            this.y = options.y || 0;
            this.index = options.index || 1;
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
            this.index = options.index || 1;
            this.type = function() {
                return 'ellipse';
            };
        },
        Sprite: function(options) {

            //required
            this.src = options.src;
            this.node = new Image();

            this.width = options.width || 50;
            this.height = options.height || 50;
            this.x = options.x || 0;
            this.y = options.y || 0;
            this.index = options.index || 1;
            this.type = function() {
                return 'sprite';
            };


        },
        AnimatedSprite: function(options) {

            // required
            this.node = new Image();
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

            this.index = options.index || 1;
            
            this.type = function() {
                return 'animatedsprite';
            };
        },

    },

        
};


plant.Scene.prototype.update = function() {

    this.nodes = PlantSortByIndexes('index', this.nodes);

    for(var i=0; i < this.nodes.length; i++) {

        var T = this.nodes[i];
        var ctx = this.context;
        
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
                ctx.drawImage(T.node, T.x, T.y, T.width, T.height);
            break;

            case 'animatedsprite':
                T.node.src = T.src;
                var sx = T.frameWidth * T.xFrame;
                var sy = T.frameHeight * T.yFrame;
                ctx.drawImage(T.node, sx, sy, T.frameWidth, T.frameHeight, T.x, T.y, T.width, T.height);
                //ctx.drawImage(T.node, 1, 1, 15, 25, 1, 1, 15, 25);
            break;

            default:
                /* nop */
            break;
        }
    }
}

plant.Scene.prototype.addChild = function(child) {
    if (child.type == 'sprite') {
        child.node.src = child.src;
    }
    this.nodes.push(child);
}

plant.Scene.prototype.fillBackground = function(color) {
    this.context.fillStyle = color;
    this.context.fillRect(0, 0, this.htmlNode.width, this.htmlNode.height);
}
