//-----------------------------------------------------------------------------
// Spriteset_Map
//
// The set of sprites on the map screen.

const Sprite_Partition = require('./Qtree/Sprite_Partition');

Spriteset_Map.DISPLAY_PARTITION_GRID = JSON.parse(PluginManager.parameters('FreeMove')['display grid']);

// setup partition sprites
const _Spriteset_Map_createLowerLayer = Spriteset_Map.prototype.createLowerLayer;
Spriteset_Map.prototype.createLowerLayer = function() {
  _Spriteset_Map_createLowerLayer.call(this);
  if (this.displayPartitionGrid()) this.createQTree();
};

// create first partition sprite
Spriteset_Map.prototype.createQTree = function() {
  this.addChild(new Sprite_Partition($gameMap._spatialMap.qTree));
};

Spriteset_Map.prototype.displayPartitionGrid = function() {
  return Spriteset_Map.DISPLAY_PARTITION_GRID;
}