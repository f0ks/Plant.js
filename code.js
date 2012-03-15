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

        var myTxt3 = new plant.Text({
            x: 200,
            y: 5,
            color: 'white',
            text: 'стрелки и проблел'
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

        
        myScene.addChild(myTxt);
        myScene.addChild(myTxt2);
        myScene.addChild(myTxt3);
        myScene.addChild(myPlayer);
        myScene.addChild(myPlayerExplosion);
        myScene.addChild(myBomb);
        myScene.addChild(myEnemy);
        myScene.addChild(myEnemyBullet);

        setInterval(gameLoop, 50);  
        setInterval(addEnemy, 1800);  

        function addEnemy() {
        if (example.enemyCount < 40) {
                var myEnemy = new plant.Sprite({
                    x: 0, 
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

                example.enemies[example.enemyCount] = myEnemy;
                example.bullets[example.enemyCount] = myEnemyBullet;
                myScene.addChild(example.enemies[example.enemyCount]);
                myScene.addChild(example.bullets[example.enemyCount]);
                example.enemyCount++;
            }
        }


        function gameLoop() {

            for(var i=0; i < example.enemies.length; i++) {

                //// st
                // stick bullet to enemy
                if (!example.enemies[i].isShot) {
                    example.bullets[i].x = example.enemies[i].x + 8;
                    example.bullets[i].y = example.enemies[i].y + 8;
                }
                //// end
                
                //// st
                // hit on enemy check
                if (plant.Collision(myBomb, example.enemies[i]) && !example.enemies[i].isDead) {
                    example.enemies[i].isDying = true;
                    example.enemies[i].yFrame = 1;
                    example.enemies[i].xFrame = 0;
                    example.score += 10;
                }
                //// eno

                    ///// st
                // hit on player check
                if (plant.Collision(myPlayer, example.bullets[i])) {

                    plant.isDying = true;

                    myPlayerExplosion.x = myPlayer.x - 10;
                    myPlayerExplosion.y = myPlayer.y - 5;
                    myPlayerExplosion.visible = true;

                    myTxt2.text = 'ПЕДИК';
                }
                ///// end

                ///// st
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
                ///// en

                
                //// st
                // move enemy
                if (!example.enemies[i].isDying) {
                    if (example.enemies[i].isGoRight) {
                        example.enemies[i].x += 2;
                    } else {
                        example.enemies[i].x -= 2;
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
                    // set random shot position
                    example.enemies[i].shotPosition = plant.Random(10, 300);
                    example.enemies[i].isGunLoaded = false;
                }
                //// en
                
                /// st
                // bullet animation
                if (example.enemies[i].isShot) {
                    example.bullets[i].y -= 12;
                    if (example.bullets[i].y < 0) {
                        example.bullets[i].isShot = false;
                    }
                }

                // shoot if we're close to shot position
                if (Math.abs(example.enemies[i].x - example.enemies[i].shotPosition) < 5 && !example.enemies[i].isGunLoaded) {
                    // shoot
                    example.enemies[i].isShot = true;
                    // reload a gun
                    example.enemies[i].isGunLoaded = true;
                }
                /// end
 

            }

             


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

            
            // hit on enemy check
            if (plant.Collision(myBomb, myEnemy) && !myEnemy.isDead) {
                myEnemy.isDying = true;
                myEnemy.yFrame = 1;
                myEnemy.xFrame = 0;
                example.score += 10;
            }

            
            
            // hit on player check
            if (plant.Collision(myPlayer, myEnemyBullet)) {

                plant.isDying = true;

                myPlayerExplosion.x = myPlayer.x - 10;
                myPlayerExplosion.y = myPlayer.y - 5;
                myPlayerExplosion.visible = true;

                myTxt2.text = 'ПЕДИК';
            }

           

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
