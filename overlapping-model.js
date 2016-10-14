"use strict";

var Model = require('./model');

/**
 *
 * @param {Uint8Array} data The RGBA data of the source image
 * @param {int} dataWidth The width of the source image
 * @param {int} dataHeight The height of the source image
 * @param {int} N Size of the patterns
 * @param {int} width The width of the generation
 * @param {int} height The height of the generation
 * @param {boolean} periodicInput Whether the source image is to be considered as periodic / as a repeatable texture
 * @param {boolean} periodicOutput Whether the generation should be periodic / a repeatable texture
 * @param {int} symmetry Allowed symmetries from 1 (no symmetry) to 8 (all mirrored / rotated variations)
 * @param {int} [ground=0] Id of the specific pattern to use as the bottom of the generation ( see https://github.com/mxgmn/WaveFunctionCollapse/issues/3#issuecomment-250995366 )
 * @constructor
 */
var OverlappingModel = function OverlappingModel (data, dataWidth, dataHeight, N, width, height, periodicInput, periodicOutput, symmetry, ground) {
    var i,
        x,
        y,
        t,
        k,
        t2;

    this.N = N;
    this.FMX = width;
    this.FMY = height;
    this.periodic = periodicOutput;

    var sample = new Array(dataWidth);
    for (i = 0; i < dataWidth; i++) {
        sample[i] = new Array(dataHeight);
    }

    this.colors = [];
    var colorMap = {};

    for (y = 0; y < dataHeight; y++) {
        for (x = 0; x < dataWidth; x++) {
            var indexPixel = (y * dataWidth + x) * 4;
            var color = [data[indexPixel], data[indexPixel + 1], data[indexPixel + 2], data[indexPixel + 3]];

            var colorMapIndex = color.join('-');

            if (!colorMap.hasOwnProperty(colorMapIndex)) {
                colorMap[colorMapIndex] = this.colors.length;
                this.colors.push(color);
            }

            sample[x][y] = colorMap[colorMapIndex];
        }
    }

    var C = this.colors.length;
    var W = Math.pow(C, N * N);

    var pattern = function pattern (f) {
        var result = new Array(N * N);
        for (var y = 0; y < N; y++) {
            for (var x = 0; x < N; x++) {
                result[x + y * N] = f(x, y);
            }
        }

        return result;
    };

    var patternFromSample = function patternFromSample (x, y) {
        return pattern(function (dx, dy) {
            return sample[(x + dx) % dataWidth][(y + dy) % dataHeight];
        });
    };

    var rotate = function rotate (p) {
        return pattern(function (x, y) {
            return p[N - 1 - y + x * N];
        });
    };

    var reflect = function reflect (p) {
        return pattern(function (x, y) {
            return p[N - 1 - x + y * N];
        });
    };

    var index = function index (p) {
        var result = 0,
            power = 1;

        for (var i = 0; i < p.length; i++) {
            result += p[p.length - 1 - i] * power;
            power *= C;
        }

        return result;
    };

    var patternFromIndex = function patternFromIndex (ind) {
        var residue = ind,
            power = W,
            result = new Array(N * N);

        for (var i = 0; i < result.length; i++) {
            power /= C;
            var count = 0;

            while (residue >= power) {
                residue -= power;
                count++;
            }

            result[i] = count;
        }

        return result;
    };

    var weights = {};
    var weightsKeys = []; // Object.keys won't preserve the order of creation, so we store them separately in an array

    for (y = 0; y < (periodicInput ? dataHeight : dataHeight - N + 1); y++) {
        for (x = 0; x < (periodicInput ? dataWidth : dataWidth - N + 1); x++) {
            var ps = new Array(8);
            ps[0] = patternFromSample(x, y);
            ps[1] = reflect(ps[0]);
            ps[2] = rotate(ps[0]);
            ps[3] = reflect(ps[2]);
            ps[4] = rotate(ps[2]);
            ps[5] = reflect(ps[4]);
            ps[6] = rotate(ps[4]);
            ps[7] = reflect(ps[6]);

            for (k = 0; k < symmetry; k++) {
                var ind = index(ps[k]);

                if (!!weights[ind]) {
                    weights[ind]++;
                } else {
                    weightsKeys.push(ind);
                    weights[ind] = 1;
                }
            }
        }
    }

    this.T = weightsKeys.length;
    this.ground = ground ? (ground + this.T) % this.T : 0;

    this.patterns = new Array(this.T);
    this.stationary = new Array(this.T);
    this.propagator = new Array(this.T);

    for (i = 0; i < this.T; i++) {
        var w = parseInt(weightsKeys[i], 10);

        this.patterns[i] = patternFromIndex(w);
        this.stationary[i] = weights[w];
    }

    this.wave = new Array(this.FMX);
    this.changes = new Array(this.FMX);

    for (x = 0; x < this.FMX; x++) {
        this.wave[x] = new Array(this.FMY);
        this.changes[x] = new Array(this.FMY);

        for (y = 0; y < this.FMY; y++) {
            this.wave[x][y] = new Array(this.T);
            this.changes[x][y] = false;
            for (t = 0; t < this.T; t++) {
                this.wave[x][y][t] = true;
            }
        }
    }

    var agrees = function agrees (p1, p2, dx, dy) {
        var xmin = dx < 0 ? 0 : dx,
            xmax = dx < 0 ? dx + N : N,
            ymin = dy < 0 ? 0 : dy,
            ymax = dy < 0 ? dy + N : N;

        for (var y = ymin; y < ymax; y++) {
            for (var x = xmin; x < xmax; x++) {
                if (p1[x + N * y] != p2[x - dx + N * (y - dy)]) {
                    return false;
                }
            }
        }

        return true;
    };

    for (t = 0; t < this.T; t++) {
        this.propagator[t] = new Array(2 * N - 1);
        for (x = 0; x < 2 * N - 1; x++) {
            this.propagator[t][x] = new Array(2 * N - 1);
            for (y = 0; y < 2 * N - 1; y++) {
                var list = [];

                for (t2 = 0; t2 < this.T; t2++) {
                    if (agrees(this.patterns[t], this.patterns[t2], x - N + 1, y - N + 1)) {
                        list.push(t2);
                    }
                }

                this.propagator[t][x][y] = new Array(list.length);

                for (k = 0; k < list.length; k++) {
                    this.propagator[t][x][y][k] = list[k];
                }
            }
        }
    }

    this.FMXmN = this.FMX - this.N;
    this.FMYmN = this.FMY - this.N;
};

