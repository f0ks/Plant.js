example = {
    onPageLoad: function()
    {
    
        var myScene = new plant.Scene({
            htmlNodeId: 'my_canvas',
            background: 'black',
            width: 320,
            height: 480
        });
        
        var myTxt = new plant.Text({
            text: 'Hello World again',
        });

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

        function drawPapelac() {
            myScene.update();
            if (myAnim.xFrame > 2) {
                myAnim.xFrame = 0;
            } else {
                myAnim.xFrame++;
            }
        }

        myScene.addChild(myTxt);
        myScene.addChild(myAnim);
        myScene.update();
     
        setInterval(drawPapelac,50);  

    }
};

window.addEventListener('load', example.onPageLoad, false);
