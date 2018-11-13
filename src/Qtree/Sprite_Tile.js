//-----------------------------------------------------------------------------
// Sprite_Tile
//
// The sprite class for highlighted tiles.

const randomColor = require('randomcolor');

Sprite_Tile.TILE_COLOR     = PluginManager.parameters('FreeMove')['tile color'] || '#ff4136';

function Sprite_Tile() {
  this.initialize.apply(this, arguments);
}

Sprite_Tile.prototype = Object.create(Sprite.prototype);
Sprite_Tile.prototype.constructor = Sprite_Tile;

Sprite_Tile.prototype.initialize = function(collisionTile) {
  Sprite.prototype.initialize.call(this);
  this._tile = null;
  this.setTile(collisionTile);
};

Sprite_Tile.prototype.setTile = function(tile) {
  this._tile = tile;
  this.width = $gameMap.tileWidth() * (tile.x2 - tile.x1);
  this.height = $gameMap.tileHeight() * (tile.y2 - tile.y1);
  this.bitmap = new Bitmap(this.width, this.height);
  this.bitmap.paintOpacity = 125;
  this.bitmap.fillAll(Sprite_Tile.TILE_COLOR);
  // this.bitmap.fillAll(randomColor());
};

Sprite_Tile.prototype.update = function() {
  Sprite.prototype.update.call(this);
  this.updatePosition();
};

Sprite_Tile.prototype.updatePosition = function() {
  if (!this._tile) return;
  this.x = this.screenX();
  this.y = this.screenY();
};

Sprite_Tile.prototype.scrolledX = function() {
  return $gameMap.adjustX(this._tile.x1);
};

Sprite_Tile.prototype.scrolledY = function() {
  return $gameMap.adjustY(this._tile.y1);
};

Sprite_Tile.prototype.screenX = function() {
  var tw = $gameMap.tileWidth();
  return Math.round(this.scrolledX() * tw);
};

Sprite_Tile.prototype.screenY = function() {
  var th = $gameMap.tileHeight();
  return Math.round(this.scrolledY() * th);
};

module.exports = Sprite_Tile;