//-----------------------------------------------------------------------------
// Game_Character
//
// The superclass of Game_Player, Game_Follower, GameVehicle, and Game_Event.


Game_Character.prototype.dxFrom = function(char) {
  const cof = Math.sign(char.x - this.x);
  const distance = Math.max(0, Math.abs(char.x - this.x) - (char.hitboxRadius() + this.hitboxRadius()));
  return cof * distance;
};

Game_Character.prototype.dyFrom = function(char) {
  const cof = Math.sign(char.y - this.y);
  const distance = Math.max(0, Math.abs(char.y - this.y) - (char.hitboxRadius() + this.hitboxRadius()));
  return cof * distance;
};

Game_Character.prototype.distanceBetween = function(char) {
  return $gameMap.distance(this.x, this.y, char.x, char.y) - (this.hitboxRadius() + char.hitboxRadius());
};