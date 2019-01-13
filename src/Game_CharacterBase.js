//-----------------------------------------------------------------------------
// Game_CharacterBase
//
// The superclass of Game_Character. It handles basic information, such as
// coordinates and images, shared by all characters.

const uuid = require('uuid');
const { isDown, isLeft, isRight, isUp, isDiagonal, dirFromDxDy } = require('./util');

Game_CharacterBase.DEFAULT_HITBOX_RADIUS = Number(PluginManager.parameters('FreeMove')['character hitbox radius']) || 0.5;
Game_CharacterBase.TRIGGER_HERE_OVERLAP_THRESHOLD = 0.75;


Object.defineProperties(Game_CharacterBase.prototype, {
	id: { get: function() { return this._id          }, configurable: true },
	x:  { get: function() { return Math.round4(this._x); }, configurable: true },
	y:  { get: function() { return Math.round4(this._y); }, configurable: true },
	x1: { get: function() { return this.hitbox().x1; }, configurable: true },
	x2: { get: function() { return this.hitbox().x2; }, configurable: true },
	y1: { get: function() { return this.hitbox().y1; }, configurable: true },
	y2: { get: function() { return this.hitbox().y2; }, configurable: true }
});

/*
	_id             : used in hash map in Game_Map to track characters in the spatial map
	_autoDx         : movement determined in the x-axis
	_autoDy         : movement determined in the y-axis
	_lastDir        : used to determine appropriate 4-dir in 8-dir movement
	_hitboxRadius   : used to calculate square hitbox dimensions
	_triggerHereEvents : used to keep track of overlapped events that have already been triggered
*/
const _Game_CharacterBase_initMembers = Game_CharacterBase.prototype.initMembers;
Game_CharacterBase.prototype.initMembers = function() {
	_Game_CharacterBase_initMembers.call(this);
	this._id = uuid();
	this.resetAutoMovement();
	this._lastDir = 2;
	this._hitboxRadius = this.hitboxRadius();
	this._triggerHereEvents = [];
};

Game_CharacterBase.prototype.resetAutoMovement = function() {
 	this._autoDx = this._autoDy = 0;
};

// 
const _Game_CharacterBase_isMoving = Game_CharacterBase.prototype.isMoving;
Game_CharacterBase.prototype.isMoving = function() {
  	return _Game_CharacterBase_isMoving.call(this) || this._autoDx || this._autoDy;
};

// based on pythagorean theorem
Game_CharacterBase.prototype.distancePerFrameDiagonal = function() {
  	return Math.round4(this.distancePerFrame() * Math.sqrt(2) / 2);
};

// accommodate 8-dir 
Game_CharacterBase.prototype.setDirection = function(dir) {
	if (this.isDirectionFixed() || !dir) return;
	if (this._lastDir !== dir) {
		if (isDiagonal(dir)) {
		switch(this.direction()) {
			case 2: // down 
			if (isLeft(dir)) this._direction = 4;
			else if (isRight(dir)) this._direction = 6;
			break;
			case 4: // left
			if (isUp(dir)) this._direction = 8;
			else if (isDown(dir)) this._direction = 2;
			break;
			case 6: // right
			if (isUp(dir)) this._direction = 8;
			else if (isDown(dir)) this._direction = 2;
			break;
			case 8: // up
			if (isLeft(dir)) this._direction = 4;
			else if (isRight(dir)) this._direction = 6;
			break;
		}
		} else {
			this._direction = dir;
		}
	}
	this._lastDir = dir;
	this.resetStopCount();
};

const _Game_CharacterBase_update = Game_CharacterBase.prototype.update;
Game_CharacterBase.prototype.update = function() {
	const prevX = this.x;
	const prevY = this.y;
	_Game_CharacterBase_update.call(this);
	if (prevX !== this.x || prevY !== this.y) {
		this.updateSpatialMap(this);
	}
	this.updateAutoMove(this.x - prevX, this.y - prevY);
};