OverlappingModel.prototype = Object.create(Model.prototype);
OverlappingModel.prototype.constructor = OverlappingModel;

OverlappingModel.prototype.propagator = null;
OverlappingModel.prototype.N = 0;
OverlappingModel.prototype.patterns = null;
OverlappingModel.prototype.colors = null;
OverlappingModel.prototype.ground = 0;

OverlappingModel.prototype.FMXmN = 0;
OverlappingModel.prototype.FMYmN = 0;

/**
 * @param {int} x
 * @param {int} y
 * @protected
 * @returns {boolean}
 */
OverlappingModel.prototype.onBoundary = function (x, y) {
    return !this.periodic && (x > this.FMXmN || y > this.FMYmN);
};

/**
 * @protected
 * @returns {boolean}
 */
OverlappingModel.prototype.propagate = function () {
    var change = false,
        startLoop = -this.N + 1,
        endLoop = this.N,
        allowed,
        b,
        prop,
        x,
        y,
        sx,
        sy,
        dx,
        dy,
        t,
        i;

    for (x = 0; x < this.FMX; x++) {
        for (y = 0; y < this.FMY; y++) {
            if (this.changes[x][y]) {
                this.changes[x][y] = false;
                for (dx = startLoop; dx < endLoop; dx++) {
                    for (dy = startLoop; dy < endLoop; dy++) {
                        sx = x + dx;
                        sy = y + dy;

                        if (sx < 0) {
                            sx += this.FMX;
                        } else if (sx >= this.FMX) {
                            sx -= this.FMX;
                        }

                        if (sy < 0) {
                            sy += this.FMY;
                        } else if (sy >= this.FMY) {
                            sy -= this.FMY;
                        }

                        if (!this.periodic && (sx > this.FMXmN || sy > this.FMYmN)) {
                            continue;
                        }

                        allowed = this.wave[sx][sy];

                        for (t = 0; t < this.T; t++) {
                            if (!allowed[t]) {
                                continue;
                            }

                            b = false;
                            prop = this.propagator[t][this.N - 1 - dx][this.N - 1 - dy];
                            for (i = 0; i < prop.length && !b; i++) {
                                b = this.wave[x][y][prop[i]];
                            }

                            if (!b) {
                                this.changes[sx][sy] = true;
                                change = true;
                                allowed[t] = false;
                            }
                        }
                    }
                }
            }
        }
    }

    return change;
};

