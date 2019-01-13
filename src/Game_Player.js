//-----------------------------------------------------------------------------
// Game_Player
//
// The game object class for the player. It contains event starting
// determinants and map scrolling functions.


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
// now takes single character argument
Game_Player.prototype.checkEventTriggerTouch = function(character) {
    if (this.canStartLocalEvents() && !$gameMap.isEventRunning() && !this.isJumping()) {
        if (character.isEvent() && character.isTriggerIn([1, 2])) {
            this.resetAutoMovement();
            character.start();
        }
    }
};
