//-----------------------------------------------------------------------------
// Game_Event
//
// The game object class for an event. It contains functionality for event page
// switching and running parallel process events.


// remove event from spatial map when cleared
const _Game_Event_clearPageSettings = Game_Event.prototype.clearPageSettings;
Game_Event.prototype.clearPageSettings = function() {
  _Game_Event_clearPageSettings.call(this);
  if ($gameMap.spatialMap) $gameMap.spatialMap.removeEntity(this);
};

// add event to spatial map if applicable when new page settings
const _Game_Event_setupPageSettings = Game_Event.prototype.setupPageSettings;
Game_Event.prototype.setupPageSettings = function() {
  _Game_Event_setupPageSettings.call(this);
  $gameMap.spatialMapAddEntity(this);
};
