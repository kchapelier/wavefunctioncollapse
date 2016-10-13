"use strict";

var randomIndice = require('./random-indice');

var Model = function Model () {};

Model.prototype.initiliazedField = false;
Model.prototype.generationComplete = false;

Model.prototype.wave = null;
Model.prototype.changes = null;
Model.prototype.stationary = null;

Model.prototype.FMX = 0;
Model.prototype.FMY = 0;
Model.prototype.T = 0;

Model.prototype.periodic = false;

/**
 *
 * @param {Function} rng Random number generator function
 * @protected
 * @returns {*}
 */
Model.prototype.observe = function (rng) {
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

            noise = 0.000001 * rng();

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

    r = randomIndice(distribution, rng());
    for (t = 0; t < this.T; t++) {
        this.wave[argminx][argminy][t] = (t === r);
    }

    this.changes[argminx][argminy] = true;

    return null;
};

/**
 * Execute a single iteration
 * @param {Function} rng Random number generator function
 * @protected
 * @returns {*}
 */
Model.prototype.singleIteration = function (rng) {
    var result = this.observe(rng);

    if (result !== null) {
        this.generationComplete = result;

        return !!result;
    }

    while (this.propagate()) {}

    return null;
};

/**
 * Execute a fixed number of iterations. Stop when the generation is successful or reaches a contradiction.
 * @param {int} [iterations=0] Maximum number of iterations to execute (0 = infinite)
 * @param {Function|null} [rng=Math.random] Random number generator function
 * @returns {boolean} Success
 */
Model.prototype.iterate = function (iterations, rng) {
    var result,
        i;

    if (!this.initiliazedField) {
        this.clear();
    }

    iterations = iterations || 0;
    rng = rng || Math.random;

    for (i = 0; i < iterations || iterations === 0; i++) {
        result = this.singleIteration(rng);

        if (result !== null) {
            return !!result;
        }
    }

    return true;
};

/**
 * Execute a complete new generation
 * @param {Function|null} [rng=Math.random] Random number generator function
 * @returns {boolean} Success
 */
Model.prototype.generate = function (rng) {
    var result;

    rng = rng || Math.random;

    this.clear();

    while (true) {
        result = this.singleIteration(rng);

        if (result !== null) {
            return !!result;
        }
    }
};

/**
 * Check whether the previous generation completed successfully
 * @returns {boolean}
 */
Model.prototype.isGenerationComplete = function () {
    return this.generationComplete;
};

/**
 * Clear the internal state to start a new generation
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

    this.initiliazedField = true;
    this.generationComplete = false;
};

module.exports = Model;
