"use strict";

var Model = require('./model');

/**
 *
 * @param {object} data
 * @param {string} subsetName
 * @param {int} width
 * @param {int} height
 * @param {bool} periodic
 * @param {bool} black
 * @constructor
 */
var SimpleTiledModel = function SimpleTiledModel (data, subsetName, width, height, periodic, black) {
    var self = this;

    this.FMX = width;
    this.FMY = height;
    this.periodic = periodic;
    this.black = black;

    this.tilesize = data.tilesize || 16;
    var unique = !!data.unique;

    var subset = null;

    if (subsetName && data.subsets && !!data.subsets[subsetName]) {
        subset = data.subsets[subsetName];
    }

    var tile = function tile(f) {
        var result = new Array(self.tilesize * self.tilesize);

        for (var y = 0; y < self.tilesize; y++) {
            for (var x = 0; x < self.tilesize; x++) {
                result[x + y * self.tilesize] = f(x, y);
            }
        }

        return result;
    };

    var rotate = function rotate (array) {
        return tile(function(x, y) {
            return array[self.tilesize - 1 - y + x * self.tilesize];
        });
    };

    this.tiles = new Array();
    var tempStationary = new Array();

    var action = new Array();
    var firstOccurrence = {};

    var currentTile;
    var funcA, funcB;
    var cardinality = 4;

    for (var i = 0; i < data.tiles.length; i++)
    {
        currentTile = data.tiles[i];

        if (subset !== null && subset.indexOf(currentTile.name) === -1) {
            continue;
        }

        switch (currentTile.symmetry) {
            case 'L':
                cardinality = 4;
                funcA = function (i) { return (i + 1) % 4; };
                funcB = function (i) { return i % 2 == 0 ? i + 1 : i - 1; };
                break;
            case 'T':
                cardinality = 4;
                funcA = function (i) { return (i + 1) % 4; };
                funcB = function (i) { return i % 2 == 0 ? i : 4 - i; };
                break;
            case 'I':
                cardinality = 2;
                funcA = function (i) { return 1 - i; };
                funcB = function (i) { return i; };
                break;
            case '\\':
                cardinality = 2;
                funcA = function (i) { return 1 - i; };
                funcB = function (i) { return 1 - i; };
                break;
            case 'X':
            default:
                cardinality = 1;
                funcA = function (i) { return i; };
                funcB = function (i) { return i; };
                break;
        }

        this.T = action.length;
        firstOccurrence[currentTile.name] = this.T;

        var map = new Array(cardinality);

        for (var t = 0; t < cardinality; t++) {
            map[t] = new Array(8);

            map[t][0] = this.T + t;
            map[t][1] = this.T + funcA(t);
            map[t][2] = this.T + funcA(funcA(t));
            map[t][3] = this.T + funcA(funcA(funcA(t)));
            map[t][4] = this.T + funcB(t);
            map[t][5] = this.T + funcB(funcA(t));
            map[t][6] = this.T + funcB(funcA(funcA(t)));
            map[t][7] = this.T + funcB(funcA(funcA(funcA(t))));

            action.push(map[t]);
        }

        var bitmap;
        if (unique) {
            for (var t = 0; t < cardinality; t++) {
                bitmap = currentTile.bitmap[t];
                this.tiles.push(tile(function (x, y) {
                    return [
                        bitmap[(self.tilesize * y + x) * 4],
                        bitmap[(self.tilesize * y + x) * 4 + 1],
                        bitmap[(self.tilesize * y + x) * 4 + 2],
                        bitmap[(self.tilesize * y + x) * 4 + 3]
                    ];
                }));
            }
        } else {
            bitmap = currentTile.bitmap;
            this.tiles.push(tile(function (x, y) {
                return [
                    bitmap[(self.tilesize * y + x) * 4],
                    bitmap[(self.tilesize * y + x) * 4 + 1],
                    bitmap[(self.tilesize * y + x) * 4 + 2],
                    bitmap[(self.tilesize * y + x) * 4 + 3]
                ];
            }));

            for (var t = 1; t < cardinality; t++) {
                this.tiles.push(rotate(this.tiles[this.T + t - 1]));
            }
        }

        for (var t = 0; t < cardinality; t++) {
            tempStationary.push(currentTile.weight || 1);
        }
    }

    this.T = action.length;
    this.stationary = tempStationary;

    this.propagator = new Array(4);

    for (var d = 0; d < 4; d++) {
        this.propagator[d] = new Array(this.T);
        for (var t = 0; t < this.T; t++) {
            this.propagator[d][t] = new Array(this.T);
            for (var t2 = 0; t2 < this.T; t2++) {
                this.propagator[d][t][t2] = false;
            }
        }
    }

    this.wave = new Array(this.FMX);
    this.changes = new Array(this.FMX);
    for (var x = 0; x < this.FMX; x++) {
        this.wave[x] = new Array(this.FMY);
        this.changes[x] = new Array(this.FMY);

        for (var y = 0; y < this.FMY; y++) {
            this.wave[x][y] = new Array(this.T);
        }
    }

    for (var i = 0; i < data.neighbors.length; i++) {
        var neighbor = data.neighbors[i];

        var left = neighbor.left.split(' ').filter(function (v) { return v.length; });
        var right = neighbor.right.split(' ').filter(function (v) { return v.length; });

        if (subset !== null && (subset.indexOf(left[0]) === -1 || subset.indexOf(right[0]) === -1)) {
            continue;
        }

        var L = action[firstOccurrence[left[0]]][left.length == 1 ? 0 : parseInt(left[1], 10)],
            D = action[L][1],
            R = action[firstOccurrence[right[0]]][right.length == 1 ? 0 : parseInt(right[1], 10)],
            U = action[R][1];

        this.propagator[0][R][L] = true;
        this.propagator[0][action[R][6]][action[L][6]] = true;
        this.propagator[0][action[L][4]][action[R][4]] = true;
        this.propagator[0][action[L][2]][action[R][2]] = true;

        this.propagator[1][U][D] = true;
        this.propagator[1][action[D][6]][action[U][6]] = true;
        this.propagator[1][action[U][4]][action[D][4]] = true;
        this.propagator[1][action[D][2]][action[U][2]] = true;
    }

    for (var t2 = 0; t2 < this.T; t2++) {
        for (var t1 = 0; t1 < this.T; t1++) {
            this.propagator[2][t2][t1] = this.propagator[0][t1][t2];
            this.propagator[3][t2][t1] = this.propagator[1][t1][t2];
        }
    }
};

