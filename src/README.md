# FreeMove

Does away with RPG Maker MV's 48px-based grid movement and introduces fluid, responsive movement in its place. 


## Working With Existing Functionality
In an effort to reduce incompatibility with other plugins, this plugin will attempt to work with the grain of the existing architecture instead of against it. Where mechanisms already exist, this plugin will attempt to modify them as minimally as possible, rather than invent new ways of doing things to circumvent existing systems entirely.

Understandably, this is a big undertaking because movement is a foundational pillar of RPG Maker MV.


### Game_CharacterBase .x, .y, ._realX, ._realY
`.x` and `.y` represent a character's coordinates on `Game_Map`. When a character is selected to move from one tile to another, it's (`.x`, `.y`) change instantly in one frame. 

It's the job of `updateMoving()` to then adjust `._realX` and `._realY` frame-by-frame in increments of `distancePerFrame()` up to the point where `._realX` and `._realY` match the originally changed (`.x`, `.y`).

`updateMoving()` is called every frame while `isMoving()` is `true`, which is when (`.x`, `.y`) !== `._realX`, `._realY`.

## Movement Checks
All movement is performed by the `Game_CharacterBase.moveInDirection(dir)` function.

To better understand optimization, it should be noted that base RPG Maker MV performs movement 1 tile at a time, the movement occurs over many frames, and checks for collision happen only at the onset of movement. 

Because a goal of **FreeMove** is responsiveness, movement is performed one frame at a time. This means the player can begin, change, or stop movement in any frame--essential for real-time combat. 

Unfortunately, this means checks have to occur at every frame instead of at the beginning of movement.

`Game_CharacterBase.moveInDirection(dir)` performs two checks:
1. Checks for collision against tilemap.
2. Checks for collision against other characters.

### Tilemap Collisions
One advantage of moving one frame at a time is that each movement interval crosses only a fraction of a tilemap grid cell in any frame. So even though we need to check for collision every frame, we can use a heuristic to only perform a check if the character actually crossed a new tilemap grid line.

For example, we can imagine horizontal and vertical lines at every interval of x and y as in the tilemap editor. Characters traveling within any grid cell do not need to perform any tilemap collision checks; only when they approach a boundary to check if it is passable.

### Character Collision
While we can use a heuristic with tiles because their location is fixed, we cannot use the same heuristic with characters, whose position we cannot assume.

So unlike tilemap collision checks, we should expect to have to perform character collision checks every frame.

The heuristic must lie in only checking characters who are within proximity to the character. We can check every character on the map for AABB (Axis Aligned Bounding Box) overlap with the moving character, but that's an O(n) solution.

With **Quadtrees**, however, we can store character positions according to the quadrant of the map they reside in. When we perform movement, we can determine the total bounding box that the movement would span, and check for characters that reside only within the quadrant(s) that spanning boundary box overlaps in the quadtree. We limit the number of character collision checks. 

## QTree
When characters can occupy a spectrum of points along the map (and occupy a variable space themselves), collision checking calculations become much more complicated than the native `$gameMap.eventsXy(x, y)` calls to check one cell in the grid for a binary occupied / unoccupied state for collision checks.

`$gameMap.eventsXy(x, y)` doesn't suffice for this system for two reasons:
  1. Characters can occupy an indeterminate space; checking one particular location doesn't tell you much about where this character actually is.
  2. This is a O(n) call: it checks every event on the map to return a list of who's there at that point.

### Spatial Mapping
The purpose of QTrees is to make collision checking more efficient. They are a tree of nodes that partition themselves into more nodes to accomodate densely spaced areas such that each node contains a threshold maximum of collision entities. 

They aim to organize collision entities by proximity and attempt to do away with extraneous collision checking. Instead of narrowing the targets within reach of an entity by calculating the distance between each entity on the map and the interested entity, the acting entity can just check all units within its own or neighboring nodes.

[Read more.](https://www.geeksforgeeks.org/quad-tree/)


