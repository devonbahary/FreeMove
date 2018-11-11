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
  _id           : used in hash map in Game_Map to track characters in the spatial map
  _hitboxRadius : distance from center of characters used to calculate square hitbox
*/
const _Game_CharacterBase_initMembers = Game_CharacterBase.prototype.initMembers;
Game_CharacterBase.prototype.initMembers = function() {
  _Game_CharacterBase_initMembers.call(this);
  this._id = uuid();
  this._hitboxRadius = Game_CharacterBase.DEFAULT_HITBOX_RADIUS;
};


// based on pythagorean theorem
Game_CharacterBase.prototype.diagonalDistancePerFrame = function() {
  return Math.round4(this.distancePerFrame() * Math.sqrt(2) / 2);
};

// // get list of chars in spatial map within given distance
// Game_CharacterBase.prototype.charsInRange = function(dx, dy) {
//   const minX = dx < 0 ? this.x1 + dx : this.x1;
//   const maxX = dx > 0 ? this.x2 + dx : this.x2;
//   const minY = dy < 0 ? this.y1 + dy : this.y1;
//   const maxY = dy > 0 ? this.y2 + dy : this.y2;
//   return $gameMap.spatialMapCharsInBoundingBox(minX, maxX, minY, maxY).filter(char => char !== this);
// };

// // truncate given distance in x-axis by collision with char or tilemap
// Game_CharacterBase.prototype.truncateXByCollision = function(dx, nearbyChars) {
//   if (!dx) return 0; // no x-movement
//   const dxTilemap = this.truncateXByTilemapCollision(dx);
//   const dxChar    = this.truncateXByCharCollision(dx, nearbyChars);
//   return dx < 0 ? Math.max(dxTilemap, dxChar) : Math.min(dxTilemap, dxChar);
// };

// // truncate given distance in y-axis by collision with char or tilemap
// Game_CharacterBase.prototype.truncateYByCollision = function(dy, nearbyChars) {
//   if (!dy) return 0; // no y-movement
//   const dyTilemap = this.truncateYByTilemapCollision(dy);
//   const dyChar    = this.truncateYByCharCollision(dy, nearbyChars);
//   return dy < 0 ? Math.max(dyTilemap, dyChar) : Math.min(dyTilemap, dyChar);
// };

// // truncate given distance in x-axis by tilemap collision
// Game_CharacterBase.prototype.truncateXByTilemapCollision = function(dx) {
//   const dirX    = dx < 0 ? 4 : 6;
//   const startX  = Math.floor(dx < 0 ? this.x1 : this.x2 - 0.0001);
//   const endX    = Math.floor((dx < 0 ? this.x1 : this.x2) + dx);
//   if (startX === endX) return dx; // no collision if did not move through tilemap gridline
//   const startY  = Math.floor(this.y1);
//   const endY    = Math.floor(this.y2 - 0.0001);
//   // find closest x collision
//   for (let x = startX; dx < 0 ? x > endX : x < endX; x = dx < 0 ? x - 1 : x + 1) {
//     for (let y = startY; y <= endY; y++) {
//       if (!$gameMap.isValid(dx < 0 ? x - 1 : x + 1, y) || !this.isMapPassable(x, y, dirX)) {
//         this.onTilemapCollision();
//         return dx < 0 ? Math.max(dx, x - this.x1) : Math.min(dx, x + 1 - this.x2);
//       }
//     }
//   }
//   return dx; // no collision
// };

// // truncate given distance in y-axis by tilemap collision
// Game_CharacterBase.prototype.truncateYByTilemapCollision = function(dy) { 
//   const dirY    = dy < 0 ? 8 : 2;
//   const startY  = Math.floor(dy < 0 ? this.y1 : this.y2 - 0.0001);
//   const endY    = Math.floor((dy < 0 ? this.y1 : this.y2) + dy);
//   if (startY === endY) return dy; // no collision if did not move through tilemap gridline
//   const startX  = Math.floor(this.x1);
//   const endX    = Math.floor(this.x2 - 0.0001);
//   // find closest y collision
//   for (let y = startY; dy < 0 ? y > endY : y < endY; y = dy < 0 ? y - 1 : y + 1) {
//     for (let x = startX; x <= endX; x++) {
//       if (!$gameMap.isValid(x, dy < 0 ? y - 1 : y + 1) || !this.isMapPassable(x, y, dirY)) {
//         this.onTilemapCollision();
//         return dy < 0 ? Math.max(dy, y - this.y1) : Math.min(dy, y + 1 - this.y2);
//       }
//     }
//   }
//   return dy; // no collision
// };

