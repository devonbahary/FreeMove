//-----------------------------------------------------------------------------
// Game_Character
//
// The superclass of Game_Player, Game_Follower, GameVehicle, and Game_Event.

const { isDown, isLeft, isRight, isUp } = require('./util');


const _Game_Character_initMembers = Game_Character.prototype.initMembers
Game_Character.prototype.initMembers = function() {
    _Game_Character_initMembers.call(this);
    this.clearPathfinding();
};

const _Game_Character_update = Game_Character.prototype.update;
Game_Character.prototype.update = function() {
    if (!this.isMoving() && this._pathFinding.length) {
        const nextDestination = this._pathFinding.shift();
        this.moveTo(nextDestination.x, nextDestination.y);
    }
    _Game_Character_update.call(this);
};

Game_Character.prototype.updateAutoMove = function(dx, dy, updateByActualDistance = false) {
    Game_CharacterBase.prototype.updateAutoMove.call(this, dx, dy, this._moveRoute && !this._moveRoute.skippable);
};

// overwrite
Game_Character.prototype.moveRandom = function() {
	let dir = 5;
	while (dir === 5) dir = Math.ceil(Math.random() * 9);

	const dx = isLeft(dir) ? -1 : isRight(dir) ? 1 : 0;
	const dy = isUp(dir) ? -1 : isDown(dir) ? 1 : 0;
	this.autoMove(dx, dy);
};

// overwrite
Game_Character.prototype.moveTowardCharacter = function(character) {
    let dx = this.dxFrom(character);
    let dy = this.dyFrom(character);
	dx = Math.sign(dx) * Math.min(1, Math.abs(dx));
	dy = Math.sign(dy) * Math.min(1, Math.abs(dy));
	this.autoMove(dx, dy);
};

// overwrite
Game_Character.prototype.moveAwayFromCharacter = function(character) {
    this.autoMove(Math.sign(this.x - character.x), Math.sign(this.y - character.y));
};

// move directly to position, or defer to pathfinding if out of line of sight
Game_Character.prototype.moveTo = function(x, y) {
    if (!$gameMap.isValid(x, y)) return;
    if (this.hasLineOfSightTo({ x0: x + 0.5, y0: y + 0.5 })) {
        this.autoMove(x - this.x, y - this.y);
    } else {
        this.findPathTo(x, y);
    }
};

Game_Character.prototype.dxFrom = function(char) {
    const cof = Math.sign(char.x0 - this.x0);
    const distance = Math.max(0, Math.abs(char.x0 - this.x0) - (char.hitboxRadius() + this.hitboxRadius()));
    return Math.round4(cof * distance);
};

Game_Character.prototype.dyFrom = function(char) {
    const cof = Math.sign(char.y0 - this.y0);
    const distance = Math.max(0, Math.abs(char.y0 - this.y0) - (char.hitboxRadius() + this.hitboxRadius()));
    return Math.round4(cof * distance);
};

Game_Character.prototype.distanceBetween = function(char) {
    return Math.round4(Math.sqrt(this.dxFrom(char) + this.dyFrom(char)));
};

Game_Character.prototype.hasLineOfSightTo = function(char) {
    const minX = Math.min(this.x0, char.x0);
    const maxX = Math.max(this.x0, char.x0);
    const minY = Math.min(this.y0, char.y0);
    const maxY = Math.max(this.y0, char.y0);
    const collisionObjects = $gameMap
        .collisionsInBoundingBox(minX, maxX, minY, maxY)
        .filter(obj => (
            obj !== this && 
            obj !== char &&
            obj.x1 <= maxX &&
            obj.x2 >= minX &&
            obj.y1 <= maxY &&
            obj.y2 >= minY
        ));

    const slope = this.x0 !== char.x0 ? (this.y0 - char.y0) / (this.x0 - char.x0) : null;
    
    if (slope === null) {
        return !collisionObjects.some(obj => obj.x1 >= this.x0 && obj.x2 <= this.x0);
    } else {
        const b = this.y0 - slope * this.x0;
        return !collisionObjects.some(obj => 
            (obj.y1 <= slope * obj.x1 + b && obj.y2 >= slope * obj.x1) || // x1
            (obj.y1 <= slope * obj.x2 + b && obj.y2 >= slope * obj.x2) || // x2
            (obj.x1 <= (obj.y1 - b) / slope && obj.x2 >= (obj.y1 - b) / slope) || // y1
            (obj.x1 <= (obj.y2 - b) / slope && obj.x2 >= (obj.y2 - b) / slope) // y2
        );
    }
};

Game_Character.prototype.clearPathfinding = function() {
    this._pathFinding = [];
};

// A* pathfinding
Game_Character.prototype.findPathTo = function(goalX, goalY) {
    if (!$gameMap.isValid(goalX, goalY)) return;
    
    // g = the movement cost to move from the starting point to a given square on the grid, following the path generated to get there
    // h = the estimated movement cost to move from that given square on the grid to the final destination (the heuristic)
    // f = sum of g + h
    const startX = Math.round(this.x);
    const startY = Math.round(this.y);

    const openList = [];
    const closedList = [];

    const startNode = {
        tile: $gameMap.tileAt(startX, startY),
        x: startX,
        y: startY,
        g: 0
    };
    openList.push(startNode);

    while (openList.length) {
        // currentnode in openList with lowest F score
        const currentNode = openList.sort((a, b) => a.f - b.f).shift();
        closedList.push(currentNode);

        // end condition
        if (currentNode.x === goalX && currentNode.y === goalY) {
            break;
        }

        // get neighboring nodes
        Object.keys(currentNode.tile)
            .forEach(dir => {
                const x = currentNode.x + (isLeft(dir) ? -1 : isRight(dir) ? 1 : 0);
                const y = currentNode.y + (isUp(dir) ? -1 : isDown(dir) ? 1 : 0);
                const adjacentTile = $gameMap.tileAt(x, y);

                // skip if untraversable
                if (!currentNode.tile[dir] || !adjacentTile[this.reverseDir(dir)]) return;

                // skip if already in closedList
                if (closedList.some(closedNode => closedNode.x === x && closedNode.y === y)) return;

                const g = currentNode.g + 1;
                const h = Math.abs(goalX - x) + Math.abs(goalY - y);
                const f = g + h;

                const existingOpenNode = openList.find(openNode => openNode.x === x && openNode.y === y);
                if (existingOpenNode && existingOpenNode.f > f) {
                    // if new path to neighbor is shorter (< f score), update with shorter path + new parent
                    existingOpenNode.f = f;
                    existingOpenNode.parent = currentNode;
                } else if (!existingOpenNode) {
                    // if neighbor is not in openList, add
                    openList.push({
                        tile: adjacentTile,
                        parent: currentNode,
                        x,
                        y,
                        f,
                        g
                    });
                }
            });
    }

    const lastNode = closedList[closedList.length - 1];
    // fail condition
    if (lastNode.x !== goalX || lastNode.y !== goalY) {
        return;
    }

    const path = [lastNode];
    while (path[0].parent) {
        path.unshift(path[0].parent);
    }
    
    this._pathFinding = path.map(node => ({ x: node.x, y: node.y }));
};