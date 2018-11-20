//-----------------------------------------------------------------------------
// Game_Event
//
// The game object class for an event. It contains functionality for event page
// switching and running parallel process events.

Game_Event.EVENT_COMMAND_COMMENT       = 108;

Game_Event.prototype.isCommentCode = code => code === Game_Event.EVENT_COMMAND_COMMENT;


// remove event from spatial map when cleared
const _Game_Event_clearPageSettings = Game_Event.prototype.clearPageSettings;
Game_Event.prototype.clearPageSettings = function() {
  _Game_Event_clearPageSettings.call(this);
  if ($gameMap.spatialMap) $gameMap.spatialMap.removeEntity(this);
  this.setPageHitboxRadius();
};

// add event to spatial map if applicable when new page settings
const _Game_Event_setupPageSettings = Game_Event.prototype.setupPageSettings;
Game_Event.prototype.setupPageSettings = function() {
  _Game_Event_setupPageSettings.call(this);
  $gameMap.spatialMapAddEntity(this);
  this.setPageHitboxRadius();
};

// now takes single character argument
Game_Event.prototype.checkEventTriggerTouch = function(character) {
  if (!$gameMap.isEventRunning()) {
      if (this._trigger === 2 && character === $gamePlayer) {
          if (!this.isJumping() && this.isNormalPriority()) {
              this.start();
          }
      }
  }
};

Game_Event.prototype.setPageHitboxRadius = function() {
  const regex = /<hitbox:\s*(\d{1,2}(\.\d{1,2})?)>/i;
  const hitboxComment = this.page().list.find(eventCommand => this.isCommentCode(eventCommand.code) && eventCommand.parameters[0].match(regex));
  if (hitboxComment) {
    const match = hitboxComment.parameters[0].match(regex);
    if (match[1] && Number(match[1]) > 0) {
      this._hitboxRadius = Number(match[1]);
      return;
    }
  } 
  if (this.event().meta.hitbox && Number(this.event().meta.hitbox) > 0) {
    this._hitboxRadius = Number(this.event().meta.hitbox);
  }
};

Game_Event.prototype.isEvent = function() {
  return true;
};