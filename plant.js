/*
    Written by Albert Khamidullin
*/

var plant = {
    _animFrame: null,

    Scene: function(options) {

        options = options || {};
        this.useTimer = options.useTimer || false;
        this.width = options.width || 320;
        this.height = options.height || 320;
        this.background = options.background || 'black';

        // create canvas if not specified existing
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

        // all scene's objects goes here
        this.nodes = [];

        // mouse position on scene
        this.mouseX = 0;
        this.mouseY = 0;

        // function expected
        this.onClick = null;

        if (this.htmlNode.getContext) {
            this.context = this.htmlNode.getContext('2d');
            this.htmlNode.width = this.width;
            this.htmlNode.height = this.height;
        } else {
            throw new Error('Plant.js: Unable to get canvas context.');
        }

        var self = this;

        // update mouse position on scene
        this.htmlNode.addEventListener('mousemove', function(e) {
            self.mouseX = e.clientX - self.htmlNode.offsetLeft;
            self.mouseY = e.clientY - self.htmlNode.offsetTop;
        }, false);
        
        this._changeImageOpacity = function (imagenode, opacity) {
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
                var imgdata = this._processingCanvasNode.toDataURL('image/png');

                return imgdata;

            } else {
                throw new Error('Plant.js: Unable to get canvas context');
            }
        };


        // Check for click on canvas itself 
        // or on any object attached to current scene
        this.htmlNode.addEventListener('click', function(e) {

            // scene itself
            // if function set to onClick call it
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

                // if there is any collision, execute onClick function of 
                // scene's child object clicked, if it defined (not null)
                if (isCollision && T.onClick !== null) {
                    T.onClick();
                }
            }
        }, false);

    },

    Rectangle: function(options) {
        options = options || {};
        this.width = options.width || 50;
        this.height = options.height || 50;

        // plan works with hex colors, in full notation
        this.color = options.color || '#ffffff';     
                                                    
        this.x = options.x || 0;
        this.y = options.y || 0;
        this.zindex = options.zindex || 1;
        this.visible = options.visible || true;


        this.opacity = options.opacity || 1;

        // function expected
        this.onClick = null;
    },

    Ellipse: function(options) {
        options = options || {};
        this.width = options.width || 50;
        this.height = options.height || 50;
        this.color = options.color || '#ffffff';
        this.x = options.x || 0;
        this.y = options.y || 0;
        this.zindex = options.zindex || 1;

        this.visible = options.visible || true;

        this.opacity = options.opacity || 1;

        this.onClick = null;
    },

    Sprite: function(options) {

        // src option required
        if (options.src === undefined){
            throw new Error('Plant.js: resourse src required');
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

        // save previous opacity and angle values, watch for a change
        this._opacityCache = 1;

        this.zindex = options.zindex || 1;
        this.visible = options.visible || true;

        this._isFadingOut = false;
        this._fadingFrame = null;

        this.onClick = null;

    },

    Text: function(options) {
        options = options || {};
        this.font = options.font || '10pt sans-serif';
        this.color = options.color || '#ffffff';
        this.x = options.x || 0;
        this.y = options.y || 0;

        this.text = options.text || 'Sample text';

        this.zindex = options.zindex || 1;
        this.visible = options.visible || true;

        this.onClick = function() {
            // nop
        };
    },

    GameLoop: function(options) {

        // scene is required
        if (options.scene === undefined){
            throw new Error('Plant.js: scene is required');
        } else {
            this.scene = options.scene;
        }

        // 50ms default
        this.interval = options.interval || 50;
        this._isActive = false;
    },

    // check for collision
    // @TODO move collision check to scene method?
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

    // sort array's objects by key
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

    _componentToHex: function(c) {
        var hex = c.toString(16);
        return hex.length == 1 ? '0' + hex : hex;
    },

    _rgbToHex: function(r, g, b) {
        return '#' + this._componentToHex(r) + this._componentToHex(g) + this._componentToHex(b);    
    },

    _hexToRgb: function(hex) {
        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

};

plant.Scene.prototype.add = function(toAdd) {

    // array of objects
    if (toAdd instanceof Array) {
        var length = toAdd.length;
        for (var i = 0; i < length; i++) {
            this.nodes.push(toAdd[i]);
        }

    // single object
    } else {
        this.nodes.push(toAdd);
    }

};

plant.Scene.prototype.update = function() {

    // clear canvas
    this.context.fillStyle = this.background;
    this.context.fillRect(0, 0, this.htmlNode.width, this.htmlNode.height);

    // sort scene's objects by z-indexes
    this.nodes = plant._sortBy('zindex', this.nodes);

    var length = this.nodes.length;
    for (var i = 0; i < length; i++) {

        var T = this.nodes[i];
        var ctx = this.context;
        
        // don't render invisible objects
        if (T.visible) {
            switch (T.type()) {

                case 'rectangle':

                    if (T.opacity >= 0 && T.opacity <= 1) {
                        if (T.opacity < 1) {
                            var r = plant._hexToRgb(T.color).r;
                            var g = plant._hexToRgb(T.color).g;
                            var b = plant._hexToRgb(T.color).b;
                            ctx.fillStyle = 'rgba(' + r + ', ' + g + ', ' + b + ', ' + T.opacity + ')'; 
                        } else {
                            // opaque
                            ctx.fillStyle = T.color;
                        } 
                    } else {
                        throw new Error('Plant.js: invalid opacity value');
                    }

                    ctx.fillRect(T.x, T.y, T.width, T.height);

            
                break;

                case 'ellipse':
                    if (T.opacity >= 0 && T.opacity <= 1) {
                        if (T.opacity < 1) {
                            var r = plant._hexToRgb(T.color).r;
                            var g = plant._hexToRgb(T.color).g;
                            var b = plant._hexToRgb(T.color).b;
                            ctx.fillStyle = 'rgba(' + r + ', ' + g + ', ' + b + ', ' + T.opacity + ')'; 
                        } else {
                            // opaque
                            ctx.fillStyle = T.color;
                        } 
                    } else {
                        throw new Error('invalid opacity value');
                    }

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
                    //ctx.restore();
                break;

                case 'sprite':

                    // if opacity has changed, convert image
                    if (T.opacity !== T._opacityCache) {
                        T.node.src = this._changeImageOpacity(T.node, T.opacity);
                        T._opacityCache = T.opacity;
                    }


                    // find out what area of sprite we should draw
                    var sx = T.frameWidth * T.xFrame;
                    var sy = T.frameHeight * T.yFrame;

                    ctx.save();


                    ctx.drawImage(T.node, sx, sy, T.frameWidth, T.frameHeight, T.x, T.y, T.width, T.height);

                    ctx.restore();

                break;

                case 'text':
                    ctx.font = T.font;
                    ctx.fillStyle = T.color;
                    ctx.textBaseline = 'top';
                    ctx.fillText(T.text, T.x, T.y);
                break;

            }
        }
    }
};

plant.Rectangle.prototype.type = function() {
    return 'rectangle';
};

plant.Ellipse.prototype.type = function() {
    return 'ellipse';
};

plant.Sprite.prototype.type = function() {
    return 'sprite';
};

plant.Sprite.prototype.fadeOut = function() {
    this._fadingFrame = 10;
    this._isFadingOut = true;
};

plant.Text.prototype.type = function() {
    return 'text';
};

plant.GameLoop.prototype.start = function(scene) {
    if (!scene.useTimer) {
        plant._animFrame = requestAnimationFrame(this.code);
    } else {
        if (!this._isActive) {
            this.handle = setInterval(this.code, this.interval);
            this._isActive = true;
            return true;
        } else {
            return false;
        }
    }

};

plant.GameLoop.prototype.stop = function(scene) {
    if (!scene.useTimer) {
        cancelAnimationFrame(plant._animFrame);
    } else {
        if (this._isActive) {
            clearInterval(this.handle);
            this._isActive = false;
            return true;
        } else {
            return false;
        }
    }
};