const _Game_CharacterBase_updateMove = Game_CharacterBase.prototype.updateMove;
Game_CharacterBase.prototype.updateMove = function() {
	this.applyAutoMove();
	_Game_CharacterBase_updateMove.call(this);
    this.increaseSteps();
};

Game_CharacterBase.prototype.applyAutoMove = function() {
	if (!this._autoDx && !this._autoDy) return;

	let dx = this.dxThisFrame();
	let dy = this.dyThisFrame();
	const collisions = this.getCollisionsForMovement(dx, dy);

	let collision;
	const wasEventRunning = $gameMap.isEventRunning();
	({ dx, collision } = this.truncateDxByCollision(collisions, dx));
	this._x = this._x + dx;
	if (collision) {
		this.checkEventTriggerTouch(collision);
		if (!wasEventRunning && $gameMap.isEventRunning()) return;
	}
	({ dy, collision } = this.truncateDyByCollision(collisions, dy));
	this._y = this._y + dy;
	if (collision) {
        this.checkEventTriggerTouch(collision);
        if (!wasEventRunning && $gameMap.isEventRunning()) return;
    }
	this._triggerHereEvents = this._triggerHereEvents.filter(event => this.getOverlapRatioWith(event) > 0);
};

Game_CharacterBase.prototype.dxThisFrame = function() {
	  const distance = this.distancePerFrame();
	  const scalar = Math.abs(this._autoDx) + Math.abs(this._autoDy);
	  return scalar ? distance * this._autoDx / scalar : 0;
};

Game_CharacterBase.prototype.dyThisFrame = function() {
	const distance = this.distancePerFrame();
	const scalar = Math.abs(this._autoDx) + Math.abs(this._autoDy);
	return scalar ? distance * this._autoDy / scalar : 0;
};

Game_CharacterBase.prototype.getCollisionsForMovement = function (dx, dy) {
    const minX = dx === 0 ? this.x1 : Math.min(this.x1, this.x1 + dx);
    const maxX = dx === 0 ? this.x2 : Math.max(this.x2, this.x2 + dx);
    const minY = dy === 0 ? this.y1 : Math.min(this.y1, this.y1 + dy);
    const maxY = dy === 0 ? this.y2 : Math.max(this.y2, this.y2 + dy);
    return $gameMap.collisionsInBoundingBox(minX, maxX, minY, maxY);
};

Game_CharacterBase.prototype.truncateDxByCollision = function(collisions, dx) {
	if (!dx) return { dx };

	let collision = this.getCollisionHere(collisions);
	
	// get collidable in-path objects
	const nearestCollisions = collisions
		.filter(obj => (
            this.canCollideWith(obj) && // through-, debug-, priority-check
            !(obj.y2 <= this.y1 || this.y2 <= obj.y1) && // y-align check
            (dx > 0 ? obj.x1 >= this.x2 : obj.x2 <= this.x1) // in-path check
		))
		.sort((a, b) => dx > 0 ? a.x1 - b.x1 : b.x2 - a.x2);

	if (!nearestCollisions.length) return { dx, collision };

	// truncate by collision
	if (dx > 0 && dx > nearestCollisions[0].x1 - this.x2) {
		if (nearestCollisions[0].isThrough) collision = nearestCollisions[0];
		dx = nearestCollisions[0].x1 - this.x2;
		this.resetEventRandomAutonomousMovement();
	} else if (dx < 0 && dx < nearestCollisions[0].x2 - this.x1) {
		if (nearestCollisions[0].isThrough) collision = nearestCollisions[0];
		dx = nearestCollisions[0].x2 - this.x1;
		this.resetEventRandomAutonomousMovement();
	}
	
	return { dx, collision };
};

