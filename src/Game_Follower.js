//-----------------------------------------------------------------------------
// Game_Follower
//
// The game object class for a follower. A follower is an allied character,
// other than the front character, displayed in the party.

const _Game_Follower_refresh = Game_Follower.prototype.refresh;
Game_Follower.prototype.refresh = function() {
  _Game_Follower_refresh.call(this);
  if (this.isVisible()) {
    $gameMap.spatialMapUpdateEntity(this); // verify follower is in spatial map if not before
  } else {
    $gameMap.spatialMapRemoveEntity(this); // remove follower if was in spatial map
  }
};