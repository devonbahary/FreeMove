//-----------------------------------------------------------------------------
// Game_Map
//
// The game object class for a map. It contains scrolling and passage
// determination functions.

const QTree = require('./Qtree');


// create new spatial map for each new map
const _Game_Map_setup = Game_Map.prototype.setup;
Game_Map.prototype.setup = function(mapId) {
    _Game_Map_setup.call(this, mapId);
    this.initSpatialMap();
    this.initTilemapCollisionGrid();
};

Game_Map.prototype.initSpatialMap = function() {
    this._spatialMap = {
        qTree: new QTree(0, this.width(), 0, this.height()),
        entityHash: {}
    };

    const addEntities = [ $gamePlayer, ...$gamePlayer.followers()._data, ...this.events(), ...this.vehicles() ];
    addEntities.forEach(entity => this.spatialMapAddEntity(entity));
};

Game_Map.prototype.initTilemapCollisionGrid = function() {
    this._tilemapCollisionObjects = this.getTilemapCollisionObjects();
    this._tilemapCollisionGrid = this.getTilemapCollisionGrid(this._tilemapCollisionObjects);
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

Game_Map.prototype.getTilemapCollisionObjects = function() {
    // get grid tile properties
    const tilemapProperty2DArray = [];
    for (let y = 0; y < $gameMap.height(); y++) {
        tilemapProperty2DArray.push([]);
        for (let x = 0; x <= $gameMap.width(); x++) {
            const tile = {
                2: this.isValid(x, y + 1) && this.isPassable(x, y, 2),
                4: this.isValid(x - 1, y) && this.isPassable(x, y, 4),
                6: this.isValid(x + 1, y) && this.isPassable(x, y, 6),
                8: this.isValid(x, y - 1) && this.isPassable(x, y, 8)
            };
            tilemapProperty2DArray[y].push(tile);
        }
    }

    // find entirely impassable tiles
    const collisionTiles2DArray = [];
    for (let y = 0; y < $gameMap.height(); y++) {
        collisionTiles2DArray.push([]);
        for (let x = 0; x <= $gameMap.width(); x++) {
            // 1 is a collision tile, 0 is a passable tile
            collisionTiles2DArray[y].push(Object.values(tilemapProperty2DArray[y][x]).some(property => property) ? 0 : 1);
        }
    }

    // create impassable tile collision objects
    const collisionObjects = [];
    for (let y = 0; y < $gameMap.height(); y++) {
        for (let x = 0; x < $gameMap.width(); x++) {
            if (collisionTiles2DArray[y][x]) {
                const potentialObject = {
                    x1: x,
                    x2: null,
                    y1: y,
                    y2: null
                };
                spanObject:
                    for (let spanY = y; spanY < $gameMap.height(); spanY++) {
                        // span right 
                        for (let spanX = x; spanX <= $gameMap.width(); spanX++) {
                            if (potentialObject.x2 && spanX > potentialObject.x2) break spanObject;
                            if (!$gameMap.isValid(spanX, spanY) || !collisionTiles2DArray[spanY][spanX]) {
                                if (!potentialObject.x2) potentialObject.x2 = spanX;
                                if (potentialObject.x2 === spanX) potentialObject.y2 = spanY + 1;
                                if (spanX < potentialObject.x2) break spanObject;
                                break;
                            } 
                        }
                    }
                
                let coveredNewGround = false;
                checkForNewGround:
                    for (let spanY = potentialObject.y1; spanY < potentialObject.y2; spanY++) {
                        for (let spanX = potentialObject.x1; spanX < potentialObject.x2; spanX++) {
                            if (collisionTiles2DArray[spanY][spanX] === 1) coveredNewGround = true;
                            collisionTiles2DArray[spanY][spanX] = 2;
                        }
                    }
                
                if (coveredNewGround) {
                    collisionObjects.push(potentialObject);
                }
            }
        }
    }

    // trim collision objects such that none overlap (minimize total surface area)
    collisionObjects.forEach(objectA => {
        let overlapX1, overlapX2;
        for (let spanX = objectA.x1; spanX < objectA.x2; spanX++) {
            let entireColumnOverlapped = true;
            for (let spanY = objectA.y1; spanY < objectA.y2; spanY++) {
                if (!collisionObjects.filter(objectB => objectB !== objectA).some(objectB => spanX >= objectB.x1 && spanX < objectB.x2 && spanY >= objectB.y1 && spanY < objectB.y2)) {
                    entireColumnOverlapped = false;
                    break;  
                } 
            }
            if (entireColumnOverlapped && !overlapX1) {
                overlapX1 = spanX;
                overlapX2 = spanX + 1;
            }
            else if (entireColumnOverlapped && overlapX2) overlapX2++;
            else if (!entireColumnOverlapped && overlapX1) {
                if (overlapX1 === objectA.x1) {
                    objectA.x1 = overlapX2;
                    break;
                }
            }
            if (overlapX2 === objectA.x2) {
                objectA.x2 = overlapX1;
                break;
            }
        }
    });

    
    // get tile border collision objects (one-way impassability)
    for (let y = 0; y < $gameMap.height(); y++) {
        for (let x = 0; x < $gameMap.width(); x++) {
            const tileProperties = tilemapProperty2DArray[y][x];
            if (!Object.values(tileProperties).some(passability => passability)) continue;

            Object.keys(tileProperties)
              .filter(dir => !tileProperties[dir])
              .forEach(dir => {
                  switch(Number(dir)) {
                      case 2:
                          return collisionObjects.push({ x1: x, x2: x + 1, y1: y + 1, y2: y + 1 });
                      case 4:
                          return collisionObjects.push({ x1: x, x2: x, y1: y, y2: y + 1 });
                      case 6:
                          return collisionObjects.push({ x1: x + 1, x2: x + 1, y1: y, y2: y + 1 });
                      case 8:
                          return collisionObjects.push({ x1: x, x2: x + 1, y1: y, y2: y });
                  }
              });
        }
    }
    
    return collisionObjects;
};

Game_Map.prototype.getTilemapCollisionGrid = function(tilemapCollisionObjects) {
    const tilemapCollisionGrid = {};
    for (let y = 0; y < $gameMap.height(); y++) {
        tilemapCollisionGrid[y] = {};
        for (let x = 0; x < $gameMap.width(); x++) {
            const overlappingCollisionObjects = tilemapCollisionObjects.filter(object => object.x1 <= x + 1 && object.x2 >= x && object.y1 <= y + 1 && object.y2 >= y);
            tilemapCollisionGrid[y][x] = overlappingCollisionObjects;
        }
    }
    return tilemapCollisionGrid;
};

Game_Map.prototype.getTilemapCollisionObjectsAtPos = function(x, y) {
    if (!$gameMap.isValid(x, y)) {
        x = Math.max(0, Math.min(x, $gameMap.width() - 1));
        y = Math.max(0, Math.min(y, $gameMap.height() - 1));
    }
    return this._tilemapCollisionGrid[y][x];
};

Game_Map.prototype.tilemapCollisionObjectsInBoundingBox = function(minX, maxX, minY, maxY) {
    let collisionObjects = [];
    for (let x = Math.floor(minX); x <= Math.floor(maxX); x++) {
        for (let y = Math.floor(minY); y <= Math.floor(maxY); y++) {
            collisionObjects = [ ...collisionObjects, ...this.getTilemapCollisionObjectsAtPos(x, y) ]; 
        }
    }
    return collisionObjects;
};

Game_Map.prototype.collisionsInBoundingBox = function(minX, maxX, minY, maxY) {
    return [
        ...this.spatialMapEntitiesInBoundingBox(minX, maxX, minY, maxY),
        ...this.tilemapCollisionObjectsInBoundingBox(minX, maxX, minY, maxY)
    ];
};

// update spatial map 
const _Game_Map_update = Game_Map.prototype.update;
Game_Map.prototype.update = function(sceneActive) {
    _Game_Map_update.call(this, sceneActive);
    this._spatialMap.qTree.update();
};
