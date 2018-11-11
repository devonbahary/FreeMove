//=============================================================================
// FreeMove
//=============================================================================

/*:
 * @plugindesc Grid-free movement.
 * 
 * @param  QTree
 * 
 * @param   max entities
 * @desc    Max number of entities to allow in a QTree before partitioning into smaller Leaves.
 * @type    number
 * @default 2
 * @min     1
 * @parent  QTree
 * 
 * @param   min Leaf size
 * @desc    the smallest dimension of a Leaf (height or width) that can be partitioned into
 * @type    number
 * @default 1
 * @min     1
 * @parent  QTree
 * 
 * @param   display grid
 * @desc    Turn ON to display partition grid in-game. This is mostly for testing purposes.
 * @type    boolean
 * @default false
 * @parent  QTree
 * 
 * @param   grid border color
 * @desc    Specify CSS hex color (e.g., "#ff4136") for partition grid lines.
 * @type    text
 * @default #ff4136
 * @parent  QTree
 * 
 * @param   grid border thickness
 * @desc    Specify thickness of grid lines (in pixels).
 * @type    number
 * @default 1
 * @parent  QTree
 * 
 * 
 * @param   Characters
 * 
 * @param   character hitbox radius
 * @desc    default distance (in tiles) from center of characters used to calculate square hitbox
 * @type    number
 * @decimals 1
 * @default 0.5
 * @max     5
 * @min     0.1
 * @parent  Characters
*/

Math.round4 = number => Math.round(number * 10000) / 10000;

require('./Game_Map');
require('./Game_CharacterBase');
require('./Game_Character');
require('./Game_Event');
require('./Game_Follower');
require('./Game_Player');
require('./Spriteset_Map');