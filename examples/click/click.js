var example = {
    onPageLoad: function() {

        var canvas = new plant.Scene({
            htmlNodeId: 'canvas',
        });

        var cube1 = new plant.Rectangle({
            x: 100,
            y: 100,
        });

        cube1.onClick = function() {
            console.log('yes');
        };

        canvas.addChild(cube1);

        var cube2 = new plant.Rectangle({
            x: 120,
            y: 120,
            color: 'red'
        });
        canvas.addChild(cube2);

        canvas.update();

    } 
};
window.addEventListener('load', example.onPageLoad, false);