/**
 * Clear the internal state
 * @protected
 */
OverlappingModel.prototype.clear = function () {
    var x,
        y,
        t;

    Model.prototype.clear.call(this);

    if (this.ground !== 0) {
        for (x = 0; x < this.FMX; x++) {
            for (t = 0; t < this.T; t++) {
                if (t != this.ground) {
                    this.wave[x][this.FMY - 1][t] = false;
                }
            }

            this.changes[x][this.FMY - 1] = true;

            for (y = 0; y < this.FMY - 1; y++) {
                this.wave[x][y][this.ground] = false;
                this.changes[x][y] = true;
            }
        }

        while (this.propagate()) {}
    }
};

/**
 * Set the RGBA data for a complete generation in a given array
 * @param {Array|Uint8Array|Uint8ClampedArray} array Array to write the RGBA data into
 * @protected
 */
OverlappingModel.prototype.graphicsComplete = function (array) {
    var pixelIndex = 0,
        color,
        x,
        y,
        t;

    for (y = 0; y < this.FMY; y++) {
        for (x = 0; x < this.FMX; x++) {
            pixelIndex = (y * this.FMX + x) * 4;

            for (t = 0; t < this.T; t++) {
                if (this.wave[x][y][t]) {
                    color = this.colors[this.patterns[t][0]];

                    array[pixelIndex] = color[0];
                    array[pixelIndex + 1] = color[1];
                    array[pixelIndex + 2] = color[2];
                    array[pixelIndex + 3] = color[3];
                    break;
                }
            }
        }
    }
};

/**
 * Set the RGBA data for an incomplete generation in a given array
 * @param {Array|Uint8Array|Uint8ClampedArray} array Array to write the RGBA data into
 * @protected
 */
OverlappingModel.prototype.graphicsIncomplete = function (array) {
    var pixelIndex = 0,
        x,
        y,
        t,
        dx,
        dy,
        sx,
        sy;

    var contributorNumber,
        color,
        r,
        g,
        b,
        a;

    for (y = 0; y < this.FMY; y++) {
        for (x = 0; x < this.FMX; x++) {
            contributorNumber = r = g = b = a = 0;
            pixelIndex = (y * this.FMX + x) * 4;

            for (dy = 0; dy < this.N; dy++) {
                for (dx = 0; dx < this.N; dx++) {
                    sx = x - dx;
                    if (sx < 0) {
                        sx += this.FMX;
                    }

                    sy = y - dy;
                    if (sy < 0) {
                        sy += this.FMY;
                    }

                    if (!this.periodic && (sx + this.N > this.FMX || sy + this.N > this.FMY)) {
                        continue;
                    }

                    for (t = 0; t < this.T; t++) {
                        if (this.wave[sx][sy][t]) {
                            contributorNumber++;

                            color = this.colors[this.patterns[t][dx + dy * this.N]];

                            r += color[0];
                            g += color[1];
                            b += color[2];
                            a += color[3];
                        }
                    }
                }
            }

            array[pixelIndex] = r / contributorNumber;
            array[pixelIndex + 1] = g / contributorNumber;
            array[pixelIndex + 2] = b / contributorNumber;
            array[pixelIndex + 3] = a / contributorNumber;
        }
    }
};

/**
 * Retrieve the RGBA data
 * @param {Array|Uint8Array|Uint8ClampedArray} [array] Array to write the RGBA data into (must already be set to the correct size), if not set a new Uint8Array will be created and returned
 * @returns {Array|Uint8Array|Uint8ClampedArray} RGBA data
 */
OverlappingModel.prototype.graphics = function (array) {
    array = array || new Uint8Array(this.FMX * this.FMY * 4);

    if (this.isGenerationComplete()) {
        this.graphicsComplete(array);
    } else {
        this.graphicsIncomplete(array);
    }

    return array;
};

module.exports = OverlappingModel;
