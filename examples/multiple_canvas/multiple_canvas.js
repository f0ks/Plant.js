var multicanv = {
    onPageLoad: function() {

        var canv1 = new plant.Scene({
            htmlNodeId: 'canvas1',
        });
        canv1.update();

        var canv2 = new plant.Scene({
            htmlNodeId: 'canvas2',
        });
        canv2.update();

        var canv3 = new plant.Scene({
            htmlNodeId: 'canvas3',
        });
        canv3.update();

        var canv4 = new plant.Scene({
            htmlNodeId: 'canvas4',
        });
        canv4.update();
    }
};


window.addEventListener('load', multicanv.onPageLoad, false);
