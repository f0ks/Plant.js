var example = {
    onPageLoad: function() {

        var txtMouse = new plant.Text({
            x: 3,
            y: 3,
            color: 'white'
        });

        var canvas = new plant.Scene({
            htmlNodeId: 'canvas',
            width: 320,
            height: 480  
        });

        var crystal = new plant.Sprite({
            src: 'crystal.png',
            x: 100,
            y: 100
        });

        var cube1 = new plant.Rectangle({
            x: 120,
            y: 120,
            width: 30,
            height: 30,
        });

        var cube2 = new plant.Rectangle({
            x: 80,
            y: 10,
            width: 60,
            height: 40,
            color: 'green'
        });

        var cube3 = new plant.Rectangle({
            x: 110,
            y: 30,
            width: 50,
            height: 60,
            color: 'blue'
        });

        canvas.add(txtMouse);
        canvas.add(cube1);
        canvas.add(cube2);
        canvas.add(cube3);
        canvas.add(crystal);
        canvas.update();

        cube1.onClick = function() {
            cube1.visible = false;
            canvas.update();
        };

        cube2.onClick = function() {
            cube2.color = 'red';
            canvas.update();
        };

        cube3.onClick = function() {
            cube3.color = 'yellow';
            canvas.update();
        };

    } 
};
window.addEventListener('load', example.onPageLoad, false);
