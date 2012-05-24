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



        canvas.addChild(txtMouse);
        canvas.addChild(cube1);


        cube1.onClick = function() {
            cube1.visible = false;
            canvas.update();
        };
        
        var loop = function() {
            txtMouse.text = canvas.mouseX + ' ' + canvas.mouseY;
            canvas.update();
        }
        setInterval(loop, 50);  

    } 
};
window.addEventListener('load', example.onPageLoad, false);
