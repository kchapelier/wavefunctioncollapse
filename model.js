"use strict";

var randomIndice = require('./random-indice');

var Model = function Model () {};

Model.prototype.rng = null;
Model.prototype.wave = null;
Model.prototype.changes = null;
Model.prototype.stationary = null;

Model.prototype.FMX = 0;
Model.prototype.FMY = 0;
Model.prototype.T = 0;
Model.prototype.limit = 0;

Model.prototype.periodic = false;

/**
 * @protected
 * @returns {*}
 */
Model.prototype.observe = function () {
    var min = 1000,
        argminx = -1,
        argminy = -1,
        distribution = new Array(this.T),
        entropy,
        noise,
        sum,
        wavex,
        r,
        x,
        y,
        t;

    for (x = 0; x < this.FMX; x++) {
        wavex = this.wave[x];
        for (y = 0; y < this.FMY; y++) {
            if (this.onBoundary(x, y)) {
                continue;
            }

            sum = 0;

            for (t = 0; t < this.T; t++) {
                distribution[t] = wavex[y][t] ? this.stationary[t] : 0;
                sum+= distribution[t];
            }

            if (sum === 0) {
                return false;
            }

            for (t = 0; t < this.T; t++) {
                distribution[t] /= sum;
            }

            entropy = 0;

            for (var i = 0; i < distribution.length; i++) {
                if (distribution[i] > 0) {
                    entropy+= -distribution[i] * Math.log(distribution[i]);
                }
            }

            noise = 0.000001 * this.rng();

            if (entropy > 0 && entropy + noise < min)
            {
                min = entropy + noise;
                argminx = x;
                argminy = y;
            }
        }
    }

    if (argminx === -1 && argminy === -1) {
        return true;
    }

    for (t = 0; t < this.T; t++) {
        distribution[t] = this.wave[argminx][argminy][t] ? this.stationary[t] : 0;
    }

    r = randomIndice(distribution, this.rng());
    for (t = 0; t < this.T; t++) {
        this.wave[argminx][argminy][t] = (t === r);
    }

    this.changes[argminx][argminy] = true;

    return null;
};

/**
 * Start the generation
 * @param {int} [limit=0] Maximum number of interations. 0 ensures a complete generation.
 * @param {Function|null} [rng=Math.random] Random number generator function
 * @returns {boolean} Success
 */
Model.prototype.run = function (limit, rng) {
    var result,
        l;

    this.clear();

    limit = limit || 0;
    this.rng = rng || Math.random;

    for (l = 0; l < limit || limit === 0; l++) {
        result = this.observe();

        if (result !== null) {
            return !!result;
        }

        while (this.propagate()) {}
    }

    return true;
};

/**
 * Clear the internal state
 * @protected
 */
Model.prototype.clear = function () {
    var x,
        y,
        t;

    for (x = 0; x < this.FMX; x++) {
        for (y = 0; y < this.FMY; y++) {
            for (t = 0; t < this.T; t++) {
                this.wave[x][y][t] = true;
            }

            this.changes[x][y] = false;
        }
    }
};

module.exports = Model;
