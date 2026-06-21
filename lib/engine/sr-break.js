function isBreakAbove(lastClose, prevClose, level) {
  return lastClose > level && prevClose <= level;
}

function isBreakBelow(lastClose, prevClose, level) {
  return lastClose < level && prevClose >= level;
}

module.exports = {
  isBreakAbove,
  isBreakBelow,
};
