/*
Written by Albert Khamidullin
*/

var plant = {

    Scene: function(options) {

        options = options || {};
        this.width = options.width || 320;
        this.height = options.height || 320;
        this.background = options.background || 'black';

        // create canvas if not using existing
        if (options.htmlNodeId === undefined) {
            this.htmlNode = document.createElement('canvas');
            document.body.appendChild(this.htmlNode);
        } else {
            this.htmlNode = document.getElementById(options.htmlNodeId);
        }

        // create additional hidden canvas for image processing
        this._processingCanvasNode = document.createElement('canvas');
        this._processingCanvasNode.style.display = 'none';
        document.body.appendChild(this._processingCanvasNode);

        // all the scene's objects goes here
        this.nodes = [];

        // mouse position on scene
        this.mouseX = 0;
        this.mouseY = 0;

        this.onClick = function() {};

        if (this.htmlNode.getContext) {
            this.context = this.htmlNode.getContext('2d');
            this.htmlNode.width = this.width;
            this.htmlNode.height = this.height;
        } else {
            throw new Error('Unable to get canvas context.');
        }

        var self = this;

        // Update mouseX and mouseY props on mouse move on canvas
        this.htmlNode.addEventListener('mousemove', function(e) {
            self.mouseX = e.clientX - self.htmlNode.offsetLeft;
            self.mouseY = e.clientY - self.htmlNode.offsetTop;
        }, false);
        
        this._changeImageOpacity = function (imagenode, opacity) {
            console.log("opa from converter " + opacity);
            if (this._processingCanvasNode.getContext) {
                this._processingCanvasCtx = this._processingCanvasNode.getContext('2d');

                // set canvas width and height to match image's size
                this._processingCanvasNode.width = imagenode.width;
                this._processingCanvasNode.height = imagenode.height;

                // set canvas opacity
                this._processingCanvasCtx.globalAlpha = opacity;

                // draw image
                this._processingCanvasCtx.drawImage(imagenode, 0, 0);

                // export base64 encoded image data
                var imgdata = this._processingCanvasNode.toDataURL("image/png");

                return imgdata;

            } else {
                throw new Error('Unable to get canvas context');
            }
        };

        // Check for click on canvas itself 
        // or on any object attached to current scene
        this.htmlNode.addEventListener('click', function(e) {

            // scene itself
            if (typeof(self.onClick) === 'function') {
                self.onClick();
            }

            // check for "collision" between mouse pointer and any other object
            // on current scene

            var curX = e.clientX - self.htmlNode.offsetLeft;
            var curY = e.clientY - self.htmlNode.offsetTop;
            var x1 = curX;
            var y1 = curY;
            var w1;
            var h1;

            var length = self.nodes.length;
            for (var i = 0; i < length; i++) {
                var T = self.nodes[i];

                // mouse pointer
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

                // if it is any collision, execute onClicked function of 
                // scene's child object clicked
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
        this.visible = options.visible || true;


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
        this.visible = options.visible || true;

        this.onClick = function() {
            // nop
        };

        this.type = function() {
            return 'ellipse';
        };
    },

    Sprite: function(options) {

        // src option required
        if (options.src === undefined){
            throw new Error('resourse src is required');
        } else {
            this.node = new Image();
            this.src = options.src;
            this.node.src = options.src;
        }


        this.width = options.width || this.node.width;
        this.height = options.height || this.node.height;
        this.frameWidth = options.frameWidth || this.node.width;
        this.frameHeight = options.frameHeight || this.node.height;

        // current x and y frames
        this.xFrame = options.xFrame || 0;
        this.yFrame = options.yFrame || 0;

        this.x = options.x || 0;
        this.y = options.y || 0;

        this.opacity = options.opacity || 1;
        // for watching opacity change
        this._opacityCache = options.opacity || 1;

        this.zindex = options.zindex || 1;
        this.visible = options.visible || true;

        this._isFadingOut = false;
        this._fadingFrame = null;


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

        this.text = options.text || 'Sample text';

        this.zindex = options.zindex || 1;
        this.visible = options.visible || true;

        this.onClick = function() {
            // nop
        };

        this.type = function() {
            return 'text';
        };
    },

    GameLoop: function(options) {
        // src option required
        if (options.scene === undefined){
            throw new Error('scene is required');
        } else {
            this.scene = options.scene;
        }
        this.interval = options.interval || 50; // 50ms default
        this._isActive = false;
    },

    // check for collision
    // @TODO move collision check to scene method
    isCollision: function(obj1, obj2) {

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

    // random int
    Random: function (from, to) {
        return Math.floor(Math.random() * (to - from + 1) + from);
    },

    // sort objects in array by key
    _sortBy: function (prop, arr) {

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


};


plant.Scene.prototype.update = function() {

    // clear canvas
    this.context.fillStyle = this.background;
    this.context.fillRect(0, 0, this.htmlNode.width, this.htmlNode.height);

    // sort plant's objects by z-indexes
    this.nodes = plant._sortBy('zindex', this.nodes);

    var length = this.nodes.length;
    for (var i = 0; i < length; i++) {

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
                    //T.node.src = T.src;
                    //console.log(T.node.src);
                    
                    // check for opacity change

                    var sx = T.frameWidth * T.xFrame;
                    var sy = T.frameHeight * T.yFrame;

                    ctx.drawImage(T.node, sx, sy, T.frameWidth, T.frameHeight, T.x, T.y, T.width, T.height);

                    // if opacity has changed, convert image
                    if (T.opacity !== T._opacityCache) {
                        T.node.src = this._changeImageOpacity(T.node, T.opacity);
                        T._opacityCache = T.opacity;
                    }

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
};


plant.GameLoop.prototype.start = function() {
    if (!this._isActive) {
        this.handle = setInterval(this.code, this.interval);
        this._isActive = true;
        return true;
    } else {
        return false; 
    }
};

plant.GameLoop.prototype.stop = function() {
    if (this._isActive) {
        clearInterval(this.handle);
        this._isActive = false;
        return true;
    } else {
        return false; 
    }
};

plant.Scene.prototype.add = function(toAdd) {

    // array of objects
    if (toAdd instanceof Array) {
        var length = toAdd.length;
        for (var i = 0; i < length; i++) {
            // if opacity isn't 1, convert image
            if (toAdd[i].type() === 'sprite' && toAdd[i].opacity !== 1) {
                toAdd[i].node.src = this._changeImageOpacity(toAdd[i].node, toAdd[i].opacity);
            }
            this.nodes.push(toAdd[i]);
        }

    // single object
    } else {
        // if opacity isn't 1, convert image
        if (toAdd.type() === 'sprite' && toAdd.opacity !== 1) {
            toAdd.node.src = this._changeImageOpacity(toAdd.node, toAdd.opacity);
        }
        this.nodes.push(toAdd);
    }

};

plant.Sprite.prototype.fadeOut = function() {
    this._fadingFrame = 10;
    this._isFadingOut = true;
};
