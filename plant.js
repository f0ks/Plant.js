/*

Written by Albert Khamidullin. February 2011.

*/

var plant = {

    Scene: function(options) {
        
        if (options.width !== undefined) {
            this.width = options.width;
        } else {
            this.width = 320;
        }

        if (options.height !== undefined) {
            this.height = options.height;
        } else {
            this.height = 240;
        }

        if (options.background !== undefined) {
            this.background = options.background;
        } else {
            this.background = 'black';
        }
        
        // canvas id is a mandatory option
        this.htmlNode = document.getElementById(options.htmlNodeId);

        this.nodes = [];
        this.mouseX = 0;
        this.mouseY = 0;

        this.onClick = function() {
            // nop
        };

        if (this.htmlNode.getContext) {
            this.context = this.htmlNode.getContext('2d');
            this.htmlNode.width = this.width;
            this.htmlNode.height = this.height;
        }

        var curScene = this;
        this.htmlNode.addEventListener('mousemove', function(e) {
            curScene.mouseX = e.clientX - curScene.htmlNode.offsetLeft;
            curScene.mouseY = e.clientY - curScene.htmlNode.offsetTop;
        }, false);
        
        this.htmlNode.addEventListener('click', function(e) {
            
            // first check if whole scene have onClick event attached
            if (typeof(curScene.onClick) === 'function') {
                curScene.onClick();
            }

            var curX = e.clientX - curScene.htmlNode.offsetLeft;
            var curY = e.clientY - curScene.htmlNode.offsetTop;

            var x1 = curX;
            var y1 = curY;

            var w1;
            var h1;

            for (var i = 0; i < curScene.nodes.length; i++) {

                var T = curScene.nodes[i];
                //var w1 = 0 - T.x;
                //var h1 = 0 - T.y;

                w1 = 1;
                h1 = 1;

                var x2 = T.x;
                var y2 = T.y;
                var w2 = T.width;
                var h2 = T.height;
                var isCollision = true;

                w2 += x2;
                w1 += x1;

                if (x2 > w1 || x1 > w2) {
                    isCollision = false;
                }

                h2 += y2;
                h1 += y1;

                if (y2 > h1 || y1 > h2) {
                    isCollision = false;
                }

                if (isCollision) {
                    T.onClick();
                }

            }
        }, false);

    },

    Rectangle: function(options) {
        options = options || {};
        this.width = options.width || 50;
        this.height = options.height || 50;
        this.color = options.color || 'white';
        this.x = options.x || 0;
        this.y = options.y || 0;
        this.zindex = options.zindex || 1;

        if (options.visible !== undefined) {
            this.visible = options.visible;
        } else {
            this.visible = true;
        }

        this.onClick = function() {
            // nop
        };

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

        if (options.visible !== undefined) {
            this.visible = options.visible;
        } else {
            this.visible = true;
        }

        this.onClick = function() {
            // nop
        };

        this.type = function() {
            return 'ellipse';
        };
    },

    Sprite: function(options) {

        this.node = new Image();

        // src option required
        this.src = options.src;
        this.node.src = options.src;

        this.width = options.width || this.node.width;
        this.height = options.height || this.node.height;
        this.frameWidth = options.frameWidth || this.node.width;
        this.frameHeight = options.frameHeight || this.node.height;

        // current x and y frames
        this.xFrame = options.xFrame || 0;
        this.yFrame = options.yFrame || 0;

        this.x = options.x || 0;
        this.y = options.y || 0;

        this.zindex = options.zindex || 1;

        if (options.visible !== undefined) {
            this.visible = options.visible;
        } else {
            this.visible = true;
        }

        this.onClick = function() {
            // nop
        };
        
        this.type = function() {
            return 'sprite';
        };
    },

    Text: function(options) {
        options = options || {};
        this.font = options.font || '10pt sans-serif';
        this.color = options.color || 'white';
        this.x = options.x || 0;
        this.y = options.y || 0;

        this.text = options.text || '';

        this.zindex = options.zindex || 1;

        if (options.visible !== undefined) {
            this.visible = options.visible;
        } else {
            this.visible = true;
        }

        this.onClick = function() {
            // nop
        };

        this.type = function() {
            return 'text';
        };
    },

    // check for collision
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
    },

    // sort objects by zindexes
    SortByIndexes: function (prop, arr) {

        prop = prop.split('.');
        var len = prop.length;

        arr.sort(function (a, b) {
            var i = 0;
            while (i < len) { 
                a = a[prop[i]]; 
                b = b[prop[i]]; 
                i++; 
            }
            if (a < b) {
                return -1;
            } else if (a > b) {
                return 1;
            } else {
                return 0;
            }
        });
        return arr;

    },

    // random int
    Random: function (from, to) {
        return Math.floor(Math.random() * (to - from + 1) + from);
    }
        
};


plant.Scene.prototype.update = function() {

    // clear canvas
    this.context.fillStyle = this.background;
    this.context.fillRect(0, 0, this.htmlNode.width, this.htmlNode.height);

    // sort objects by zindexes
    this.nodes = plant.SortByIndexes('zindex', this.nodes);

    for (var i = 0; i < this.nodes.length; i++) {

        var T = this.nodes[i];
        var ctx = this.context;
        
        if (T.visible === true) {
            switch (T.type()) {

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
    if (child.type === 'sprite') {
        // attach image if sprite
        child.node.src = child.src;
    }

    this.nodes.push(child);
}

