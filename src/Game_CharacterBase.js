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
*/
const _Game_CharacterBase_initMembers = Game_CharacterBase.prototype.initMembers;
Game_CharacterBase.prototype.initMembers = function() {
  _Game_CharacterBase_initMembers.call(this);
  this._id = uuid();
  this._lastDir = 2;
};


// based on pythagorean theorem
Game_CharacterBase.prototype.diagonalDistancePerFrame = function() {
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
    this.updateAutoMove(this.x - prevX, this.y - prevY);
  }
};

const _Game_CharacterBase_updateMove = Game_CharacterBase.prototype.updateMove;
Game_CharacterBase.prototype.updateMove = function() {
  const prevX = this._realX;
  const prevY = this._realY;
  _Game_CharacterBase_updateMove.call(this);
  if (prevX !== this._realX || prevY !== this._realY) {
    this.updateSpatialMap();
  }
};

// get hitbox dimensions
Game_CharacterBase.prototype.hitbox = function() {
  return {
    x1: this.x + 0.5 - this.hitboxRadius(),
    x2: this.x + 0.5 + this.hitboxRadius(),
    y1: this.y + 0.5 - this.hitboxRadius(),
    y2: this.y + 0.5 + this.hitboxRadius(),
  };
};

// distance from center of characters used to calculate square hitbox
Game_CharacterBase.prototype.hitboxRadius = function() {
  return this.isTile() ? 0.5 : Game_CharacterBase.DEFAULT_HITBOX_RADIUS;
};

Game_CharacterBase.prototype.updateSpatialMap = function() {
  if ($gameMap) $gameMap.spatialMapUpdateEntity(this);
};
