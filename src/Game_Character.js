//-----------------------------------------------------------------------------
// Game_Character
//
// The superclass of Game_Player, Game_Follower, GameVehicle, and Game_Event.

const Util = require('./util');


Game_Character.prototype.updateAutoMove = function(dx, dy) {
  if (this._moveRoute && !this._moveRoute.skippable) {
    this.progressAutoMove(dx, dy);
  } else {
    Game_CharacterBase.prototype.updateAutoMove.call(this, dx, dy);
  }
};

Game_Character.prototype.moveRandom = function() {
  let dir = 5;
  while (dir === 5) dir = Math.ceil(Math.random() * 9);

  const dx = Util.isLeft(dir) ? -1 : Util.isRight(dir) ? 1 : 0;
  const dy = Util.isUp(dir) ? -1 : Util.isDown(dir) ? 1 : 0;
  this.autoMove(dx, dy);
};

Game_Character.prototype.moveTowardCharacter = function(character) {
  let dx = this.dxFrom(character);
  let dy = this.dyFrom(character);
  dx = Math.sign(dx) * Math.min(1, Math.abs(dx));
  dy = Math.sign(dy) * Math.min(1, Math.abs(dy));
  this.autoMove(dx, dy);
};

Game_Character.prototype.moveAwayFromCharacter = function(character) {
  this.autoMove(Math.sign(this.x - character.x), Math.sign(this.y - character.y));
};

Game_Character.prototype.moveTo = function(x, y) {
  if (!$gameMap.isValid(x, y)) return;
  this.autoMove(x - this.x, y - this.y);
};

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