SimpleTiledModel.prototype = Object.create(Model.prototype);
SimpleTiledModel.prototype.constructor = SimpleTiledModel;

SimpleTiledModel.prototype.propagator = null;

SimpleTiledModel.prototype.tiles = 0;
SimpleTiledModel.prototype.tilesize = 0;
SimpleTiledModel.prototype.black = false;

/**
 * @protected
 * @returns {boolean}
 */
SimpleTiledModel.prototype.propagate = function () {
    var change = false,
        b;

    for (var x2 = 0; x2 < this.FMX; x2++) {
        for (var y2 = 0; y2 < this.FMY; y2++) {
            for(var d = 0; d < 4; d++) {

                var x1 = x2,
                    y1 = y2;

                if (d === 0) {
                    if (x2 === 0) {
                        if (!this.periodic) {
                            continue;
                        } else {
                            x1 = this.FMX - 1;
                        }
                    } else {
                        x1 = x2 - 1;
                    }
                } else if (d === 1) {
                    if (y2 === this.FMY - 1) {
                        if (!this.periodic) {
                            continue;
                        } else {
                            y1 = 0;
                        }
                    } else {
                        y1 = y2 + 1;
                    }
                } else if (d === 2) {
                    if (x2 === this.FMX - 1) {
                        if (!this.periodic) {
                            continue;
                        } else {
                            x1 = 0;
                        }
                    } else {
                        x1 = x2 + 1;
                    }
                } else {
                    if (y2 === 0) {
                        if (!this.periodic) {
                            continue;
                        } else {
                            y1 = this.FMY - 1;
                        }
                    } else {
                        y1 = y2 - 1;
                    }
                }

                if (!this.changes[x1][y1]) {
                    continue;
                }

                var w1 = this.wave[x1][y1],
                    w2 = this.wave[x2][y2];

                for (var t2 = 0; t2 < this.T; t2++) {
                    if (w2[t2]) {
                        var prop = this.propagator[d][t2];
                        b = false;

                        for (var t1 = 0; t1 < this.T && !b; t1++) {
                            if (w1[t1]) {
                                b = prop[t1];
                            }
                        }

                        if (!b) {
                            this.wave[x2][y2][t2] = false;
                            this.changes[x2][y2] = true;
                            change = true;
                        }
                    }
                }

            }
        }
    }

    return change;
};

