var example = {

    enemies: [],
    bullets: [],

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
        
        var myTxt = new plant.Text({
            x: 5,
            y: 5,
            color: '#9f9',
        });

        var myTxt2 = new plant.Text({
            x: 140,
            y: 220,
            color: 'white'
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

        var myEnemy = new plant.Sprite({
            x: 20, 
            y: 467, 
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
//////////////////// st
        var myEnemy2 = new plant.Sprite({
            x: 40, 
            y: 467, 
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
        myEnemy2.isGoRight = true;
        myEnemy2.shotPosition = 0;
        myEnemy2.isGunLoaded = false;
        myEnemy2.isShot = false;
        myEnemy2.isDying = false;
        myEnemy2.isDead = false;
        myEnemy2.shotPosition = plant.Random(10, 300);

        var myEnemyBullet2 = new plant.Rectangle({
            width: 1,
            height: 5,
            color: '#aaf',
            zindex: 0
        });

        example.enemies[0] = myEnemy2;
        example.bullets[0] = myEnemyBullet2;
        myScene.addChild(example.enemies[0]);
        myScene.addChild(example.bullets[0]);
////////////// end
        
        myScene.addChild(myTxt);
        myScene.addChild(myTxt2);
        myScene.addChild(myPlayer);
        myScene.addChild(myPlayerExplosion);
        myScene.addChild(myBomb);
        myScene.addChild(myEnemy);
        myScene.addChild(myEnemyBullet);

        setInterval(gameLoop, 50);  


        function gameLoop() {


             


            // drop bomb
            if(example.isSpaceHit) {
                if (myBomb.y < 470) {
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


            // stick bullet to enemy
            if (!myEnemy.isShot) {
                myEnemyBullet.x = myEnemy.x + 8;
                myEnemyBullet.y = myEnemy.y + 1;
            }

            //// st
            // stick bullet to enemy
            if (!example.enemies[0].isShot) {
                example.bullets[0].x = example.enemies[0].x + 8;
                example.bullets[0].y = example.enemies[0].y + 8;
            }
            //// end
            
            // hit on enemy check
            if (plant.Collision(myBomb, myEnemy) && !myEnemy.isDead) {
                myEnemy.isDying = true;
                myEnemy.yFrame = 1;
                myEnemy.xFrame = 0;
                example.score += 10;
            }

            //// st
            // hit on enemy check
            if (plant.Collision(myBomb, example.enemies[0]) && !example.enemies[0].isDead) {
                example.enemies[0].isDying = true;
                example.enemies[0].yFrame = 1;
                example.enemies[0].xFrame = 0;
                example.score += 10;
            }
            //// end
            
            // hit on player check
            if (plant.Collision(myPlayer, myEnemyBullet)) {

                plant.isDying = true;

                myPlayerExplosion.x = myPlayer.x - 10;
                myPlayerExplosion.y = myPlayer.y - 5;
                myPlayerExplosion.visible = true;

                myTxt2.text = 'ПЕДИК';
            }

            ///// st
            // hit on player check
            if (plant.Collision(myPlayer, example.bullets[0])) {

                plant.isDying = true;

                myPlayerExplosion.x = myPlayer.x - 10;
                myPlayerExplosion.y = myPlayer.y - 5;
                myPlayerExplosion.visible = true;

                myTxt2.text = 'ПЕДИК';
            }
            ///// end

            // player animation
            if (!plant.isDying) {
                if (myPlayer.xFrame > 2) {
                    myPlayer.xFrame = 0;
                } else {
                    myPlayer.xFrame++;
                }
            } else if (plant.isDying && !plant.isDead) {
                // dying animation
                if (myPlayerExplosion.xFrame < 2) {
                    myPlayerExplosion.xFrame++;
                } else {
                    plant.isDead = true;
                    myPlayer.visible = false;
                    myPlayerExplosion.visible = false;
                    myBomb.visible = false;
                }

            }

            // enemy animation
            if (!myEnemy.isDying) {
                // normal animation
                if (myEnemy.xFrame > 1) {
                    myEnemy.xFrame = 0;
                } else {
                    myEnemy.xFrame++;
                }
            } else if (myEnemy.isDying && !myEnemy.isDead) {
                // dying animation
                if (myEnemy.xFrame < 2) {
                    myEnemy.xFrame++;
                } else {
                    myEnemy.isDead = true;
                }
            }

            ///// st
            // enemy animation
            if (!example.enemies[0].isDying) {
                // normal animation
                if (example.enemies[0].xFrame > 1) {
                    example.enemies[0].xFrame = 0;
                } else {
                    example.enemies[0].xFrame++;
                }
            } else if (example.enemies[0].isDying && !example.enemies[0].isDead) {
                // dying animation
                if (example.enemies[0].xFrame < 2) {
                    example.enemies[0].xFrame++;
                } else {
                    example.enemies[0].isDead = true;
                }
            }
            ///// end

            // move enemy
            if (!myEnemy.isDying) {
                if (myEnemy.isGoRight) {
                    myEnemy.x += 2;
                } else {
                    myEnemy.x -= 2;
                }

                if (myEnemy.x > 300) {
                    myEnemy.isGoRight = false;
                } 
                if (myEnemy.x < 10) {
                    myEnemy.isGoRight = true;
                } 
            }

            // enemy shot
            if(myEnemy.isGunLoaded) {
                // set random shot position
                myEnemy.shotPosition = plant.Random(10, 300);
                myEnemy.isGunLoaded = false;
            }

            //// st
            // move enemy
            if (!example.enemies[0].isDying) {
                if (example.enemies[0].isGoRight) {
                    example.enemies[0].x += 2;
                } else {
                    example.enemies[0].x -= 2;
                }

                if (example.enemies[0].x > 300) {
                    example.enemies[0].isGoRight = false;
                } 
                if (example.enemies[0].x < 10) {
                    example.enemies[0].isGoRight = true;
                } 
            }

            // enemy shot
            if(example.enemies[0].isGunLoaded) {
                // set random shot position
                example.enemies[0].shotPosition = plant.Random(10, 300);
                example.enemies[0].isGunLoaded = false;
            }
            //// end

            // bullet animation
            if (myEnemy.isShot) {
                myEnemyBullet.y -= 12;
                if (myEnemyBullet.y < 0) {
                    myEnemy.isShot = false;
                }
            }

            // shoot if we're close to shot position
            if (Math.abs(myEnemy.x - myEnemy.shotPosition) < 5 && !myEnemy.isGunLoaded) {
                // shoot
                myEnemy.isShot = true;
                // reload a gun
                myEnemy.isGunLoaded = true;
            }

            /// st
            // bullet animation
            if (example.enemies[0].isShot) {
                example.bullets[0].y -= 12;
                if (example.bullets[0].y < 0) {
                    example.bullets[0].isShot = false;
                }
            }

            // shoot if we're close to shot position
            if (Math.abs(example.enemies[0].x - example.enemies[0].shotPosition) < 5 && !example.enemies[0].isGunLoaded) {
                // shoot
                example.enemies[0].isShot = true;
                // reload a gun
                example.enemies[0].isGunLoaded = true;
            }
            /// end


            myTxt.text = 'score: ' + example.score;

            // we have to update scene before listen key input to prevent shaky move
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


    },


    keyDown: function(e) {
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
