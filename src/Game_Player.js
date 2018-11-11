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