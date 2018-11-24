module.exports = {
  isDiagonal: dir => dir % 2 === 1,
  isLeft: dir => dir % 3 === 1,
  isRight: dir => dir % 3 === 0,
  isUp: dir => dir > 6,
  isDown: dir => dir < 4,
  dirFromDxDy: (dx, dy) => {
    let dir = dx < 0 ? 4 : dx > 0 ? 6 : null;
    if (dir) dir = dy > 0 ? dir - 3 : dy < 0 ? dir + 3 : dir;
    else dir = dy > 0 ? 2 : dy < 0 ? 8 : null;
    return dir;
  }
};