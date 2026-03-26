/*@TODO
bugs:
    1. 1-st level: box disappearing bug
    2. 1-st level loads after all levels end without 1 box
    3. spot blinking

*/

"use strict";
var sokoban = {

    CELL_SIZE: 30,

    _isLevelChanged: true, // re-parse level only id needed, not for each animation frame
    isInitialized: false,
    curLevel: 0,

    loadLevel: function (level) {
        sokoban.level = sokoban.levels[level];
        sokoban.xLength = sokoban.level.length;
        sokoban.yLength = sokoban.level[0].length;

        if (sokoban.isInitialized) {
            sokoban.setCanvasSize();
            sokoban._isLevelChanged = true;
            sokoban.renderView();
        }
    },

    getPlayerPosition: function () {
        for (var i = 0; i < sokoban.xLength; i++) {
            for (var j = 0; j < sokoban.yLength; j++) {
                if (sokoban.level[i][j] === "@" || sokoban.level[i][j] === "%") {
                    var position = {};
                    position.x = j;
                    position.y = i;
                    return position;
                }
            }
        }

    },

    setPlayerPosition: function (position) {
        // delete old player position from map array
        var numberOfBoxes = 0;
        for (var i = 0; i < sokoban.xLength; i++) {
            for (var j = 0; j < sokoban.yLength; j++) {
                if (sokoban.level[i][j] === "B") {
                    numberOfBoxes++;
                }
                if (sokoban.level[i][j] === "@") {
                    sokoban.level[i][j] = "-";
                }
                if (sokoban.level[i][j] === "%") {
                    sokoban.level[i][j] = "*";
                }
            }
        }


        // check for win
        if (numberOfBoxes < 1) {
            if (sokoban.curLevel === sokoban.levels.length - 1) {
                // load first level 
                sokoban.loadLevels();
                sokoban.curLevel = 0;
                sokoban.loadLevel(0);
            } else {
                // load next level
                sokoban.curLevel++;
                sokoban.loadLevel(sokoban.curLevel);
                var positionNewLevel = sokoban.getPlayerPosition();
                sokoban.setPlayerPosition(positionNewLevel);
            }
        }

        // and set a new position
        if (sokoban.isOnSpot) {
            sokoban.level[position.y][position.x] = "%";
        } else if (sokoban.isPushFromSpot) {
            sokoban.level[position.y][position.x] = "%";
        } else {
            sokoban.level[position.y][position.x] = "@";
        }

        sokoban.isOnSpot = false;
        sokoban.isPushFromSpot = false;


        // and re-render the view
        sokoban.renderView();
    },


    goUp: function () {
        sokoban._isLevelChanged = true;
        var curPosition = sokoban.getPlayerPosition();
        var isPushed = false;

        // check for upper map border
        if (curPosition.y > 0) {

            // check for obsticles
            if (sokoban.level[curPosition.y - 1][curPosition.x] !== "-" &&
                sokoban.level[curPosition.y - 1][curPosition.x] !== "*" &&
                sokoban.level[curPosition.y - 1][curPosition.x] !== "$"

            ) {
                // box and empty space ahead
                if (sokoban.level[curPosition.y - 1][curPosition.x] === "B" &&
                    curPosition.y - 1 > 0 &&
                    sokoban.level[curPosition.y - 2][curPosition.x] === "-"

                ) {
                    sokoban.level[curPosition.y - 1][curPosition.x] = "-";
                    sokoban.level[curPosition.y - 2][curPosition.x] = "B";
                    curPosition.y--;
                    sokoban.setPlayerPosition(curPosition);
                    isPushed = true;
                }

                if (sokoban.level[curPosition.y - 1][curPosition.x] === "B" &&
                    curPosition.y - 1 > 0 &&
                    sokoban.level[curPosition.y - 2][curPosition.x] === "*" &&
                    !isPushed
                ) {
                    sokoban.level[curPosition.y - 1][curPosition.x] = "-";
                    sokoban.level[curPosition.y - 2][curPosition.x] = "$";
                    curPosition.y--;
                    sokoban.setPlayerPosition(curPosition);
                }

            }

            else { // no obsticles on top

                // move player to spot
                if (sokoban.level[curPosition.y - 1][curPosition.x] === "*") {
                    sokoban.isOnSpot = true;
                }
                if (sokoban.level[curPosition.y - 1][curPosition.x] === "$"
                    && sokoban.level[curPosition.y - 2][curPosition.x] !== "D"
                ) {
                    sokoban.level[curPosition.y - 2][curPosition.x] = "B";
                    sokoban.isPushFromSpot = true;
                }

                // dont pushbox from spot into wall
                if (sokoban.level[curPosition.y - 1][curPosition.x] === "$"
                    && sokoban.level[curPosition.y - 2][curPosition.x] === "D"
                ) {
                    curPosition.y++;
                }

                curPosition.y--;
                sokoban.setPlayerPosition(curPosition);
            }

        }

        sokoban._isLevelChanged = true;
        sokoban.renderView();
    },

    goDown: function () {
        var curPosition = sokoban.getPlayerPosition();
        var isPushed = false;

        if (curPosition.y < sokoban.xLength - 1) {
            // check for obsticles
            if (
                sokoban.level[curPosition.y + 1][curPosition.x] !== "-" &&
                sokoban.level[curPosition.y + 1][curPosition.x] !== "*" &&
                sokoban.level[curPosition.y + 1][curPosition.x] !== "$"

            ) {
                // box
                if (sokoban.level[curPosition.y + 1][curPosition.x] === "B" &&
                    curPosition.y + 1 < sokoban.xLength - 1 &&
                    sokoban.level[curPosition.y + 2][curPosition.x] === "-"

                ) {
                    sokoban.level[curPosition.y + 1][curPosition.x] = "-";
                    sokoban.level[curPosition.y + 2][curPosition.x] = "B";
                    curPosition.y++;
                    sokoban.setPlayerPosition(curPosition);
                    isPushed = true;
                }

                // push box to spot
                if (sokoban.level[curPosition.y + 1][curPosition.x] === "B" &&
                    curPosition.y + 1 < sokoban.xLength - 1 &&
                    sokoban.level[curPosition.y + 2][curPosition.x] === "*" &&
                    !isPushed
                ) {
                    sokoban.level[curPosition.y + 1][curPosition.x] = "-";
                    sokoban.level[curPosition.y + 2][curPosition.x] = "$";
                    curPosition.y++;
                    sokoban.setPlayerPosition(curPosition);
                    sokoban.renderView();
                }

            }


            else { // no obsticles on top

                // move player to spot
                if (sokoban.level[curPosition.y + 1][curPosition.x] === "*") {
                    sokoban.isOnSpot = true;
                }

                if (sokoban.level[curPosition.y + 1][curPosition.x] === "$"
                    && sokoban.level[curPosition.y + 2][curPosition.x] !== "D"
                ) {
                    // push from spot to next spot
                    if (sokoban.level[curPosition.y + 2][curPosition.x] === "*") {
                        sokoban.level[curPosition.y + 2][curPosition.x] = "$";
                    }

                    // push from spot to empty cell
                    if (sokoban.level[curPosition.y + 2][curPosition.x] === "-") {
                        sokoban.level[curPosition.y + 2][curPosition.x] = "B";
                    }

                    sokoban.isPushFromSpot = true;
                }

                // dont pushbox from spot into wall
                if (sokoban.level[curPosition.y + 1][curPosition.x] === "$"
                    && sokoban.level[curPosition.y + 2][curPosition.x] === "D"
                ) {
                    curPosition.y--;
                }

                curPosition.y++;
                sokoban.setPlayerPosition(curPosition);
            }

        }
        sokoban._isLevelChanged = true;
        sokoban.renderView();
    },

    goRight: function () {
        var curPosition = sokoban.getPlayerPosition();
        var isPushed = false;

        // check for map right border
        if (curPosition.x < sokoban.yLength - 1) {
            // check for obsticles
            if (sokoban.level[curPosition.y][curPosition.x + 1] !== "-" &&
                sokoban.level[curPosition.y][curPosition.x + 1] !== "*" &&
                sokoban.level[curPosition.y][curPosition.x + 1] !== "$"
            ) {
                // box
                if (sokoban.level[curPosition.y][curPosition.x + 1] === "B" &&
                    curPosition.x + 1 > 0 &&
                    sokoban.level[curPosition.y][curPosition.x + 2] === "-"

                ) {
                    sokoban.level[curPosition.y][curPosition.x + 1] = "-";
                    sokoban.level[curPosition.y][curPosition.x + 2] = "B";
                    curPosition.x++;
                    sokoban.setPlayerPosition(curPosition);
                    isPushed = true;
                }

                // push box to spot
                if (sokoban.level[curPosition.y][curPosition.x + 1] === "B" &&
                    curPosition.x + 1 > 0 &&
                    sokoban.level[curPosition.y][curPosition.x + 2] === "*" &&
                    !isPushed
                ) {
                    sokoban.level[curPosition.y][curPosition.x + 1] = "-";
                    sokoban.level[curPosition.y][curPosition.x + 2] = "$";
                    curPosition.x++;
                    sokoban.setPlayerPosition(curPosition);
                }

            } else { // no obsticles at right

                // move player to spot
                if (sokoban.level[curPosition.y][curPosition.x + 1] === "*") {
                    sokoban.isOnSpot = true;
                }
                if (sokoban.level[curPosition.y][curPosition.x + 1] === "$" &&
                    sokoban.level[curPosition.y][curPosition.x + 2] !== "D"
                ) {
                    sokoban.level[curPosition.y][curPosition.x + 2] = "B";
                    sokoban.isPushFromSpot = true;
                }

                // dont pushbox from spot into wall
                if (sokoban.level[curPosition.y][curPosition.x + 1] === "$" &&
                    sokoban.level[curPosition.y][curPosition.x + 2] === "D"
                ) {
                    curPosition.x--;
                }
                curPosition.x++;
                sokoban.setPlayerPosition(curPosition);
            }

        }
        // canvas redraw needed
        sokoban._isLevelChanged = true;
        sokoban.renderView();
    },

    goLeft: function () {
        var curPosition = sokoban.getPlayerPosition();
        var isPushed = false;
        if (curPosition.x > 0) {
            // check for obsticles
            if (sokoban.level[curPosition.y][curPosition.x - 1] !== "-" &&
                sokoban.level[curPosition.y][curPosition.x - 1] !== "*" &&
                sokoban.level[curPosition.y][curPosition.x - 1] !== "$"
            ) {

                // push box to empty space
                if (sokoban.level[curPosition.y][curPosition.x - 1] === "B" &&
                    curPosition.x - 1 > 0 &&
                    sokoban.level[curPosition.y][curPosition.x - 2] === "-" &&
                    sokoban.level[curPosition.y][curPosition.x - 2] !== "*"
                ) {
                    sokoban.level[curPosition.y][curPosition.x - 1] = "-";
                    sokoban.level[curPosition.y][curPosition.x - 2] = "B";
                    curPosition.x--;
                    isPushed = true;
                    sokoban.setPlayerPosition(curPosition);
                }

                // push box to spot
                if (sokoban.level[curPosition.y][curPosition.x - 1] === "B" &&
                    sokoban.level[curPosition.y][curPosition.x - 2] === "*" &&
                    !isPushed
                ) {
                    sokoban.level[curPosition.y][curPosition.x - 1] = "-";
                    sokoban.level[curPosition.y][curPosition.x - 2] = "$";
                    curPosition.x--;
                    sokoban.setPlayerPosition(curPosition);
                }

            }

            else {

                // move player to spot
                if (sokoban.level[curPosition.y][curPosition.x - 1] === "*") {
                    sokoban.isOnSpot = true;
                }
                if (sokoban.level[curPosition.y][curPosition.x - 1] === "$" &&
                    sokoban.level[curPosition.y][curPosition.x - 2] !== "D"
                ) {
                    sokoban.level[curPosition.y][curPosition.x - 2] = "B";
                    sokoban.isPushFromSpot = true;
                }

                // dont pushbox from spot into wall
                if (sokoban.level[curPosition.y][curPosition.x - 1] === "$" &&
                    sokoban.level[curPosition.y][curPosition.x - 2] === "D"
                ) {
                    curPosition.x++;
                }
                curPosition.x--;
                sokoban.setPlayerPosition(curPosition, true);
            }
        }
        // canvas redraw needed
        sokoban._isLevelChanged = true;
        sokoban.renderView();


    },

    renderView: function () {
        var htmlView = "";

        // render html view
        for (var i = 0; i < sokoban.xLength; i++) {
            for (var j = 0; j < sokoban.yLength; j++) {
                htmlView += sokoban.level[i][j] + " ";
                if (j === sokoban.level[i].length - 1) {
                    htmlView += "<br>";
                }
            }
        }
        $('code').html(htmlView);

        // render canvas view
        var curPosition = sokoban.getPlayerPosition();
        sokoban.player.x = curPosition.x * sokoban.CELL_SIZE;
        sokoban.player.y = curPosition.y * sokoban.CELL_SIZE;

        if (sokoban._isLevelChanged) {
            sokoban.updateCanvasView();
        }

    },

    updateCanvasView: function () {

        sokoban._isLevelChanged = false;

        // clean scene's objects
        sokoban.scene.nodes = [];

        // create bg blocks
        var bg_blocks = [];
        sokoban.boxes = [];
        sokoban.blocks = [];
        sokoban.grass = [];
        sokoban.spots = [];
        sokoban.bspots = [];

        sokoban.scene.add(sokoban.player);

        for (var i = 0; i < sokoban.xLength; i++) {
            for (var j = 0; j < sokoban.yLength; j++) {
                var cur_x = j * sokoban.CELL_SIZE;
                var cur_y = i * sokoban.CELL_SIZE;

                var cur_block = new plant.Sprite({
                    src: 'gfx/floor.png',
                    x: cur_x,
                    y: cur_y
                });

                bg_blocks.push(cur_block);
                sokoban.scene.add(bg_blocks[bg_blocks.length - 1]);

                // box
                if (sokoban.level[i][j] === "B") {
                    var box = new plant.Sprite({
                        src: "gfx/box.png",
                        zindex: 10,
                        x: cur_x,
                        y: cur_y
                    });

                    box.xCell = j;
                    box.yCell = i;

                    sokoban.boxes.push(box);
                    sokoban.scene.add(sokoban.boxes[sokoban.boxes.length - 1]);
                }

                // grass
                if (sokoban.level[i][j] === "G") {
                    var grass = new plant.Sprite({
                        src: "gfx/grass.png",
                        zindex: 10,
                        x: cur_x,
                        y: cur_y
                    });

                    grass.xCell = j;
                    grass.yCell = i;

                    sokoban.grass.push(grass);
                    sokoban.scene.add(sokoban.grass[sokoban.grass.length - 1]);
                }
                // block
                if (sokoban.level[i][j] === "D") {
                    var block = new plant.Sprite({
                        src: "gfx/block.png",
                        zindex: 10,
                        x: cur_x,
                        y: cur_y
                    });

                    block.xCell = j;
                    block.yCell = i;

                    sokoban.blocks.push(block);
                    sokoban.scene.add(sokoban.blocks[sokoban.blocks.length - 1]);
                }

                // spot
                if (sokoban.level[i][j] === "*") {
                    var spot = new plant.Sprite({
                        src: "gfx/spot.png",
                        x: cur_x,
                        y: cur_y,
                        width: sokoban.CELL_SIZE,
                        height: sokoban.CELL_SIZE
                    });
                    sokoban.spots.push(spot);
                    sokoban.scene.add(sokoban.spots[sokoban.spots.length - 1]);
                }

                // box on spot
                if (sokoban.level[i][j] === "$") {
                    var bspot = new plant.Sprite({
                        src: "gfx/bspot.png",
                        x: cur_x,
                        y: cur_y,
                        zindex: 100,
                        width: sokoban.CELL_SIZE,
                        height: sokoban.CELL_SIZE
                    });
                    sokoban.bspots.push(bspot);
                    sokoban.scene.add(sokoban.bspots[sokoban.bspots.length - 1]);
                }
            }
        }

    },

    setCanvasSize: function () {
        var sceneWidth = sokoban.CELL_SIZE * sokoban.yLength;
        var sceneHeight = sokoban.CELL_SIZE * sokoban.xLength;
        sokoban.scene.htmlNode.width = sceneWidth;
        sokoban.scene.htmlNode.height = sceneHeight;
    },

    onLoad: function () {


        sokoban.scene = new plant.Scene();
        sokoban.setCanvasSize();

        // calculate player's position on canvas

        var curPosition = sokoban.getPlayerPosition();
        sokoban.curPositionCanvX = curPosition.x * sokoban.CELL_SIZE;
        sokoban.curPositionCanvY = curPosition.y * sokoban.CELL_SIZE;

        sokoban.player = new plant.Sprite({
            src: "gfx/player.png",
            zindex: 101,
            width: sokoban.CELL_SIZE,
            height: sokoban.CELL_SIZE,
            x: sokoban.curPositionCanvX,
            y: sokoban.curPositionCanvY
        });

        sokoban.plantGameLoop = new plant.GameLoop({
            scene: sokoban.scene,
            interval: 50
        });


        sokoban.plantGameLoop.code = function () {
            sokoban.scene.update();
            requestAnimationFrame(sokoban.plantGameLoop.code);
        };

        sokoban.plantGameLoop.start(sokoban.scene);

        sokoban.renderView();

        sokoban.isInitialized = true;

    },

    keyDown: function (e) {
        if (e.keyCode === 38) {
            sokoban.goUp()
        }
        if (e.keyCode === 37) {
            sokoban.goLeft()
        }
        if (e.keyCode === 39) {
            sokoban.goRight()
        }
        if (e.keyCode === 40) {
            sokoban.goDown()
        }
    }

};

$.getScript("levels.js", function () {
    sokoban.loadLevels();
    sokoban.loadLevel(sokoban.curLevel);
    sokoban.onLoad();
});

//window.addEventListener('load', sokoban.onLoad, false);
window.addEventListener('keydown', sokoban.keyDown, false);

