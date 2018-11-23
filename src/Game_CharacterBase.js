//-----------------------------------------------------------------------------
// Game_CharacterBase
//
// The superclass of Game_Character. It handles basic information, such as
// coordinates and images, shared by all characters.

const uuid = require('uuid');

Game_CharacterBase.DEFAULT_HITBOX_RADIUS = Number(PluginManager.parameters('FreeMove')['character hitbox radius']) || 0.5;

Game_CharacterBase.prototype.isDiagonal = dir => dir % 2 === 1;
Game_CharacterBase.prototype.isLeft = dir => dir % 3 === 1;
Game_CharacterBase.prototype.isRight = dir => dir % 3 === 0;
Game_CharacterBase.prototype.isUp = dir => dir > 6;
Game_CharacterBase.prototype.isDown = dir => dir < 4;
Game_CharacterBase.prototype.dirFromDxDy = (dx, dy) => {
  let dir = dx < 0 ? 4 : dx > 0 ? 6 : null;
  if (dir) dir = dy > 0 ? dir - 3 : dy < 0 ? dir + 3 : dir;
  else dir = dy > 0 ? 2 : dy < 0 ? 8 : null;
  return dir;
}


Object.defineProperties(Game_CharacterBase.prototype, {
  id: { get: function() { return this._id          }, configurable: true },
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
    if (this.isDiagonal(dir)) {
      switch(this.direction()) {
        case 2: // down 
          if (this.isLeft(dir)) this._direction = 4;
          else if (this.isRight(dir)) this._direction = 6;
          break;
        case 4: // left
          if (this.isUp(dir)) this._direction = 8;
          else if (this.isDown(dir)) this._direction = 2;
          break;
        case 6: // right
          if (this.isUp(dir)) this._direction = 8;
          else if (this.isDown(dir)) this._direction = 2;
          break;
        case 8: // up
          if (this.isLeft(dir)) this._direction = 4;
          else if (this.isRight(dir)) this._direction = 6;
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
  this._x = Math.round4(this.x + dx);
  if (collision) {
    this.checkEventTriggerTouch(collision);
    if (!wasEventRunning && $gameMap.isEventRunning()) return;
  }
  ({ dy, collision } = this.truncateDyByCollision(this.dyThisFrame()));
  this._y = Math.round4(this.y + dy);
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
  const minX = dx > 0 ? this.x2 : this.x1 + dx; 
  const maxX = dx > 0 ? this.x2 + dx : this.x1;
  
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
  if (dx > 0) {
    if (dx > nearestCollisions[0].x1 - this.x2) {
      if (nearestCollisions[0].isThrough) collision = nearestCollisions[0];
      dx = nearestCollisions[0].x1 - this.x2;
    }
  } else if (dx < 0 ) {
    if (dx < nearestCollisions[0].x2 - this.x1) {
      if (nearestCollisions[0].isThrough) collision = nearestCollisions[0];
      dx = nearestCollisions[0].x2 - this.x1;
    }
  }
  
  this.onCollision();
  return { dx, collision };
};

Game_CharacterBase.prototype.truncateDyByCollision = function(dy) {
  if (!dy) return { dy };
  const minY = dy > 0 ? this.y2 : this.y1 + dy;
  const maxY = dy > 0 ? this.y2 + dy : this.y1;

  // get collision objects
  const nearestCollisions = $gameMap.collisionsInBoundingBox(this.x1, this.x2, minY, maxY)
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
  if (dy > 0) {
    if (dy > nearestCollisions[0].y1 - this.y2) {
      if (nearestCollisions[0].isThrough) collision = nearestCollisions[0];
      dy = nearestCollisions[0].y1 - this.y2;
    }
  } else if (dy < 0 ) {
    if (dy < nearestCollisions[0].y2 - this.y1) {
      if (nearestCollisions[0].isThrough) collision = nearestCollisions[0];
      dy = nearestCollisions[0].y2 - this.y1;
    }
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

// now takes single character argument
Game_CharacterBase.prototype.checkEventTriggerTouch = function(character) {
  return false;
};

Game_CharacterBase.prototype.moveFree = function(dir) {
  const distance = this.isDiagonal(dir) ? this.distancePerFrameDiagonal() : this.distancePerFrame();
  const dx = this.isLeft(dir) ? -distance : this.isRight(dir) ? distance : 0;
  const dy = this.isUp(dir) ? -distance : this.isDown(dir) ? distance : 0;
  this.autoMove(dx, dy);
};

Game_CharacterBase.prototype.autoMove = function(dx, dy) {
  if (!dx && !dy) return;
  this.setDirection(this.dirFromDxDy(dx, dy));
  this._autoDx = dx;
  this._autoDy = dy;
};

Game_CharacterBase.prototype.moveStraight = function(dir) {
  const dx = this.isLeft(dir) ? -1 : this.isRight(dir) ? 1 : 0;
  const dy = this.isUp(dir) ? -1 : this.isDown(dir) ? 1 : 0;
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
    x1: this.x + 0.5 - this.hitboxRadius(),
    x2: this.x + 0.5 + this.hitboxRadius(),
    y1: this.y + 1 - this.hitboxRadius() * 2,
    y2: this.y + 1,
  };
};

// distance from center of characters used to calculate square hitbox
Game_CharacterBase.prototype.hitboxRadius = function() {
  return this.isTile() || this.isObjectCharacter() ? 0.5 : this._hitboxRadius || Game_CharacterBase.DEFAULT_HITBOX_RADIUS;
};

Game_CharacterBase.prototype.updateSpatialMap = function() {
  if ($gameMap) $gameMap.spatialMapUpdateEntity(this);
};
