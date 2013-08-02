function onPageLoad() {

        var scene = new plant.Scene();

        var sprite = new plant.Sprite({
            src: 'sprite.png'
        });

        var obst1 = new plant.Sprite({
            src: 'dragon.png',
            x: 100,
            y: 50,
            //opacity: 0.25 
        });
        var obst2 = new plant.Sprite({
            src: 'sprite.png',
            x: 200,
            y: 100,
            //opacity: 0.5 
        });


        console.log('obst 1 opac ' + obst1.opacity);
        console.log('obst 2 opac ' + obst2.opacity);

        scene.add([obst1, obst2, sprite]);

        var myLoop = new plant.GameLoop({
            scene: scene,
            interval: 30 
        });

        myLoop.code = function(){
            sprite.x = scene.mouseX; 
            sprite.y = scene.mouseY; 
            if (
                plant.isCollision(sprite, obst1)
                //|| plant.isCollision(sprite, obst2)
                //|| plant.isCollision(sprite, obst3)
            ) {
                obst1.opacity = 0.7;
                //obst2.opacity = 0.3;
                //sprite.fadeOut();
                //myLoop.stop();
            }
            scene.update();
        };

        myLoop.start();
        

 }   
window.addEventListener('load', onPageLoad, false);

