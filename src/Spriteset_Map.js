//-----------------------------------------------------------------------------
// Spriteset_Map
//
// The set of sprites on the map screen.

const Sprite_Partition = require('./Qtree/Sprite_Partition');
const Sprite_Hitbox = require('./Qtree/Sprite_Hitbox');

Spriteset_Map.DISPLAY_PARTITION_GRID = JSON.parse(PluginManager.parameters('FreeMove')['display grid']);
Spriteset_Map.DISPLAY_HITBOXES = JSON.parse(PluginManager.parameters('FreeMove')['display hitboxes']);


const _Spriteset_Map_createLowerLayer = Spriteset_Map.prototype.createLowerLayer;
Spriteset_Map.prototype.createLowerLayer = function() {
  _Spriteset_Map_createLowerLayer.call(this);
  if (Spriteset_Map.DISPLAY_PARTITION_GRID) this.createQTree();
  if (Spriteset_Map.DISPLAY_HITBOXES) this.createHitboxes();
};

// create first partition sprite
Spriteset_Map.prototype.createQTree = function() {
  this.addChild(new Sprite_Partition($gameMap._spatialMap.qTree));
};

Spriteset_Map.prototype.createHitboxes = function() {
  let entities = [
    ...$gameMap.events(),
    $gamePlayer
  ];
  if ($gamePlayer.followers().isVisible()) entities = [ ...entities, ...$gamePlayer.followers()._data ];

  this._hitboxSprites = entities.map(character => new Sprite_Hitbox(character));
  this._hitboxSprites.forEach(hitboxSprite => this.addChild(hitboxSprite));
};