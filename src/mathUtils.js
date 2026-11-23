// Independent helpers; existing conversion behavior is preserved.

export const degToRad = function (deg) {
  return (deg * Math.PI) / 180;
};

export const radToDeg = function (rad) {
  return (rad * 180) / Math.PI;
};

export const radiansToDegrees = function (radians) {
  return (radians * 180) / Math.PI;
};

export const degreesToRadians = function (degrees) {
  return (degrees * Math.PI) / 180;
};