// Game_CharacterBase.prototype.onTilemapCollision = function() {
//   // 
// };


// // truncate given distance in x-axis by char collision
// Game_CharacterBase.prototype.truncateXByCharCollision = function(dx, nearbyChars) {
//   let minX, maxX;
//   if (dx < 0) {
//     minX = this.x1 + dx;
//     maxX = this.x1;
//   } else if (dx > 0) {
//     minX = this.x2;
//     maxX = this.x2 + dx;
//   }

//   const overlapChars = nearbyChars
//     .filter(char => {
//       if (char.x1 <= maxX && minX <= char.x2 && char.y1 < this.y2 && this.y1 < char.y2) {
//         this.onCharCollide(char);
//         return true;
//       }
//       return false;
//     })
//     .filter(char => {
//       const hasImpassableProperties = !char.isThrough() && char.isNormalPriority();
//       const hasValidCollisionVector = dx < 0 ? char.x2 - this.x1 <= 0 : char.x1 - this.x2 >= 0;
//       return hasImpassableProperties && hasValidCollisionVector;
//     });

//   if (overlapChars.length) {
//     if (dx < 0) {
//       const { x2 } = overlapChars.sort((a, b) => b.x2 - a.x2)[0];
//       dx = x2 - this.x1;
//     } else if (dx > 0) {
//       const { x1 } = overlapChars.sort((a, b) => a.x1 - b.x1)[0];
//       dx = x1 - this.x2;
//     }
//   }
//   return dx;
// };

// // truncate given distance in y-axis by char collision
// Game_CharacterBase.prototype.truncateYByCharCollision = function(dy, nearbyChars) {
//   let minY, maxY;
//   if (dy < 0) {
//     minY = this.y1 + dy;
//     maxY = this.y1;
//   } else if (dy > 0) {
//     minY = this.y2;
//     maxY = this.y2 + dy;
//   }

//   const overlapChars = nearbyChars
//     .filter(char => {
//       if (char.x1 < this.x2 && this.x1 < char.x2 && char.y1 <= maxY && minY <= char.y2) {
//         this.onCharCollide(char);
//         return true;
//       }
//       return false;
//     })
//     .filter(char => {
//       const hasImpassableProperties = !char.isThrough() && char.isNormalPriority();
//       const hasValidCollisionVector = dy < 0 ? char.y2 - this.y1 <= 0 : char.y1 - this.y2 >= 0;
//       return hasImpassableProperties && hasValidCollisionVector;
//     });

//   if (overlapChars.length) {
//     if (dy < 0) {
//       const { y2 } = overlapChars.sort((a, b) => b.y2 - a.y2)[0];
//       dy = y2 - this.y1;
//     } else if (dy > 0) {
//       const { y1 } = overlapChars.sort((a, b) => a.y1 - b.y1)[0];
//       dy = y1 - this.y2;
//     }
//   }
//   return dy;
// };

// Game_CharacterBase.prototype.onCharCollide = function(character) {
//   this.checkEventTriggerTouch(character);
// };

// // overwritten to accept character as argument instead of position
// Game_CharacterBase.prototype.checkEventTriggerTouch = function(character) {  
//   // 
// };

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

// used to determine hitbox dimensions
Game_CharacterBase.prototype.hitboxRadius = function() {
  return this.isTile() ? 0.5 : this._hitboxRadius;
};

Game_CharacterBase.prototype.updateSpatialMap = function() {
  if ($gameMap) $gameMap.spatialMapUpdateEntity(this);
};
