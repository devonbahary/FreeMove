//-----------------------------------------------------------------------------
// Game_Party
//
// The game object class for the party. Information such as gold and items is
// included.


Game_Party.prototype.increaseSteps = function(steps = 1) {
    this._steps += steps;
};

Game_Party.prototype.steps = function() {
    return Math.floor(this._steps);
};