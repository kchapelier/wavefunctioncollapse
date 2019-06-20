"use strict";

function normalizeSeed (seed) {
  if (typeof seed === 'number') {
    seed = Math.abs(seed);
  } else if (typeof seed === 'string') {
    var string = seed;
    seed = 0;

    for(var i = 0; i < string.length; i++) {
      seed = (seed + (i + 1) * string.charCodeAt(i)) % 2147483647;
    }
  }

  if (seed === 0) {
    seed = 311;
  }

  return seed;
}

module.exports = function lcgRandom (seed) {
  var state = normalizeSeed(seed);

  return function () {
    var result = (state * 48271) % 2147483647;
    state = result;
    return result / 2147483647;
  };
}