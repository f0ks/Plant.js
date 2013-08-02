function onPageLoad() {

        var scene = new plant.Scene();

        var player = new plant.Sprite({
            src: 'megaman.png'
        });

        var dragon = new plant.Sprite({
            src: 'dragon.png',
            x: 100,
            y: 50,
            opacity: 0.25 
        });

        var crystal = new plant.Sprite({
            src: 'crystal.png',
            x: 200,
            y: 200,
            opacity: 0.5 
        });

        var pikachu = new plant.Sprite({
            src: 'pikachu.png',
            x: 100,
            y: 220,
        });

        scene.add([dragon, crystal, pikachu, player]);

        var myLoop = new plant.GameLoop({
            scene: scene,
            interval: 30 
        });

        myLoop.code = function() {
            player.x = scene.mouseX; 
            player.y = scene.mouseY; 
            if (
                plant.isCollision(player, pikachu)
                //|| plant.isCollision(sprite, obst2)
                //|| plant.isCollision(sprite, obst3)
            ) {
                pikachu.opacity = 0.7;
                console.log(pikachu.opacity);
                //obst2.opacity = 0.3;
                //sprite.fadeOut();
                //myLoop.stop();
            }
            scene.update();
        };

        myLoop.start();
        

 }   
window.addEventListener('load', onPageLoad, false);
