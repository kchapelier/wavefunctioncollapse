"use strict";

/**
 *
 * @param {number[]} array
 * @param {number} r
 */
function randomIndice (array, r) {
    var sum = 0,
        i,
        x;

    for (i = 0; i < array.length; i++) {
        sum += array[i];
    }

    if (sum === 0) {
        for (i = 0; i < array.length; i++) {
            array[i] = 1;
        }

        sum = array.length;
    }

    for (i = 0; i < array.length; i++) {
        array[i] /= sum;
    }

    i = x = 0;

    while (i < array.length) {
        x += array[i];
        if (r <= x) {
            return i;
        }
        i++;
    }

    return 0;
}

module.exports = randomIndice;
