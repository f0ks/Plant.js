var example = {
    onPageLoad: function() {


        var canvas = new plant.Scene({
            htmlNodeId: 'canvas',
        });

        var mySprite = new plant.Sprite({
            src: 'sprite.png',
            //x: 0,
            //y: 0,
            //frameWidth: 80,
            //frameHeight: 30,
            //width: 80,
            //height: 30
        });
        console.log(mySprite.frameWidth);
        canvas.addChild(mySprite);
        canvas.update();


    } 
};
window.addEventListener('load', example.onPageLoad, false);