Game_CharacterBase.prototype.truncateDyByCollision = function(collisions, dy) {
	if (!dy) return { dy };

	let collision = this.getCollisionHere(collisions);
	
	// get collidable in-path objects
	const nearestCollisions = collisions
		.filter(obj => (
			this.canCollideWith(obj) && // through-, debug-, priority-check
			!(obj.x2 <= this.x1 || this.x2 <= obj.x1) && // x-align check
			(dy > 0 ? obj.y1 >= this.y2 : obj.y2 <= this.y1) // in-path check
		))
		.sort((a, b) => dy > 0 ? a.y1 - b.y1 : b.y2 - a.y2);

	if (!nearestCollisions.length) return { dy, collision };

	// truncate by collision
	if (dy > 0 && dy > nearestCollisions[0].y1 - this.y2) {
		if (nearestCollisions[0].isThrough) collision = nearestCollisions[0];
		dy = nearestCollisions[0].y1 - this.y2;
		this.resetEventRandomAutonomousMovement();
	} else if (dy < 0 && dy < nearestCollisions[0].y2 - this.y1) {
		if (nearestCollisions[0].isThrough) collision = nearestCollisions[0];
		dy = nearestCollisions[0].y2 - this.y1;
		this.resetEventRandomAutonomousMovement();
	}

	return { dy, collision };
};

Game_CharacterBase.prototype.getCollisionHere = function(collisions) {
	let collision;
	const overlappingEvents = collisions.filter(obj => !this._triggerHereEvents.includes(obj) && this.canTriggerObjHere(obj));
	if (overlappingEvents.length) {
		collision = overlappingEvents[0];
		this._triggerHereEvents.push(collision);
	}
	return collision;
};

// overwrite
Game_CharacterBase.prototype.refreshBushDepth = function() {
    if (this.isNormalPriority() && !this.isObjectCharacter() && this.isOnBush() && !this.isJumping()) {
        // removed !this.isMoving() condition; should update bushDepth at every frame
        this._bushDepth = 12;
    } else {
        this._bushDepth = 0;
    }
  };

// overwriting to use rounded coordinates
Game_CharacterBase.prototype.isOnLadder = function () {
    return $gameMap.isLadder(Math.round(this.x), Math.round(this.y));
};

// overwriting to use rounded coordinates
Game_CharacterBase.prototype.isOnBush = function () {
    return $gameMap.isBush(Math.round(this.x), Math.round(this.y));
};

// overwriting to use rounded coordinates
Game_CharacterBase.prototype.terrainTag = function () {
    return $gameMap.terrainTag(Math.round(this.x), Math.round(this.y));
};

// overwriting to use rounded coordinates
Game_CharacterBase.prototype.regionId = function () {
    return $gameMap.regionId(Math.round(this.x), Math.round(this.y));
};

// includes self-check
Game_CharacterBase.prototype.canCollideWith = function(obj) {
	if (this.isThrough() || this.isDebugThrough()) return false;
	if (obj.isThrough && obj.isThrough()) return false;
	return this.canCollideWithObject(obj);
};

// will vary with Game_Event
Game_CharacterBase.prototype.canCollideWithObject = function(obj) {
  	return !obj.isNormalPriority || (obj.isNormalPriority && obj.isNormalPriority());
};

Game_CharacterBase.prototype.canTriggerObjHere = function(obj) {
 	return obj !== this && obj.isEvent && obj.isEvent() && !obj.isNormalPriority() && this.getOverlapRatioWith(obj) > Game_CharacterBase.TRIGGER_HERE_OVERLAP_THRESHOLD;
};

Game_CharacterBase.prototype.updateAutoMove = function(dx, dy, updateByActualDistance = false) {
    if (!updateByActualDistance) {
        dx = this.dxThisFrame();
        dy = this.dyThisFrame();
    }
    if (this._autoDx) {
		if (Math.sign(this._autoDx) !== Math.sign(this._autoDx - dx)) this._autoDx = 0;
		else this._autoDx -= dx;
		if (Math.floor4(this._autoDx) === 0) this._autoDx = 0;
	}
	if (this._autoDy) {
		if (Math.sign(this._autoDy) !== Math.sign(this._autoDy - dy)) this._autoDy = 0;
		else this._autoDy -= dy;
		if (Math.floor4(this._autoDy) === 0) this._autoDy = 0;
	}
};

