// image containing graphical assets
var graphics = new Image();

// texture dimensions within the loaded graphics image
var textureDimensions = {
	tallLight:{x:0,y:0,w:100,h:250},
	tallDark:{x:100,y:0,w:100,h:250},
	tallRoof:{x:200,y:120,w:100,h:100},
	shortLight:{x:200,y:0,w:100,h:120},
	shortDark:{x:300,y:0,w:100,h:120},
	shortRoof:{x:300,y:120,w:100,h:100}
};

// container for building designs
// used within the city
var buildingDesigns = {};
// the city object (has the buildings)
var city = null;

// drawing/ui elements
var canvas = null;
var ctx = null;
var stage = {w:0, h:0}; // based on canvas
var mouse = {x:0, y:0};

// runtime values
var perspective = 500; // affects "3D"-ness of buildings
var spacing = 150; // between building centers

var direction = 0; // over city
var speed = 2; // of movement over city


function init(){
	graphics.onload = handleGraphicsLoaded;
	graphics.src = "buildings.png";
}

function handleGraphicsLoaded(){
	resourcesReady();
}

function resourcesReady(){
	setupDrawingSurface();
	setupBuildingDesigns();
	setupCity();
	setupUIHandlers();
	
	// animate
	requestAnimationFrame(render);
}

function setupDrawingSurface(){
	canvas = document.getElementById("canvas");
	ctx = canvas.getContext("2d");
	
	// could potentially be something
	// other than the canvas dimensions
	stage.w = canvas.width;
	stage.h = canvas.height;
}

function setupBuildingDesigns(){

	// a building may reuse the same texture for different
	// sides, which we're doing here.  Two sides are dark
	// and two sides are light.
	
	var light = null;
	var dark = null;
	var roof = null;
	var textures = null;
	
	// tall (green) buildings
	light = new Texture(graphics, textureDimensions.tallLight);
	dark = new Texture(graphics, textureDimensions.tallDark);
	roof = new Texture(graphics, textureDimensions.tallRoof);
	textures = new BuildingTextures(roof, light, dark, dark, light);
	// using texture sizes to also define building sizes
	buildingDesigns.tall = new BuildingDesign(light.dimensions.w, light.dimensions.w, light.dimensions.h, textures);
		
	// short (yellow) buildings
	light = new Texture(graphics, textureDimensions.shortLight);
	dark = new Texture(graphics, textureDimensions.shortDark);
	roof = new Texture(graphics, textureDimensions.shortRoof);
	textures = new BuildingTextures(roof, light, dark, dark, light);
	// using texture sizes to also define building sizes
	buildingDesigns.short = new BuildingDesign(light.dimensions.w, light.dimensions.w, light.dimensions.h, textures);
}

function setupCity(){
	city = new City();
	// area containing buildings
	// based on stage size
	city.generateLayout(stage.w, stage.h);
}

function setupUIHandlers(){
	document.addEventListener("mousemove", handleMouseMove);
	document.addEventListener("click", handleClick);
}

function handleMouseMove(event){
	updateMouseFromEvent(mouse, event, canvas);
	updateDirection();
}

function handleClick(event){
	updateMouseFromEvent(mouse, event, canvas);
	updateDirection();
}

function updateDirection(){
	// direction is the angle of the
	// mouse in relation to the center
	// of the stage area
	var dx = mouse.x - stage.w/2;
	var dy = mouse.y - stage.h/2;
	direction = Math.atan2(dy, dx);
}

function updateMouseFromEvent(mouse, event, elem){
	if (elem == undefined){
		elem = document.body;
	}
	
	var isTouch = false;
	
	// touch screen events
	if (event.touches){
		if (event.touches.length){
			isTouch = true;
			mouse.x = parseInt(event.touches[0].pageX);
			mouse.y = parseInt(event.touches[0].pageY);
		}
	}else{
		// mouse events
		mouse.x = parseInt(event.clientX);
		mouse.y = parseInt(event.clientY);
	}
	
	// accounts for border
	mouse.x -= elem.clientLeft;
	mouse.y -= elem.clientTop;

	// parent offsets
	var par = elem;
	while (par !== null) {
		if (isTouch){
			// touch events offset scrolling with pageX/Y
			// so scroll offset not needed for them
			mouse.x -= parseInt(par.offsetLeft);
			mouse.y -= parseInt(par.offsetTop);
		}else{
			mouse.x += parseInt(par.scrollLeft - par.offsetLeft);
			mouse.y += parseInt(par.scrollTop - par.offsetTop);
		}

		par = par.offsetParent || null;
	}
}

function render(){
	// clear canvas
	ctx.setTransform(1,0,0,1,0,0);
	ctx.clearRect(0,0,canvas.width, canvas.height);
	
	// draw buildings within the city
	city.draw();
	
	requestAnimationFrame(render);
}

// For bug causing cos/sin failure for 0 values
function Math_cos(angle){
	return angle !== 0 ? Math.cos(angle) : 1;
}
function Math_sin(angle){
	return angle !== 0 ? Math.sin(angle) : 0;
}

// classes

/**
 * City creates and animates buildings on the screen.
 */
function City(){
	this.buildings = [];
}

/**
 * Generates buildings in the city.
 */
City.prototype.generateLayout = function(w, h){
	var x = 0;
	var y = 0;
	var xn = 1 + Math.ceil(w/spacing);
	var yn = 1 + Math.ceil(h/spacing);
	
	var design = null;
	
	for (x=0; x<xn; x++){
		for (y=0; y<yn; y++){
			// random design
			design = Math.random() > 0.5 ? buildingDesigns.short : buildingDesigns.tall;
			
			this.buildings.push(new Building(x*spacing, y*spacing, design));
		}
	}
}

