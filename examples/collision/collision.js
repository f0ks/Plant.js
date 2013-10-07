function onPageLoad() {

        var scene = new plant.Scene();

        var player = new plant.Sprite({
            src: 'megaman.png',
            x: 300,
            y: 300
        });

        var dragon = new plant.Sprite({
            src: 'dragon.png',
            x: 100,
            y: 50,
        });

        var crystal = new plant.Sprite({
            src: 'crystal.png',
            x: 200,
            y: 200,
            angle: 30
        });

        var pikachu = new plant.Sprite({
            src: 'pikachu.png',
            x: 100,
            y: 220,
        });

        var rect = new plant.Rectangle({color: "#22aa44", angle: 45, x: 200, y: 120});
        scene.add(rect);

        var el = new plant.Ellipse({color: "#ccee22", opacity: 0.6, angle: 0, x: 10, y:10, width: 30, height: 60});
        scene.add(el);

        scene.add([dragon, crystal, pikachu, player]);

        var myLoop = new plant.GameLoop({
            scene: scene,
            interval: 30 
        });

        myLoop.code = function() {
            player.x = scene.mouseX; 
            player.y = scene.mouseY; 
            if (plant.isCollision(player, pikachu)) {
                pikachu.opacity = 0.25;
            }
            if (plant.isCollision(player, dragon)) {
                dragon.opacity = 0.25;
            }
            if (plant.isCollision(player, crystal)) {
                crystal.opacity = 0.25;
            }
            scene.update();
        };

        myLoop.start();
        

 }   
window.addEventListener('load', onPageLoad, false);