// reset _hitboxRadius to allow for reassignment
const _Game_CharacterBase_setImage = Game_CharacterBase.prototype.setImage;
Game_CharacterBase.prototype.setImage = function(characterName, characterIndex) {
	this._hitboxRadius = null;
	_Game_CharacterBase_setImage.call(this, characterName, characterIndex);
	this._hitboxRadius = this.hitboxRadius();
};

// reset _hitboxRadius to allow for reassignment
const _Game_CharacterBase_setTileImage = Game_CharacterBase.prototype.setTileImage;
Game_CharacterBase.prototype.setTileImage = function(tileId) {
	this._hitboxRadius = null;
	_Game_CharacterBase_setTileImage.call(this, tileId);
	this._hitboxRadius = this.hitboxRadius();
};

// now takes single character argument
Game_CharacterBase.prototype.checkEventTriggerTouch = function(character) {
  	return false;
};

Game_CharacterBase.prototype.moveFree = function(dir) {
	const distance = isDiagonal(dir) ? this.distancePerFrameDiagonal() : this.distancePerFrame();
	const dx = isLeft(dir) ? -distance : isRight(dir) ? distance : 0;
	const dy = isUp(dir) ? -distance : isDown(dir) ? distance : 0;
	this.autoMove(dx, dy);
};

Game_CharacterBase.prototype.autoMove = function(dx, dy) {
	if (!dx && !dy) return;
	this.setDirection(dirFromDxDy(dx, dy));
	this._autoDx = dx;
	this._autoDy = dy;
};

Game_CharacterBase.prototype.moveStraight = function(dir) {
	const dx = isLeft(dir) ? -1 : isRight(dir) ? 1 : 0;
	const dy = isUp(dir) ? -1 : isDown(dir) ? 1 : 0;
	this.autoMove(dx, dy);
};

Game_CharacterBase.prototype.isEvent = function() {
  	return false;
};

Game_CharacterBase.prototype.getOverlapRatioWith = function(obj) {
	if (this.x1 > obj.x2 || obj.x1 > this.x2 || this.y1 > obj.y2 || obj.y1 > this.y2) return 0;
	const overlapObj = {
		x1: Math.max(this.x1, obj.x1),
		x2: Math.min(this.x2, obj.x2),
		y1: Math.max(this.y1, obj.y1),
		y2: Math.min(this.y2, obj.y2),
	};

	const objAArea = (this.x2 - this.x1) * (this.y2 - this.y1);
	const objBArea = (obj.x2 - obj.x1) * (obj.y2 - obj.y1);
	const overlapObjArea = (overlapObj.x2 - overlapObj.x1) * (overlapObj.y2 - overlapObj.y1);

	return overlapObjArea / Math.min(objAArea, objBArea);
};

// get hitbox dimensions
Game_CharacterBase.prototype.hitbox = function() {
	return {
		x1: Math.round4(this._x + 0.5 - this.hitboxRadius()),
		x2: Math.round4(this._x + 0.5 + this.hitboxRadius()),
		y1: Math.round4(this._y + 1 - this.hitboxRadius() * 2),
		y2: Math.round4(this._y + 1)
	};
};

// distance from center of characters used to calculate square hitbox
Game_CharacterBase.prototype.hitboxRadius = function() {
  	if (this._hitboxRadius) return this._hitboxRadius;
  	return this.isTile() || this.isObjectCharacter() ? 0.5 : this._hitboxRadius || Game_CharacterBase.DEFAULT_HITBOX_RADIUS;
};

Game_CharacterBase.prototype.updateSpatialMap = function() {
  	if ($gameMap) $gameMap.spatialMapUpdateEntity(this);
};

// smart random collision
Game_CharacterBase.prototype.resetEventRandomAutonomousMovement = function() {
};