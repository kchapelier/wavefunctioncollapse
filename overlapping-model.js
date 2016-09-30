"use strict";

var Model = require('./model');

/**
 *
 * @param {Uint8Array} data
 * @param {int} dataWidth
 * @param {int} dataHeight
 * @param {int} N
 * @param {int} width
 * @param {int} height
 * @param {boolean} periodicInput
 * @param {boolean} periodicOutput
 * @param {int} symmetry
 * @param {int} foundation
 * @constructor
 */
var OverlappingModel = function OverlappingModel (data, dataWidth, dataHeight, N, width, height, periodicInput, periodicOutput, symmetry, foundation) {
    this.N = N;
    this.FMX = width;
    this.FMY = height;
    this.periodic = periodicOutput;

    var bitmap = data;

    var SMX = dataWidth,
        SMY = dataHeight;

    var sample = new Array(SMX);
    for (var i = 0; i < SMX; i++) {
        sample[i] = new Array(SMY);
    }

    this.colors = [];
    var colorMap = {};

    for (var y = 0; y < SMY; y++) {
        for (var x = 0; x < SMX; x++) {
            var indexPixel = (y * SMX + x) * 4;
            var color = [bitmap[indexPixel], bitmap[indexPixel + 1], bitmap[indexPixel + 2], bitmap[indexPixel + 3]];

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
            return sample[(x + dx) % SMX][(y + dy) % SMY];
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

    for (var y = 0; y < (periodicInput ? SMY : SMY - N + 1); y++) {
        for (var x = 0; x < (periodicInput ? SMX : SMX - N + 1); x++) {
            var ps = new Array(8);
            ps[0] = patternFromSample(x, y);
            ps[1] = reflect(ps[0]);
            ps[2] = rotate(ps[0]);
            ps[3] = reflect(ps[2]);
            ps[4] = rotate(ps[2]);
            ps[5] = reflect(ps[4]);
            ps[6] = rotate(ps[4]);
            ps[7] = reflect(ps[6]);

            for (var k = 0; k < symmetry; k++) {
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
    this.foundation = (foundation + this.T) % this.T;

    this.patterns = new Array(this.T);
    this.stationary = new Array(this.T);
    this.propagator = new Array(this.T);

    var counter = 0;

    //console.log('WH', weights);

    for (var i = 0; i < this.T; i++) {
        var w = parseInt(weightsKeys[i], 10);

        //console.log(i, this.T, w);

        this.patterns[counter] = patternFromIndex(w);
        this.stationary[counter] = weights[w];
        counter++;
    }

    //console.log('PA', this.patterns);
    //console.log('ST', this.stationary);

    this.wave = new Array(this.FMX);
    this.changes = new Array(this.FMX);

    for (var x = 0; x < this.FMX; x++) {
        this.wave[x] = new Array(this.FMY);
        this.changes[x] = new Array(this.FMY);

        for (var y = 0; y < this.FMY; y++) {
            this.wave[x][y] = new Array(this.T);
            this.changes[x][y] = false;
            for (var t = 0; t < this.T; t++) {
                this.wave[x][y][t] = true;
            }
        }
    }


  //console.log(this.FMX, this.FMY, this.T);



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

    for (var t = 0; t < this.T; t++) {
        this.propagator[t] = new Array(2 * N - 1);
        for (var x = 0; x < 2 * N - 1; x++) {
            this.propagator[t][x] = new Array(2 * N - 1);
            for (var y = 0; y < 2 * N - 1; y++) {
                var list = [];

                for (var t2 = 0; t2 < this.T; t2++) {
                  //console.log(t, x, y, t2);
                    if (agrees(this.patterns[t], this.patterns[t2], x - N + 1, y - N + 1)) {
                        list.push(t2);
                    }
                }

                this.propagator[t][x][y] = new Array(list.length);

                for (var c = 0; c < list.length; c++) {
                    this.propagator[t][x][y][c] = list[c];
                }

              //console.log(t, x, y);
              //console.log(this.propagator[t][x][y]);
            }
        }
    }


};

OverlappingModel.prototype = Object.create(Model.prototype);
OverlappingModel.prototype.constructor = OverlappingModel;

OverlappingModel.prototype.propagator = null;
OverlappingModel.prototype.N = 0;
OverlappingModel.prototype.patterns = null;
OverlappingModel.prototype.colors = null;
OverlappingModel.prototype.foundation = 0;

OverlappingModel.prototype.onBoundary = function (x, y) {
    return !this.periodic && (x + this.N > this.FMX || y + this.N > this.FMY);
};

OverlappingModel.prototype.propagate = function () {
    var change = false;
    var x1, y1, x2, y2, sx, sy, dx, dy;
    var allowed;

    //console.log('propagate');

    for (x1 = 0; x1 < this.FMX; x1++) {
        for (y1 = 0; y1 < this.FMY; y1++) {
            if (this.changes[x1][y1]) {
                this.changes[x1][y1] = false;
                for (dx = -this.N + 1; dx < this.N; dx++) {
                    for (dy = -this.N + 1; dy < this.N; dy++) {
                      /*
                      x2 = x1 + dx;
                      y2 = y1 + dy;

                      sx = x2;
                      if (sx < 0) sx += FMX;
                      else if (sx >= FMX) sx -= FMX;

                      sy = y2;
                      if (sy < 0) sy += FMY;
                      else if (sy >= FMY) sy -= FMY;
                      */

                        x2 = x1 + dx;
                        y2 = y1 + dy;

                        sx = x2;
                        if (sx < 0) {
                            sx += this.FMX;
                        } else if (sx >= this.FMX) {
                            sx -= this.FMX;
                        }

                        sy = y2;
                        if (sy < 0) {
                            sy += this.FMY;
                        } else if (sy >= this.FMY) {
                            sy -= this.FMY;
                        }

                      /*
                      if (!periodic && (sx + N > FMX || sy + N > FMY)) continue;
                      allowed = wave[sx][sy];
                      */


                        if (!this.periodic && (sx + this.N > this.FMX || sy + this.N > this.FMY)) {
                            continue;
                        }

                        allowed = this.wave[sx][sy];

                        for (var t2 = 0; t2 < this.T; t2++) {
                          /*
                          bool b = false;
                          int[] prop = propagator[t2][N - 1 - dx][N - 1 - dy];
                          for (int i1 = 0; i1 < prop.Length && !b; i1++) b = wave[x1][y1][prop[i1]];
                          */


                            var b = false;
                            var prop = this.propagator[t2][this.N - 1 - dx][this.N - 1 - dy];
                            for (var i1 = 0; i1 < prop.length && !b; i1++) {
                                b = this.wave[x1][y1][prop[i1]];
                            }

                          /*
                          if (allowed[t2] && !b)
                          {
                            changes[sx][sy] = true;
                            change = true;
                            allowed[t2] = false;
                          }
                          */

                            if (allowed[t2] && !b) {
                                this.changes[sx][sy] = true;
                                change = true;
                                allowed[t2] = false;
                            }
                        }
                    }
                }
            }
        }
    }

    return change;
};

OverlappingModel.prototype.clear = function () {
    var x,
        y,
        t;

    for (y = 0; y < this.FMY; y++) {
        for (x = 0; x < this.FMX; x++) {
            for (t = 0; t < this.T; t++) {
                this.wave[x][y][t] = true;
            }

            this.changes[x][y] = false;
        }
    }

    if (this.foundation !== 0) {
        for (x = 0; x < this.FMX; x++) {
            for (t = 0; t < this.T; t++) {
                if (t != this.foundation) {
                    this.wave[x][this.FMY - 1][t] = false;
                }
            }

            this.changes[x][this.FMY - 1] = true;

            for (y = 0; y < this.FMY - 1; y++) {
                this.wave[x][y][this.foundation] = false;
                this.changes[x][y] = true;
            }

            while (this.propagate()) {}
        }
    }
};

OverlappingModel.prototype.graphics = function () {
  var result = new Uint8Array(this.FMX * this.FMY * 4);

  for (var y = 0; y < this.FMY; y++) {
    for (var x = 0; x < this.FMX; x++) {
      var contributors = [];

      for (var dy = 0; dy < this.N; dy++) {
        for (var dx = 0; dx < this.N; dx++) {
          var sx = x - dx;
          if (sx < 0) sx += this.FMX;

          var sy = y - dy;
          if (sy < 0) sy += this.FMY;

          if (!this.periodic && (sx + this.N > this.FMX || sy + this.N > this.FMY)) continue;

          for (var t = 0; t < this.T; t++) {
            if (this.wave[sx][sy][t]) contributors.push(this.patterns[t][dx + dy * this.N]);
          }
        }
      }

      var r = 0, g = 0, b = 0, a = 0;
      for (var i = 0; i < contributors.length; i++) {
        var color = this.colors[contributors[i]];
        r += color[0];
        g += color[1];
        b += color[2];
        a += color[3];
      }

      var lambda = 1.0 / contributors.length;
      result[(y * this.FMX + x) * 4] = lambda * r;
      result[(y * this.FMX + x) * 4 + 1] = lambda * g;
      result[(y * this.FMX + x) * 4 + 2] = lambda * b;
      result[(y * this.FMX + x) * 4 + 3] = lambda * a;
    }
  }


  return result;
};

module.exports = OverlappingModel;
