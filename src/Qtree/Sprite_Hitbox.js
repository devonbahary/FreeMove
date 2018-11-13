//-----------------------------------------------------------------------------
// Sprite_Hitbox
//
// The sprite class for character hitboxes


Sprite_Hitbox.HITBOX_COLOR     = PluginManager.parameters('FreeMove')['hitbox color'] || 'blue';

function Sprite_Hitbox() {
  this.initialize.apply(this, arguments);
}

Sprite_Hitbox.prototype = Object.create(Sprite.prototype);
Sprite_Hitbox.prototype.constructor = Sprite_Hitbox;

Sprite_Hitbox.prototype.initialize = function(character) {
  Sprite.prototype.initialize.call(this);
  this._character = null;
  this.setCharacter(character);
};

Sprite_Hitbox.prototype.setCharacter = function(character) {
  this._character = character;
  this.anchor.x = 0.5;
  this.anchor.y = 1;
  this.width = $gameMap.tileWidth() * this._character.hitboxRadius() * 2;
  this.height = $gameMap.tileHeight() * this._character.hitboxRadius() * 2;
  this.bitmap = new Bitmap(this.width, this.height);
  this.bitmap.paintOpacity = 75;
  this.bitmap.fillAll(Sprite_Hitbox.HITBOX_COLOR);
};

Sprite_Hitbox.prototype.update = function() {
  Sprite.prototype.update.call(this);
  this.updatePosition();
};

Sprite_Hitbox.prototype.updatePosition = function() {
  if (!this._character) return;
  this.x = this._character.screenX();
  this.y = this._character.screenY() + this._character.shiftY();
};

module.exports = Sprite_Hitbox;