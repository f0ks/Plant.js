

example = {
    onPageLoad: function()
    {
        var myScene = new plant.Scene({
            htmlNodeId: 'my_canvas',
            width: 320,
            height: 480
        });


        var myRectangle = new plant.primitives.Rectangle({x: 200, y: 300});
        var myEllipse = new plant.primitives.Ellipse({index: 1000});
        myEllipse.color = 'red';
        myEllipse.y = 100;
        var mySprite = new plant.primitives.Sprite({x: 240, src: 'pl.png', index: 10});


        var myAnim = new plant.primitives.AnimatedSprite({
            x: 240, 
            y: 200, 
            width: 15,
            height: 25,
            frameWidth: 15,
            frameHeight: 25,
            xFrame: 3,
            yFrame: 0,
            src: 'player.png', 
            index: 11
            
            });



/*
        var lotOfSprites = [];
        var lotOfSprites2 = [];

        for(var i=0; i < 20; i++) {
            var randomnumber = Math.floor(Math.random()*320)
            var randomnumber2 = Math.floor(Math.random()*480)
            var newSprite = new plant.primitives.Sprite({
                width: 9,
                height: 9,
                x: randomnumber,
                y: randomnumber2,
                src: 'pl.png'
            });
            lotOfSprites.push(newSprite);            
            myScene.addChild(lotOfSprites[i]); 
        }

        for(var i=0; i < 20; i++) {
            var randomnumber = Math.floor(Math.random()*320)
            var randomnumber2 = Math.floor(Math.random()*480)
            var newSprite = new plant.primitives.Sprite({
                width: 9,
                height: 9,
                x: randomnumber,
                y: randomnumber2,
                src: 'pl.png'
            });
            lotOfSprites2.push(newSprite);            
            myScene.addChild(lotOfSprites2[i]); 
        }
*/
        function drawPapelac() {
            myScene.update();
            if (myAnim.xFrame > 3) {
                myAnim.xFrame = 0;
            } else {
                myAnim.xFrame++;
            }
        }
        function draw() {
            //myCubePlayer.y += 2;

            for(var i=0; i < lotOfSprites.length; i++) {
                lotOfSprites[i].y += 5;
                lotOfSprites2[i].y += 3;
                if (lotOfSprites[i].y > 480) {
                    lotOfSprites[i].y = 0;
                }
                if (lotOfSprites2[i].y > 480) {
                    lotOfSprites2[i].y = 0;
                }

            }

            myScene.fillBackground('black');
            myScene.update();
        }

        //myScene.addChild(myCubePlayer);
        myScene.addChild(myRectangle);
        myScene.addChild(myEllipse);
        myScene.addChild(mySprite);
        myScene.addChild(myAnim);
        //myScene.addChild(myRectangle);
            myScene.fillBackground('black');
            myScene.update();
        //myScene.addChild(myCubePlayer2);
        //myScene.addChild(mySprite);

        //setInterval(draw,50);  
        setInterval(drawPapelac,50);  
        //draw();
        //console.log(myCubePlayer.test());

    }
};


window.addEventListener('load', example.onPageLoad, false);
//var man = new plant.SpriteNode('man.png');
