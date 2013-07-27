var example = {
    onPageLoad: function(){

        var scene = new plant.Scene();

        var sprite = new plant.Sprite({
            src: 'sprite.png'
        });

        var obst1 = new plant.Sprite({
            src: 'dragon.png',
            x: 100,
            y: 50
        });
        var obst2 = new plant.Sprite({
            src: 'dragon.png',
            x: 200,
            y: 100
        });
        var obst3 = new plant.Sprite({
            src: 'dragon.png',
            x: 50,
            y: 250
        });

        scene.addChild(obst1);
        scene.addChild(obst2);
        scene.addChild(obst3);
        scene.addChild(sprite);

        var myLoop = new plant.GameLoop({
            scene: scene 
        });

        myLoop.code = function(){
            sprite.x = scene.mouseX; 
            sprite.y = scene.mouseY; 
            if (
                plant.isCollision(sprite, obst1)
                || plant.isCollision(sprite, obst2)
                || plant.isCollision(sprite, obst3)
            ) {
                console.log("collision"); 
                //sprite.fadeOut();
                myLoop.stop();
            }
            scene.update();
        };

        myLoop.start();
        

    }
    
};
window.addEventListener('load', example.onPageLoad, false);
