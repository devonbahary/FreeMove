//-----------------------------------------------------------------------------
// Game_Player
//
// The game object class for the player. It contains event starting
// determinants and map scrolling functions.

const { isDown, isLeft, isRight, isUp, isHorz } = require('./util');


const _Game_Player_initMembers = Game_Player.prototype.initMembers;
Game_Player.prototype.initMembers = function() {
    _Game_Player_initMembers.call(this);
    this._distanceTraveled = 0;
};

// overwrite Game_Player components of this function
Game_Player.prototype.increaseSteps = function() {
    Game_Character.prototype.increaseSteps.call(this);
};

// overwritten
Game_Player.prototype.getInputDirection = function() {
    return Input.dir8;
};

Game_Player.prototype.updateAutoMove = function (dx, dy, updateByActualDistance = false) {
    const prevRoundedDistanceTraveled = Math.floor(this._distanceTraveled);
    Game_Character.prototype.updateAutoMove.call(this, dx, dy, updateByActualDistance);
    this._distanceTraveled += Math.abs(dx) + Math.abs(dy);
    if (Math.floor(this._distanceTraveled) > prevRoundedDistanceTraveled) {
        this.onPlayerWalk(Math.floor(this._distanceTraveled) - prevRoundedDistanceTraveled);
    }
};

// called when a new "step" has been determined (player distance traveled reaches new integer)
Game_Player.prototype.onPlayerWalk = function(steps = 1) {
    $gameParty.increaseSteps(steps);
    // ↓ was in updateNonmoving, now using the event of incrementing steps
    $gameParty.onPlayerWalk(); 
    this.updateEncounterCount();
};

// overwritten
Game_Player.prototype.executeMove = function(direction) {
    this.moveFree(direction);
};

// overwritten because we can no longer use transitioning between tiles as a "nonmoving phase", 
// checks that used to happen here have been moved elsewhere, like onPlayerWalk()
Game_Player.prototype.updateNonmoving = function(wasMoving) {
    if (!$gameMap.isEventRunning()) {
        if (this.triggerAction()) {
            return;
        }
        if (!wasMoving) {
            $gameTemp.clearDestination(); // not sure what does
        }
    }
};

// overwritten to take advantage of this._triggerHereEvents
Game_Player.prototype.checkEventTriggerHere = function(triggers) {
    if (this.canStartLocalEvents()) {
        const eventsHere = this._triggerHereEvents.filter(event => event.isTriggerIn(triggers) && !event.isNormalPriority());
        if (eventsHere.length) {
            eventsHere[0].start();
        }
    }
};

Game_Player.prototype.checkEventTriggerThere = function(triggers) {
    if (this.canStartLocalEvents()) {
        var dir = this.direction();
        const minX = this.x1 + (isLeft(dir) ? -2 : 0);
        const maxX = this.x2 + (isRight(dir) ? 2 : 0);
        const minY = this.y1 + (isUp(dir) ? -2 : 0);
        const maxY = this.y2 + (isDown(dir) ? 2 : 0);

        const eventsThere = $gameMap
            .spatialMapEntitiesInBoundingBox(minX, maxX, minY, maxY)
            .filter(entity =>
                entity.isEvent() && 
                entity.isTriggerIn([0, 1, 2]) &&
                entity.isNormalPriority() &&
                this.distanceBetween(entity) <= 1.1 &&
                (isHorz(dir) ? (
                    (entity.y1 + entity.hitboxRadius()) >= minY && (entity.y2 - entity.hitboxRadius()) <= maxY // y-align check
                ) : (
                    (entity.x1 + entity.hitboxRadius()) >= minX && (entity.x2 - entity.hitboxRadius()) <= maxX // x-align check
                ))
            )
            .sort((a, b) => (
                isHorz(dir) ? (
                    isRight(dir) ? a.x1 - b.x1 : b.x2 - a.x2
                ) : (
                    isDown(dir) ? a.y1 - b.y1 : b.y2 - a.y2
                )
            ));
        
        if (eventsThere.length) {
            // start adjacent event
            const adjacentEvents = eventsThere.filter(event => this.distanceBetween(event) <= 0);
            if (adjacentEvents.length) {
                adjacentEvents[0].start();
            } else {
                // check across counter tile
                const x = Math.floor(this.x0) + (isLeft(dir) ? -1 : isRight(dir) ? 1 : 0);
                const y = Math.floor(this.y0) + (isUp(dir) ? -1 : isDown(dir) ? 1 : 0);
                console.log(`[${x}, ${y}] is counter:`, $gameMap.isCounter(x, y))
                if ($gameMap.isCounter(x, y)) {
                    const acrossCounterEvents = eventsThere.filter(event => this.distanceBetween(event) <= 1.1);
                    if (acrossCounterEvents.length) {
                        acrossCounterEvents[0].start();
                    }
                }
            }
        }
    }
};

// now takes single character argument
Game_Player.prototype.checkEventTriggerTouch = function(character) {
    if (this.canStartLocalEvents() && !$gameMap.isEventRunning() && !this.isJumping()) {
        if (character.isEvent() && character.isTriggerIn([1, 2])) {
            this.resetAutoMovement();
            character.start();
        }
    }
};
