//-----------------------------------------------------------------------------
// Game_Character
//
// The superclass of Game_Player, Game_Follower, GameVehicle, and Game_Event.

const { isDown, isLeft, isRight, isUp } = require('./util');


Game_Character.prototype.updateAutoMove = function(dx, dy, updateByActualDistance = false) {
    Game_CharacterBase.prototype.updateAutoMove.call(this, dx, dy, this._moveRoute && !this._moveRoute.skippable);
};

// overwrite
Game_Character.prototype.moveRandom = function() {
	let dir = 5;
	while (dir === 5) dir = Math.ceil(Math.random() * 9);

	const dx = isLeft(dir) ? -1 : isRight(dir) ? 1 : 0;
	const dy = isUp(dir) ? -1 : isDown(dir) ? 1 : 0;
	this.autoMove(dx, dy);
};

// overwrite
Game_Character.prototype.moveTowardCharacter = function(character) {
    let dx = this.dxFrom(character);
    let dy = this.dyFrom(character);
	dx = Math.sign(dx) * Math.min(1, Math.abs(dx));
	dy = Math.sign(dy) * Math.min(1, Math.abs(dy));
	this.autoMove(dx, dy);
};

// overwrite
Game_Character.prototype.moveAwayFromCharacter = function(character) {
    this.autoMove(Math.sign(this.x - character.x), Math.sign(this.y - character.y));
};

Game_Character.prototype.moveTo = function(x, y) {
    if (!$gameMap.isValid(x, y)) return;
    this.autoMove(x - this.x, y - this.y);
};

Game_Character.prototype.dxFrom = function(char) {
    const cof = Math.sign(char.x0 - this.x0);
    const distance = Math.max(0, Math.abs(char.x0 - this.x0) - (char.hitboxRadius() + this.hitboxRadius()));
    return Math.round4(cof * distance);
};

Game_Character.prototype.dyFrom = function(char) {
    const cof = Math.sign(char.y0 - this.y0);
    const distance = Math.max(0, Math.abs(char.y0 - this.y0) - (char.hitboxRadius() + this.hitboxRadius()));
    return Math.round4(cof * distance);
};

Game_Character.prototype.distanceBetween = function(char) {
    return Math.round4(Math.sqrt(this.dxFrom(char) + this.dyFrom(char)));
};

Game_Character.prototype.hasLineOfSightTo = function(char) {
    const minX = Math.min(this.x0, char.x0);
    const maxX = Math.max(this.x0, char.x0);
    const minY = Math.min(this.y0, char.y0);
    const maxY = Math.max(this.y0, char.y0);
    const collisionObjects = $gameMap.collisionsInBoundingBox(minX, maxX, minY, maxY)
        .filter(obj => (
            obj !== this && 
            obj !== char &&
            obj.x1 <= maxX &&
            obj.x2 >= minX &&
            obj.y1 <= maxY &&
            obj.y2 >= minY
        ));

    const slope = this.x0 !== char.x0 ? (this.y0 - char.y0) / (this.x0 - char.x0) : null;
    
    if (slope === null) {
        return !collisionObjects.some(obj => obj.x1 >= this.x0 && obj.x2 <= this.x0);
    } else {
        const b = this.y0 - slope * this.x0;
        return !collisionObjects.some(obj => 
            (obj.y1 <= slope * obj.x1 + b && obj.y2 >= slope * obj.x1) || // x1
            (obj.y1 <= slope * obj.x2 + b && obj.y2 >= slope * obj.x2) || // x2
            (obj.x1 <= (obj.y1 - b) / slope && obj.x2 >= (obj.y1 - b) / slope) || // y1
            (obj.x1 <= (obj.y2 - b) / slope && obj.x2 >= (obj.y2 - b) / slope) // y2
        );
    }
};