/**
 * @param {int} x
 * @param {int} y
 * @protected
 * @returns {boolean}
 */
SimpleTiledModel.prototype.onBoundary = function (x, y) {
    return false;
};

/**
 * Retrieve the RGBA data
 * @param {Uint8Array|Uint8ClampedArray} [array] Array to write the RGBA data into, if not set a new Uint8Array will be created and returned
 * @returns {Uint8Array|Uint8ClampedArray} RGBA data
 */
SimpleTiledModel.prototype.graphics = function (array) {
    array = array || new Uint8Array(this.FMX * this.tilesize * this.FMY * this.tilesize * 4);

    for (var x = 0; x < this.FMX; x++) {
        for (var y = 0; y < this.FMY; y++) {
            var a = this.wave[x][y];
            var amount = 0;
            var sum = 0;

            for (var t = 0; t < a.length; t++) {
                if (a[t]) {
                    amount += 1;
                    sum += this.stationary[t];
                }
            }

            for (var yt = 0; yt < this.tilesize; yt++) {
                for (var xt = 0; xt < this.tilesize; xt++) {
                    if (this.black && amount === this.T) {
                        array[(x * this.tilesize + xt + (y * this.tilesize + yt) * this.FMX * this.tilesize) * 4] = 0;
                        array[(x * this.tilesize + xt + (y * this.tilesize + yt) * this.FMX * this.tilesize) * 4 + 1] = 0;
                        array[(x * this.tilesize + xt + (y * this.tilesize + yt) * this.FMX * this.tilesize) * 4 + 2] = 0;
                        array[(x * this.tilesize + xt + (y * this.tilesize + yt) * this.FMX * this.tilesize) * 4 + 3] = 255;
                    } else {
                        var r = 0, g = 0, b = 0, a = 0;

                        for (var t = 0; t < this.T; t++) {
                            if (this.wave[x][y][t]) {
                                var color = this.tiles[t][xt + yt * this.tilesize];
                                r += color[0] * this.stationary[t];
                                g += color[1] * this.stationary[t];
                                b += color[2] * this.stationary[t];
                                a += color[3] * this.stationary[t];
                            }
                        }

                        array[(x * this.tilesize + xt + (y * this.tilesize + yt) * this.FMX * this.tilesize) * 4] = r / sum;
                        array[(x * this.tilesize + xt + (y * this.tilesize + yt) * this.FMX * this.tilesize) * 4 + 1] = g / sum;
                        array[(x * this.tilesize + xt + (y * this.tilesize + yt) * this.FMX * this.tilesize) * 4 + 2] = b / sum;
                        array[(x * this.tilesize + xt + (y * this.tilesize + yt) * this.FMX * this.tilesize) * 4 + 3] = a / sum;
                    }
                }
            }

        }
    }

    return array;
};

module.exports = SimpleTiledModel;
