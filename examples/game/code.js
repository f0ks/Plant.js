var example = {

    enemies: [],
    bullets: [],
    enemyCount: 0,

    isLeftPressed : false,
    isRightPressed : false,
    isUpPressed : false,
    isDownPressed : false,
    isSpaceHit : false,

    isBombDropped: false,

    isDying: false,
    isDead: false,

    score: 0,

    onPageLoad: function() {
    
        var myScene = new plant.Scene({
            htmlNodeId: 'my_canvas',
            background: 'black',
            width: 320,
            height: 480
        });
        
        var background = new plant.Sprite({
            x: 0,
            y: 0,
            frameWidth: 320,
            frameHeight: 480,
            xFrame: 0,
            yFrame: 0,
            width: 320,
            height: 480,
            src: 'bg.png', 
            zindex: 1
        });

        var myTxt = new plant.Text({
            x: 5,
            y: 5,
            color: '#9f9',
        });

        var myTxt2 = new plant.Text({
            x: 124,
            y: 220,
            color: 'white'
        });

        var myTxt3 = new plant.Text({
            x: 150,
            y: 5,
            color: 'white',
            text: 'Controls: arrows and space'
        });

        var myBomb = new plant.Rectangle({
            width: 3,
            height: 3,
            color: 'green'
        });

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
            zindex: 2,
        });

        var myPlayerExplosion = new plant.Sprite({
            width: 34,
            height: 34,
            frameWidth: 34,
            frameHeight: 34,
            xFrame: 0,
            yFrame: 0,
            src: 'explosion.png', 
            zindex: 3,
            visible: false
        });

        
        myScene.addChild(background);
        myScene.addChild(myTxt);
        myScene.addChild(myTxt2);
        myScene.addChild(myTxt3);
        myScene.addChild(myPlayer);
        myScene.addChild(myPlayerExplosion);
        myScene.addChild(myBomb);


        var addEnemy = function() {
        if (example.enemyCount < 40) {
                var myEnemy = new plant.Sprite({
                    x: 0, 
                    y: 436, 
                    width: 14,
                    height: 13,
                    frameWidth: 14,
                    frameHeight: 13,
                    xFrame: 0,
                    yFrame: 0,
                    src: 'enemy.png', 
                    zindex: 2,
                });

                // set some custom properties
                myEnemy.isGoRight = true;
                myEnemy.shotPosition = 0;
                myEnemy.isGunLoaded = false;
                myEnemy.isShot = false;
                myEnemy.isDying = false;
                myEnemy.isDead = false;
                myEnemy.shotPosition = plant.Random(10, 300);

                var myEnemyBullet = new plant.Rectangle({
                    width: 1,
                    height: 5,
                    color: '#aaf',
                    zindex: 0
                });

                example.enemies[example.enemyCount] = myEnemy;
                example.bullets[example.enemyCount] = myEnemyBullet;
                myScene.addChild(example.enemies[example.enemyCount]);
                myScene.addChild(example.bullets[example.enemyCount]);
                example.enemyCount++;
            }

        };


        var gameLoop = function() {

            for(var i=0; i < example.enemies.length; i++) {

                // stick bullet to enemy
                if (!example.enemies[i].isShot) {
                    example.bullets[i].x = example.enemies[i].x + 8;
                    example.bullets[i].y = example.enemies[i].y + 8;
                }
                
                // hit on enemy check
                if (plant.Collision(myBomb, example.enemies[i]) && !example.enemies[i].isDead) {
                    example.enemies[i].isDying = true;
                    example.enemies[i].yFrame = 1;
                    example.enemies[i].xFrame = 0;
                    example.score += 10;
                }

                // hit on player check
                if (plant.Collision(myPlayer, example.bullets[i]) && !example.isDead) {

                    example.isDying = true;

                    myPlayerExplosion.x = myPlayer.x - 10;
                    myPlayerExplosion.y = myPlayer.y - 5;
                    myPlayerExplosion.visible = true;

                    myTxt2.text = 'GAME OVER';
                }

                // enemy animation
                if (!example.enemies[i].isDying) {
                    // normal animation
                    if (example.enemies[i].xFrame > 1) {
                        example.enemies[i].xFrame = 0;
                    } else {
                        example.enemies[i].xFrame++;
                    }
                } else if (example.enemies[i].isDying && !example.enemies[i].isDead) {
                    // dying animation
                    if (example.enemies[i].xFrame < 2) {
                        example.enemies[i].xFrame++;
                    } else {
                        example.enemies[i].isDead = true;
                    }
                }

                
                // move enemy
                if (!example.enemies[i].isDying) {
                    if (example.enemies[i].isGoRight) {
                        example.enemies[i].x += 3;
                    } else {
                        example.enemies[i].x -= 3;
                    }

                    if (example.enemies[i].x > 300) {
                        example.enemies[i].isGoRight = false;
                    } 
                    if (example.enemies[i].x < 10) {
                        example.enemies[i].isGoRight = true;
                    } 
                }

                // enemy shot
                if(example.enemies[i].isGunLoaded) {
                    // set random shot position between 10 and 300
                    example.enemies[i].shotPosition = plant.Random(10, 300);
                    example.enemies[i].isGunLoaded = false;
                }
                
                // bullet animation
                if (example.enemies[i].isShot) {
                    example.bullets[i].y -= 16;
                    if (example.bullets[i].y < 0) {
                        example.bullets[i].isShot = false;
                    }
                }

                // shoot if we're close to shot position
                if (Math.abs(example.enemies[i].x - example.enemies[i].shotPosition) < 5 && !example.enemies[i].isGunLoaded) {
                    // shoot
                    example.enemies[i].isShot = true;
                    // reload the gun
                    example.enemies[i].isGunLoaded = true;
                }

            }


            // drop bomb
            if(example.isSpaceHit) {
                if (myBomb.y < 435) {
                    myBomb.y += 10;
                    example.isBombDropped = true;
                } else {
                    example.isBombDropped = false;
                    example.isSpaceHit = false;
                }
            }

            // stick bomb to player
            if (!example.isBombDropped) {
                myBomb.x = myPlayer.x + 6;
                myBomb.y = myPlayer.y + 26;
            }


            // player animation
            if (!example.isDying) {
                if (myPlayer.xFrame > 2) {
                    myPlayer.xFrame = 0;
                } else {
                    myPlayer.xFrame++;
                }
            } else if (example.isDying && !example.isDead) {
                // dying animation
                if (myPlayerExplosion.xFrame < 2) {
                    myPlayerExplosion.xFrame++;
                } else {
                    example.isDead = true;
                    myPlayer.visible = false;
                    myPlayerExplosion.visible = false;
                    myBomb.visible = false;
                }

            }

            myTxt.text = 'score: ' + example.score;

            // we have to update scene before listen any key input 
            // to prevent shaky animation
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

        };

        setInterval(gameLoop, 50);  
        setInterval(addEnemy, 1800);  

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
        // space
        if (e.keyCode === 32) {
            example.isSpaceHit = true;
        }
    },

    keyUp: function(e) {
        // left
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
};

window.addEventListener('load', example.onPageLoad, false);
window.addEventListener('keydown', example.keyDown, false);
window.addEventListener('keyup', example.keyUp, false);

