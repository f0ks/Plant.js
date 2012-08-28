# Plant.js documentation #

----------

## OBJECTS ##

----------

## plant.Scene(options); ##

Every plant.js game should use at least one scene which is based on html canvas object.


**htmlNode (*string*)**, width (*number*), height (*number*), background (*string*)


`var myScene = new plant.Scene({
     htmlNodeId: 'my_canvas',
     background: 'black',
     width: 320,
     height: 480
});

### Methods
`.Update()`
redraw a scene

`.addChild(child)`
add a child to a scene

Theres's four types of object, which can be added to scene: rectangle, ellipse, sprite and text.



----------

## plant.Rectangle(options); ##

Creates a rectangle object.

width (*number*), height (*number*), color (*string*), x (*number*), y (*number*), zindex (*number*),


`        var myBomb = new plant.Rectangle({
            width: 3,
            height: 3,
            color: 'green'
        })
`

----------
## plant.Ellipse(options); ##

Creates an ellipse.

width (*number*), height (*number*), color (*string*), x (*number*), y (*number*), zindex (*number*),


`        var perfectCircle = new plant.Ellipse({
            width: 60,
            height: 60,
            color: '#cc66ef'
        })
`

----------

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

----------

## plant.Text(options); ##

Text node.

font (*string*), color (*string*), x (*number*), y (*number*), text (*string*), zindex (*number*)

`
        var myTxt = new plant.Text({
            x: 5,
            y: 5,
            color: '#9f9',
        });
`


----------

## PLANT'S MAIN OBJECT METHODS ##

----------


## plant.Collision(object1, object2)
returns true in case of collision between object1 and object 2

----------

## plant.Random(from, to)
returns random integer in from-to range

----------

# TODO: #
	opacity
    options for text: font, size
    sounds
    text: separate font-family and font-size, add width/height