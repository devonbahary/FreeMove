//-----------------------------------------------------------------------------
// Game_CollisionObject
//
// The tilemap collision object class.


function Game_CollisionObject() {
  this.initialize.apply(this, arguments);
};

Game_CollisionObject.prototype.initialize = function(x1, x2, y1, y2) {
  this.x1 = x1;
  this.x2 = x2;
  this.y1 = y1;
  this.y2 = y2;
};

module.exports = Game_CollisionObject;