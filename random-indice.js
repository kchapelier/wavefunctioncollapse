
/**
 *
 * @param {float[]} array
 * @param {float} r
 */
function randomIndice (array, r) {
    var sum = 0;

    for (var i = 0; i < array.length; i++) {
        sum+= array[i];
    }

    if (sum === 0) {
        for (var j = 0; j < array.length; j++) {
            array[j] = 1;
        }

        sum = array.length;
    }

    for (var j = 0; j < array.length; j++) {
        array[j] /= sum;
    }

    var i = 0;
    var x = 0;

    while (i < array.length) {
        x += array[i];
        if (r <= x) return i;
        i++;
    }

    return 0;
}

module.exports = randomIndice;
