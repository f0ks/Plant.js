example = {

    isLeftPressed : false,
    isRightPressed : false,
    isUpPressed : false,
    isDownPressed : false,

    onPageLoad: function()
    {
    
        var myScene = new plant.Scene({
            htmlNodeId: 'my_canvas',
            background: 'black',
            width: 320,
            height: 480
        });
        
        var myTxt = new plant.Text({
            text: '^^',
        });
        var myAnim = new plant.Rectangle();
        var rectEnemy = new plant.Rectangle({
            x: 100,
            y: 100
        });
/*
        var myAnim = new plant.Sprite({
            x: 240, 
            y: 200, 
            width: 15,
            height: 25,
            frameWidth: 15,
            frameHeight: 25,
            xFrame: 3,
            yFrame: 0,
            src: 'player.png', 
            zindex: 11
        });
*/
        function drawPapelac() {
            myTxt.text = 'x ' + myAnim.x + ' y ' + myAnim.y; 
            if (plant.Collision(myAnim, rectEnemy)) {
                myTxt.text = 'COLLISION!!!';
            }
            myScene.update();
            if (myAnim.xFrame > 2) {
                myAnim.xFrame = 0;
            } else {
                myAnim.xFrame++;
            }

            if (example.isLeftPressed) {
                if (myAnim.x > 0) {
                    myAnim.x -= 8;
                }
            }

            if (example.isRightPressed) {
                if (myAnim.x < 300) {
                    myAnim.x += 8;
                }
            }

            if (example.isDownPressed) {
                if (myAnim.y < 430) {
                    myAnim.y += 8;
                }
            }

            if (example.isUpPressed) {
                if (myAnim.y > 45) {
                    myAnim.y -= 8;
                }
            }
        }

        myScene.addChild(myTxt);
        myScene.addChild(myAnim);
        myScene.addChild(rectEnemy);
        myScene.update();
     
        setInterval(drawPapelac,50);  


    },


    keyDown: function(e) {
        console.log(e.keyCode);
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
