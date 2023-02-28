var multicanv = {
    onPageLoad: function() {

        var canv1 = new plant.Scene({
            htmlNodeId: 'canvas1',
        });
        var text1 = new plant.Text({
            x: 5,
            y: 5,
        });
        canv1.add(text1);

        var canv2 = new plant.Scene({
            htmlNodeId: 'canvas2',
        });
        var text2 = new plant.Text({
            x: 5,
            y: 5,
        });
        canv2.add(text2);

        var canv3 = new plant.Scene({
            htmlNodeId: 'canvas3',
        });
        var text3 = new plant.Text({
            x: 5,
            y: 5,
        });
        canv3.add(text3);

        var canv4 = new plant.Scene({
            htmlNodeId: 'canvas4',
        });
        var text4 = new plant.Text({
            x: 5,
            y: 5,
        });
        canv4.add(text4);

        var loop = function() {
            text1.text = canv1.mouseX + ' ' + canv1.mouseY;
            canv1.update();
            text2.text = canv2.mouseX + ' ' + canv2.mouseY;
            canv2.update();
            text3.text = canv3.mouseX + ' ' + canv3.mouseY;
            canv3.update();
            text4.text = canv4.mouseX + ' ' + canv4.mouseY;
            canv4.update();
        };

        setInterval(loop, 50);  
    },

};


window.addEventListener('load', multicanv.onPageLoad, false);