/**
 * Updates building locations and draws
 * them to the screen.
 */
City.prototype.draw = function(){
	var building = null;
	
	this.buildings.sort(this.sortBuildingsMethod);
	
	// move buildings based on direction
	var dx = speed * Math_cos(direction);
	var dy = speed * Math_sin(direction);
	
	// values for wrapping buildings around
	// the screen for an infinite landscape
	var spanW = spacing*Math.ceil(1 + stage.w/spacing);
	var spanH = spacing*Math.ceil(1 + stage.h/spacing);
	
	var extentL = -stage.w/2 - spacing;
	var extentR = extentL + spanW;
	
	var extentT = -stage.h/2 - spacing;
	var extentB = extentT + spanH;

	var i = 0;
	var n = this.buildings.length;
	for (i=0; i<n; i++){
		building = this.buildings[i];
		
		// move
		building.x -= dx;
		building.y -= dy;
		
		// wrap around if outside borders
		if (building.x > extentR){
			building.x -= spanW;
		}else if (building.x < extentL){
			building.x += spanW;
		}
		
		if (building.y > extentB){
			building.y -= spanH;
		}else if (building.y < extentT){
			building.y += spanH;
		}
		
		// draw into canvas around center point
		building.draw(stage.w/2, stage.h/2);
	}
}

/**
 * Sort method used to determine the order 
 * in which buildings are drawn.
 */
City.prototype.sortBuildingsMethod = function(a, b){
	var da = Math.abs(a.x) + Math.abs(a.y);
	var db = Math.abs(b.x) + Math.abs(b.y)
	if (da < db){
		return 1;
	}else if (da > db){
		return -1;
	}else{
		return 0;
	}
}

/**
 * A Building is a structure within a city
 * based on a BuildingDesign.
 */
function Building(x, y, design){
	this.x = x;
	this.y = y;
	this.design = design;
}

/**
 * Draws the building on the screen.
 */
Building.prototype.draw = function(offsetX, offsetY){
	
	// the smaller the perspective value
	// the greater the perspective effect
	var perspX = this.x/perspective;
	var perspY = this.y/perspective;
	
	// building locations are actually based
	// on the top-left of their base, not
	// their center so as we offset them from
	// the center of the stage, they still
	// seem a little off visually.
	var x = this.x + offsetX;
	var y = this.y + offsetY;
	var w = this.design.w;
	var h = this.design.h;
	var tall = this.design.tall;
	var tw = 0; // texture width/height
	var th = 0;
	
	var texture = null;
	// only 3 sides of a building are ever seen at
	// one time so only north or south, or east
	// or west are drawn with the roof, never both
	// north and south, or east and west
	
	// east or west sides
	if (perspX < 0){
		texture = this.design.textures.east;
		tw = texture.dimensions.w;
		th = texture.dimensions.h;
		texture.draw(0, -h/tw, -perspX*tall/th, -perspY*tall/th, x+w + tall*perspX, y+h + tall*perspY);
	}else{
		texture = this.design.textures.west;
		tw = texture.dimensions.w;
		th = texture.dimensions.h;
		texture.draw(0, h/tw, -perspX*tall/th, -perspY*tall/th, x + tall*perspX, y + tall*perspY);
	}
	
	// north or south sides
	if (perspY < 0){
		texture = this.design.textures.south;
		tw = texture.dimensions.w;
		th = texture.dimensions.h;
		texture.draw(w/tw, 0, -perspX*tall/th, -perspY*tall/th, x + perspX*tall, y+h + tall*perspY);
	}else{
		texture = this.design.textures.north;
		tw = texture.dimensions.w;
		th = texture.dimensions.h;
		texture.draw(-w/tw, 0, -perspX*tall/th, -perspY*tall/th, x+w + perspX*tall, y + tall*perspY);
	}
	
	// top (roof)
	texture = this.design.textures.roof;
	tw = texture.dimensions.w;
	th = texture.dimensions.h;
	texture.draw(w/tw, 0, 0, h/th, x + tall*perspX, y + tall*perspY);
}

/**
 * Defines the "blueprint" of a building. Many
 * Building instances may use the same design.
 */
function BuildingDesign(w, h, tall, textures){
	this.w = w;
	this.h = h;
	this.tall = tall;
	this.textures = textures;
}

/**
 * Contains the textures used for the various
 * faces of a building.
 */
function BuildingTextures(roof, north, east, south, west){
	this.roof = roof;
	this.north = north;
	this.east = east || this.north;
	this.south = south || this.north;
	this.west = west || this.east;
}


/**
 * A graphical element within an Image which
 * contains many texture assets.
 */
function Texture(image, dimensions){
	this.image = image;
	this.dimensions = dimensions;
}

Texture.prototype.draw = function(a,b,c,d,x,y){
	ctx.setTransform(a,b,c,d,x,y);
	ctx.drawImage(this.image, 
		this.dimensions.x, this.dimensions.y, this.dimensions.w, this.dimensions.h,
		0, 0, this.dimensions.w, this.dimensions.h);
};

/**
 * requestAnimationFrame polyfill by Erik Möller
 * http://my.opera.com/emoller/blog/2011/12/20/requestanimationframe-for-smart-er-animating
 */
(function() {
    var lastTime = 0;
    var vendors = ['ms', 'moz', 'webkit', 'o'];
    for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
        window.cancelRequestAnimationFrame = window[vendors[x]+
          'CancelRequestAnimationFrame'];
    }

    if (!window.requestAnimationFrame)
        window.requestAnimationFrame = function(callback, element) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            var id = window.setTimeout(function() { callback(currTime + timeToCall); }, 
              timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };

    if (!window.cancelAnimationFrame)
        window.cancelAnimationFrame = function(id) {
            clearTimeout(id);
        };
}())
