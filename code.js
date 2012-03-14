var example = {

    isLeftPressed : false,
    isRightPressed : false,
    isUpPressed : false,
    isDownPressed : false,
    isSpaceHit : false,

    isBombDropped: false,

    score: 0,

    onPageLoad: function() {
    
        var myScene = new plant.Scene({
            htmlNodeId: 'my_canvas',
            background: 'black',
            width: 320,
            height: 480
        });
        
        var myTxt = new plant.Text({
            x: 5,
            y: 5,
            color: '#99ff99'
        });

        var myBomb = new plant.Ellipse({
            width: 3,
            height: 3,
            color: '#fff'
        });

/*
        var rectEnemy = new plant.Rectangle({
            width: 25,
            height: 25,
            x: 150,
            y: 460 
        });
*/

        var myPlayer = new plant.Sprite({
            x: 240, 
            y: 200, 
            width: 15,
            height: 25,
            frameWidth: 15,
            frameHeight: 25,
            xFrame: 3,
            yFrame: 0,
            src: 'player.png', 
            zindex: 2 
        });

        var myEnemy = new plant.Sprite({
            x: 150, 
            y: 465, 
            width: 14,
            height: 13,
            frameWidth: 14,
            frameHeight: 13,
            xFrame: 0,
            yFrame: 0,
            src: 'enemy.png', 
            zindex: 2 
        });
        function gameLoop() {

            // drop bomb
            if(example.isSpaceHit) {
                if (myBomb.y < 460) {
                    myBomb.y += 10;
                    example.isBombDropped = true;
                } else {
                    example.isBombDropped = false;
                    example.isSpaceHit = false;
                }
            }

            if (!example.isBombDropped) {
                myBomb.x = myPlayer.x + 6;
                myBomb.y = myPlayer.y + 26;
            } else {

            }

            myTxt.text = 'score: ' + example.score;
            if (plant.Collision(myBomb, myEnemy)) {
                //myTxt.text = 'COLLISION!!!';
                example.score += 10;
            }


            // player animation
            if (myPlayer.xFrame > 2) {
                myPlayer.xFrame = 0;
            } else {
                myPlayer.xFrame++;
            }

            // enemy animation
            if (myEnemy.xFrame > 1) {
                myEnemy.xFrame = 0;
            } else {
                myEnemy.xFrame++;
            }

            myScene.update();
            if (example.isLeftPressed) {
                if (myPlayer.x > 10) {
                    myPlayer.x -= 8;
                }
            }

            if (example.isRightPressed) {
                if (myPlayer.x < 290) {
                    myPlayer.x += 8;
                }
            }

            if (example.isDownPressed) {
                if (myPlayer.y < 330) {
                    myPlayer.y += 8;
                }
            }

            if (example.isUpPressed) {
                if (myPlayer.y > 45) {
                    myPlayer.y -= 8;
                }
            }

        }

        myScene.addChild(myTxt);
        myScene.addChild(myPlayer);
        myScene.addChild(myBomb);
        myScene.addChild(myEnemy);
     
        setInterval(gameLoop,50);  

    },


    keyDown: function(e) {
        //console.log(e.keyCode);
        // left
        if (e.keyCode == 37) {
            example.isLeftPressed = true;
        }
        // right
        if (e.keyCode == 39) {
            example.isRightPressed = true;
        }
        // down
        if (e.keyCode == 40) {
            example.isDownPressed = true;
        }
        // up
        if (e.keyCode == 38) {
            example.isUpPressed = true;
        }
        // hit space
        if (e.keyCode == 32) {
            example.isSpaceHit = true;
        }
    },

    keyUp: function(e) {
        // left
        if (e.keyCode == 37) {
            example.isLeftPressed = false;
        }
        // right
        if (e.keyCode == 39) {
            example.isRightPressed = false;
        }
        // down
        if (e.keyCode == 40) {
            example.isDownPressed = false;
        }
        // up
        if (e.keyCode == 38) {
            example.isUpPressed = false;
        }
    },
};

window.addEventListener('load', example.onPageLoad, false);
window.addEventListener('keydown', example.keyDown, false);
window.addEventListener('keyup', example.keyUp, false);
