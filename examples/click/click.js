var example = {
    onPageLoad: function() {

        var txtMouse = new plant.Text({
            x: 3,
            y: 3,
            color: 'white'
        });

        var canvas = new plant.Scene({
            htmlNodeId: 'canvas',
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

        canvas.addChild(txtMouse);
        canvas.addChild(cube1);
        canvas.addChild(cube2);
        canvas.addChild(cube3);
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
