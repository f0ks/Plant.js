/*
    Written by Albert Khamidullin
*/

var plant = {

    Scene: function(options) {

        options = options || {};
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
            throw new Error('Unable to get canvas context.');
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
        this.color = options.color || 'white';      // plan works with hex colors, but also supports
                                                    // css color names, 
                                                    // but it will be converted to hex, so, if you'll
                                                    // create rectangle with color: 'green', and then
                                                    // check the .color property of you rectangle,
                                                    // you'll get '#00ff00'
                                                    // also, short hex values like '#cef' will be
                                                    // converted to '#cceeff'
                                                    
        this.x = options.x || 0;
        this.y = options.y || 0;
        this.zindex = options.zindex || 1;
        this.visible = options.visible || true;

        this.angle = options.angle || 0;

        this.opacity = options.opacity || 1;

        // function expected
        this.onClick = null;
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

        this.onClick = null;
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

        // save previous opacity value, watch for a change
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
        this.color = options.color || 'white';
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
            throw new Error('scene is required');
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
        return hex.length == 1 ? "0" + hex : hex;
    },

    _rgbToHex: function(r, g, b) {
        return "#" + this._componentToHex(r) + this._componentToHex(g) + this._componentToHex(b);    
    },

    _hexToRgb: function(hex) {
        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    },

    _colourNameToHex: function(color) {
        var colors = { "aliceblue":"#f0f8ff","antiquewhite":"#faebd7","aqua":"#00ffff","aquamarine":"#7fffd4","azure":"#f0ffff",
        "beige":"#f5f5dc","bisque":"#ffe4c4","black":"#000000","blanchedalmond":"#ffebcd","blue":"#0000ff","blueviolet":"#8a2be2","brown":"#a52a2a","burlywood":"#deb887",
        "cadetblue":"#5f9ea0","chartreuse":"#7fff00","chocolate":"#d2691e","coral":"#ff7f50","cornflowerblue":"#6495ed","cornsilk":"#fff8dc","crimson":"#dc143c","cyan":"#00ffff",
        "darkblue":"#00008b","darkcyan":"#008b8b","darkgoldenrod":"#b8860b","darkgray":"#a9a9a9","darkgreen":"#006400","darkkhaki":"#bdb76b","darkmagenta":"#8b008b","darkolivegreen":"#556b2f",
        "darkorange":"#ff8c00","darkorchid":"#9932cc","darkred":"#8b0000","darksalmon":"#e9967a","darkseagreen":"#8fbc8f","darkslateblue":"#483d8b","darkslategray":"#2f4f4f","darkturquoise":"#00ced1",
        "darkviolet":"#9400d3","deeppink":"#ff1493","deepskyblue":"#00bfff","dimgray":"#696969","dodgerblue":"#1e90ff",
        "firebrick":"#b22222","floralwhite":"#fffaf0","forestgreen":"#228b22","fuchsia":"#ff00ff",
        "gainsboro":"#dcdcdc","ghostwhite":"#f8f8ff","gold":"#ffd700","goldenrod":"#daa520","gray":"#808080","green":"#008000","greenyellow":"#adff2f",
        "honeydew":"#f0fff0","hotpink":"#ff69b4",
        "indianred ":"#cd5c5c","indigo ":"#4b0082","ivory":"#fffff0","khaki":"#f0e68c",
        "lavender":"#e6e6fa","lavenderblush":"#fff0f5","lawngreen":"#7cfc00","lemonchiffon":"#fffacd","lightblue":"#add8e6","lightcoral":"#f08080","lightcyan":"#e0ffff","lightgoldenrodyellow":"#fafad2",
        "lightgrey":"#d3d3d3","lightgreen":"#90ee90","lightpink":"#ffb6c1","lightsalmon":"#ffa07a","lightseagreen":"#20b2aa","lightskyblue":"#87cefa","lightslategray":"#778899","lightsteelblue":"#b0c4de",
        "lightyellow":"#ffffe0","lime":"#00ff00","limegreen":"#32cd32","linen":"#faf0e6",
        "magenta":"#ff00ff","maroon":"#800000","mediumaquamarine":"#66cdaa","mediumblue":"#0000cd","mediumorchid":"#ba55d3","mediumpurple":"#9370d8","mediumseagreen":"#3cb371","mediumslateblue":"#7b68ee",
        "mediumspringgreen":"#00fa9a","mediumturquoise":"#48d1cc","mediumvioletred":"#c71585","midnightblue":"#191970","mintcream":"#f5fffa","mistyrose":"#ffe4e1","moccasin":"#ffe4b5",
        "navajowhite":"#ffdead","navy":"#000080",
        "oldlace":"#fdf5e6","olive":"#808000","olivedrab":"#6b8e23","orange":"#ffa500","orangered":"#ff4500","orchid":"#da70d6",
        "palegoldenrod":"#eee8aa","palegreen":"#98fb98","paleturquoise":"#afeeee","palevioletred":"#d87093","papayawhip":"#ffefd5","peachpuff":"#ffdab9","peru":"#cd853f","pink":"#ffc0cb","plum":"#dda0dd","powderblue":"#b0e0e6","purple":"#800080",
        "red":"#ff0000","rosybrown":"#bc8f8f","royalblue":"#4169e1",
        "saddlebrown":"#8b4513","salmon":"#fa8072","sandybrown":"#f4a460","seagreen":"#2e8b57","seashell":"#fff5ee","sienna":"#a0522d","silver":"#c0c0c0","skyblue":"#87ceeb","slateblue":"#6a5acd","slategray":"#708090","snow":"#fffafa","springgreen":"#00ff7f","steelblue":"#4682b4",
        "tan":"#d2b48c","teal":"#008080","thistle":"#d8bfd8","tomato":"#ff6347","turquoise":"#40e0d0",
        "violet":"#ee82ee",
        "wheat":"#f5deb3","white":"#ffffff","whitesmoke":"#f5f5f5",
        "yellow":"#ffff00","yellowgreen":"#9acd32" };

        if (typeof colors[colour.toLowerCase()] !== 'undefined') {
            return colors[colour.toLowerCase()];
        }

        return false;
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
        if (T.visible === true) {
            switch (T.type()) {

                case 'rectangle':

                    if (T.opacity !== 1) {
                        var r = plant._hexToRgb(T.color).r;
                        var g = plant._hexToRgb(T.color).g;
                        var b = plant._hexToRgb(T.color).b;
                        ctx.fillStyle = 'rgba(' + r + ', ' + g + ', ' + b + ', ' + T.opacity + ')'; 
                    } else {
                        ctx.fillStyle = T.color;
                    }


                    // if comment - interesting rotating effect discovered
                    ctx.save();
                    ctx.rotate(T.angle / 100);
                    ctx.fillRect(T.x, T.y, T.width, T.height);
                    ctx.restore();

            
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

                    // if opacity has changed, convert image
                    if (T.opacity !== T._opacityCache) {
                        T.node.src = this._changeImageOpacity(T.node, T.opacity);
                        T._opacityCache = T.opacity;
                    }

                    // find out what area of sprite we should draw
                    var sx = T.frameWidth * T.xFrame;
                    var sy = T.frameHeight * T.yFrame;

                    // draw sprite
                    ctx.drawImage(T.node, sx, sy, T.frameWidth, T.frameHeight, T.x, T.y, T.width, T.height);

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


