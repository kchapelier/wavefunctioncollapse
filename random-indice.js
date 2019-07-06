"use strict";

/**
 *
 * @param {number[]} array
 * @param {float} r
 */
function randomIndice (array, r) {
  let sum = 0;
  let x = 0;
  let i = 0;

  for (; i < array.length; i++) {
    sum += array[i];
  }

  i = 0;
  r *= sum;

  while (r && i < array.length) {
    x += array[i];
    if (r <= x) {
      return i;
    }
    i++;
  }

  return 0;
}

module.exports = randomIndice;
