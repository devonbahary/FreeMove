//-----------------------------------------------------------------------------
// Game_Player
//
// The game object class for the player. It contains event starting
// determinants and map scrolling functions.


// overwritten
Game_Player.prototype.getInputDirection = function() {
  return Input.dir8;
};

// overwritten
Game_Player.prototype.executeMove = function(direction) {
  this.moveFree(direction);
};

// now takes single character argument
Game_Player.prototype.checkEventTriggerTouch = function(character) {
  if (!$gameMap.isEventRunning()) {
      if (character.isEvent() && character.isTriggerIn([1, 2])) {
          if (!this.isJumping() && character.isNormalPriority()) {
              this.resetAutoMovement();
              character.start();
          }
      }
  }
};
