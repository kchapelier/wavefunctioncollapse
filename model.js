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


Model.prototype.observe = function () {
    var min = 1000,
        argminx = -1,
        argminy = -1;

    var distribution = new Array(this.T);

    var self = this;
    var set = function set(x, y) {
        var sum = 0;
        for (var t = 0; t < self.T; t++) {
            distribution[t] = self.wave[x][y][t] ? self.stationary[t] : 0;
            sum+= distribution[t];
        }
        return sum;
    };

    for (var x = 0; x < this.FMX; x++) {
        for (var y = 0; y < this.FMY; y++)
        {
            if (this.onBoundary(x, y)) continue;

            var sum = set(x, y);

            if (sum === 0) {
                return false;
            }

            for (var t = 0; t < this.T; t++) {
                distribution[t] /= sum;
            }

            var entropy = 0;

            for (var i = 0; i < distribution.length; i++) {
                if (distribution[i] > 0) {
                    entropy+= -distribution[i] * Math.log(distribution[i]);
                }
            }

            var noise = 0.000001 * this.rng();

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

    set(argminx, argminy);

    var r = randomIndice(distribution, this.rng());
    for (var t = 0; t < this.T; t++) {
        this.wave[argminx][argminy][t] = (t === r);
    }

    this.changes[argminx][argminy] = true;

    return null;
};

/**
 *
 * @param {int} limit
 * @param {Function|null} [rng]
 * @returns {boolean}
 */
Model.prototype.run = function (limit, rng) {
    var result,
        l;

    this.clear();

    limit = limit || 0;
    this.rng = rng || Math.random;

    for (l = 0; l < limit || limit === 0; l++) {
        //console.log('iteration #' + (l + 1));

        result = this.observe();

        //console.log(result);

        if (result !== null) {
            return !!result;
        }

        while (this.propagate()) {}
    }

    return true;
};

/**
 *
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
