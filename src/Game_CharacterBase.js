//-----------------------------------------------------------------------------
// Game_CharacterBase
//
// The superclass of Game_Character. It handles basic information, such as
// coordinates and images, shared by all characters.

const uuid = require('uuid');
const { isDown, isLeft, isRight, isUp, isDiagonal, dirFromDxDy } = require('./util');

Game_CharacterBase.DEFAULT_HITBOX_RADIUS = Number(PluginManager.parameters('FreeMove')['character hitbox radius']) || 0.5;


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
*/
const _Game_CharacterBase_initMembers = Game_CharacterBase.prototype.initMembers;
Game_CharacterBase.prototype.initMembers = function() {
  _Game_CharacterBase_initMembers.call(this);
  this._id = uuid();
  this.resetAutoMovement();
  this._lastDir = 2;
  this._hitboxRadius = this.hitboxRadius();
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
};

Game_CharacterBase.prototype.applyAutoMove = function() {
  if (!this._autoDx && !this._autoDy) return;

  const wasEventRunning = $gameMap.isEventRunning();
  let dx, dy, collision;
  ({ dx, collision } = this.truncateDxByCollision(this.dxThisFrame()));
  this._x = this._x + dx;
  if (collision) {
    this.checkEventTriggerTouch(collision);
    if (!wasEventRunning && $gameMap.isEventRunning()) return;
  }
  ({ dy, collision } = this.truncateDyByCollision(this.dyThisFrame()));
  this._y = this._y + dy;
  if (collision) this.checkEventTriggerTouch(collision);
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

Game_CharacterBase.prototype.truncateDxByCollision = function(dx) {
  if (!dx) return { dx };
  const minX = (dx > 0 ? this.x2 : this.x1 + dx) - $gameMap.tileBorderThickness(); 
  const maxX = dx > 0 ? this.x2 + dx : this.x1;
  const dir = Util.dirFromDxDy(dx, 0);
  
  // get collision objects
  const nearestCollisions = $gameMap.collisionsInBoundingBox(minX, maxX, this.y1, this.y2)
    .filter(obj => {
      // check if through
      if (obj.canCollide && !obj.canCollide()) return false;
      // check if not y-aligned
      if (obj.y2 <= this.y1 || this.y2 <= obj.y1) return false;
      // check if in path
      if (dx > 0 ? obj.x1 >= this.x2 : obj.x2 <= this.x1) return true;
      return false;
    })
    .sort((a, b) => dx > 0 ? a.x1 - b.x1 : b.x2 - a.x2);

  if (!nearestCollisions.length) return { dx };

  // truncate + send collision object
  let collision;
  if (dx > 0 && dx > nearestCollisions[0].x1 - this.x2) {
    if (nearestCollisions[0].isThrough) collision = nearestCollisions[0];
    dx = nearestCollisions[0].x1 - this.x2;
  } else if (dx < 0 && dx < nearestCollisions[0].x2 - this.x1) {
    if (nearestCollisions[0].isThrough) collision = nearestCollisions[0];
    dx = nearestCollisions[0].x2 - this.x1;
  }
  
  this.onCollision();
  return { dx, collision };
};

Game_CharacterBase.prototype.truncateDyByCollision = function(dy) {
  if (!dy) return { dy };
  const minY = (dy > 0 ? this.y2 : this.y1 + dy) - $gameMap.tileBorderThickness();
  const maxY = dy > 0 ? this.y2 + dy : this.y1;
  const dir = Util.dirFromDxDy(0, dy);

  // get collision objects
  const nearestCollisions = $gameMap.collisionsInBoundingBox(this.x1, this.x2, minY, maxY, dir)
    .filter(obj => {
      // check if through
      if (obj.canCollide && !obj.canCollide()) return false;
      // check if not x-aligned
      if (obj.x2 <= this.x1 || this.x2 <= obj.x1) return false;
      // check if in path
      if (dy > 0 ? obj.y1 >= this.y2 : obj.y2 <= this.y1) return true;
      return false;
    })
    .sort((a, b) => dy > 0 ? a.y1 - b.y1 : b.y2 - a.y2);
  if (!nearestCollisions.length) return { dy };

  // truncate + send collision object
  let collision;
  if (dy > 0 && dy > nearestCollisions[0].y1 - this.y2) {
    if (nearestCollisions[0].isThrough) collision = nearestCollisions[0];
    dy = nearestCollisions[0].y1 - this.y2;
  } else if (dy < 0 && dy < nearestCollisions[0].y2 - this.y1) {
    if (nearestCollisions[0].isThrough) collision = nearestCollisions[0];
    dy = nearestCollisions[0].y2 - this.y1;
  }

  this.onCollision();
  return { dy, collision };
};

Game_CharacterBase.prototype.updateAutoMove = function(dx, dy) {
  this.progressAutoMove(this.dxThisFrame(), this.dyThisFrame());
};

Game_CharacterBase.prototype.progressAutoMove = function(dx, dy) {
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

Game_CharacterBase.prototype.canCollide = function() {
  return !this.isThrough() && this.isNormalPriority();
};

Game_CharacterBase.prototype.isEvent = function() {
  return false;
};

Game_CharacterBase.prototype.onCollision = function() {
  return;
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
