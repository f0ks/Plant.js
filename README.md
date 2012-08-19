# Plant.js documentation #

## plant.Scene(options); ##

Every plant.js game should use at least one scene which is based on html canvas object.


**htmlNode (*string*)**, width (*number*), height (*number*), background (*string*)


`var myScene = new plant.Scene({
     htmlNodeId: 'my_canvas',
     background: 'black',
     width: 320,
     height: 480
});
`

## plant.Rectangle(options); ##

Creates a rectangle object.

width (*number*), height (*number*), color (*string*), x (*number*), y (*number*), zindex (*number*),


`        var myBomb = new plant.Rectangle({
            width: 3,
            height: 3,
            color: 'green'
        })
`

## plant.Sprite(options); ##

Creates a rectangle object.

**src (*string*)**, x (*number*), у (*number*), width (*number*), height (*number*), frameWidth (*number*), frameHeight (*number*), xFrame (*number*), yFrame (*number*), zindex (*number*)


`        var myPlayer = new plant.Sprite({
            x: 240, 
            y: 200, 
            width: 15,
            height: 25,
            frameWidth: 15,
            frameHeight: 25,
            xFrame: 3,
            yFrame: 0,
            src: 'player.png', 
            zindex: 2,
        })
`


# TODO: #
	opacity
    options for text: font, size
    sounds


