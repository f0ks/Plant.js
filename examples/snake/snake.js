var snake = {
    map: [],
    direction: 'top',

    isLeftPressed : false,
    isRightPressed : false,
    isUpPressed : false,
    isDownPressed : false,

    onPageLoad: function() {
        // cell size: 10x10px, map: 20x20 = 200px to 200px
        var myScene = new plant.Scene({
            htmlNodeId: 'my_canvas',
            background: 'black',
            width: 200,
            height: 200
        });

        myScene.update();

        var gameLoop = function(){
        
        }

    },

        keyDown: function(e) {
        // left
        if (e.keyCode === 37) {
            example.isLeftPressed = true;
        }
        // right
        if (e.keyCode === 39) {
            example.isRightPressed = true;
        }
        // down
        if (e.keyCode === 40) {
            example.isDownPressed = true;
        }
        // up
        if (e.keyCode === 38) {
            example.isUpPressed = true;
        }
    },

    keyUp: function(e) { // left
        if (e.keyCode === 37) {
            example.isLeftPressed = false;
        }
        // right
        if (e.keyCode === 39) {
            example.isRightPressed = false;
        }
        // down
        if (e.keyCode === 40) {
            example.isDownPressed = false;
        }
        // up
        if (e.keyCode === 38) {
            example.isUpPressed = false;
        }
    },



}

window.addEventListener('load', snake.onPageLoad, false);
window.addEventListener('keydown', snake.keyDown, false);
window.addEventListener('keyup', snake.keyUp, false);
