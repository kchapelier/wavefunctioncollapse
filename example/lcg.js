"use strict";

function normalizeSeed (seed) {
  if (typeof seed === 'number') {
    seed = Math.abs(seed);
  } else if (typeof seed === 'string') {
    const string = seed;
    seed = 0;

    for(let i = 0; i < string.length; i++) {
      seed = (seed + (i + 1) * (string.charCodeAt(i) % 96)) % 2147483647;
    }
  }

  if (seed === 0) {
    seed = 311;
  }

  return seed;
}

module.exports = function lcgRandom (seed) {
  let state = normalizeSeed(seed);

  return function () {
    const result = (state * 48271) % 2147483647;
    state = result;
    return result / 2147483647;
  };
}