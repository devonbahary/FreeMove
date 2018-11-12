//-----------------------------------------------------------------------------
// Game_Map
//
// The game object class for a map. It contains scrolling and passage
// determination functions.

const QTree = require('./Qtree');
const Game_CollisionObject = require('./Qtree/Game_CollisionObject');

// create new spatial map for each new map
const _Game_Map_setup = Game_Map.prototype.setup;
Game_Map.prototype.setup = function(mapId) {
  _Game_Map_setup.call(this, mapId);
  this.initSpatialMap();
};

Game_Map.prototype.initSpatialMap = function() {
  this._spatialMap = {
    qTree: new QTree(0, this.width(), 0, this.height()),
    entityHash: {}
  };

  this._collisionObjects = this.getTilemapCollisionObjects();

  const addEntities = [ $gamePlayer, ...$gamePlayer.followers()._data, ...this.events(), ...this.vehicles() ];
  addEntities.forEach(entity => this.spatialMapAddEntity(entity));
};

Game_Map.prototype.getTilemapCollisionObjects = function() {
  const tilemapProperty2DArray = [];
  for (let y = 0; y < $gameMap.height(); y++) {
    tilemapProperty2DArray.push([]);
    for (let x = 0; x < $gameMap.width(); x++) {
      const tile = {
        2: this.isValid(x, y - 1) && this.isPassable(x, y, 2),
        4: this.isValid(x - 1, y) && this.isPassable(x, y, 4),
        6: this.isValid(x + 1, y) && this.isPassable(x, y, 6),
        8: this.isValid(x, y + 1) && this.isPassable(x, y, 8)
      };
      tilemapProperty2DArray[y].push(tile);
    }
  }

  const collisionTiles2DArray = [];
  for (let y = 0; y < $gameMap.height(); y++) {
    collisionTiles2DArray.push([]);
    for (let x = 0; x < $gameMap.width(); x++) {
      collisionTiles2DArray[y].push(Object.values(tilemapProperty2DArray[y][x]).some(property => property));
    }
  }

  const collisionObjects = [];
  for (let y = 0; y < $gameMap.height(); y++) {
    for (let x = 0; x < $gameMap.width(); x++) {
      if (!collisionTiles2DArray[y][x]) {
        if (collisionObjects.length) {
          const lastObject = collisionObjects[collisionObjects.length - 1];
          if (lastObject.x2 === x) {
            lastObject.x2 += 1;
            continue;
          }
        }
        collisionObjects.push(new Game_CollisionObject(x, x + 1, y, y + 1));
      }
    }
  }

  console.log(collisionObjects)

  return collisionObjects;
};

// update spatial map 
const _Game_Map_update = Game_Map.prototype.update;
Game_Map.prototype.update = function(sceneActive) {
  _Game_Map_update.call(this, sceneActive);
  this._spatialMap.qTree.update();
};

// add entity to the spatial map
Game_Map.prototype.spatialMapAddEntity = function(entity) {
  if (!this._spatialMap || this.isEntityInSpatialMap(entity)) return;
  if (entity instanceof Game_Follower && !entity.isVisible) return;
  if (entity instanceof Game_Vehicle && entity.isTransparent()) return;
  this._spatialMap.entityHash[entity.id] = true;
  this._spatialMap.qTree.addEntity(entity);
};

// updates entity position in spatial map
Game_Map.prototype.spatialMapUpdateEntity = function(entity) {
  if (this._spatialMap && this.isEntityInSpatialMap(entity)) this._spatialMap.qTree.updateEntity(entity);
};

// removes char from the spatial map and entity hash
Game_Map.prototype.spatialMapRemoveEntity = function(entity) {
  if (this._spatialMap && this.isEntityInSpatialMap(entity)) {
    this._spatialMap.qTree.removeEntity(entity);
    delete this._spatialMap.entityHash[entity.id];
  }
};

// determines if entity is on the spatial map
Game_Map.prototype.isEntityInSpatialMap = function(entity) {
  return this._spatialMap && this._spatialMap.entityHash[entity.id];
};

// get entities within a given bounding box in spatial map
Game_Map.prototype.spatialMapEntitiesInBoundingBox = function(minX, maxX, minY, maxY) {
  const entities = [];
  this._spatialMap.qTree.entitiesInBoundingBox(entities, minX, maxX, minY, maxY);
  return entities;
};