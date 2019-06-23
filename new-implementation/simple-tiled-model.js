"use strict";

var Model = require('./model');

function SimpleTiledModel (data, subsetName, width, height, periodic) {
  var tilesize = data.tilesize || 16;

  this.FMX = width;
  this.FMY = height;

  this.periodic = periodic;
  this.tilesize = tilesize;

  var unique = !!data.unique;
  var subset = null;

  if (subsetName && data.subsets && !!data.subsets[subsetName]) {
    subset = data.subsets[subsetName];
  }

  var tile = function tile (f) {
    var result = new Array(tilesize * tilesize),
      y,
      x;

    for (y = 0; y < tilesize; y++) {
      for (x = 0; x < tilesize; x++) {
        result[x + y * tilesize] = f(x, y);
      }
    }

    return result;
  };

  var rotate = function rotate (array) {
    return tile(function (x, y) {
      return array[tilesize - 1 - y + x * tilesize];
    });
  };

  this.tiles = [];
  var tempStationary = [];

  var action = new Array();
  var firstOccurrence = {};

  var funcA;
  var funcB;
  var cardinality;

  for (var i = 0; i < data.tiles.length; i++) {
    var currentTile = data.tiles[i];

    if (subset !== null && subset.indexOf(currentTile.name) === -1) {
      continue;
    }

    switch (currentTile.symmetry) {
      case 'L':
        cardinality = 4;
        funcA = function (i) {
          return (i + 1) % 4;
        };
        funcB = function (i) {
          return i % 2 === 0 ? i + 1 : i - 1;
        };
        break;
      case 'T':
        cardinality = 4;
        funcA = function (i) {
          return (i + 1) % 4;
        };
        funcB = function (i) {
          return i % 2 === 0 ? i : 4 - i;
        };
        break;
      case 'I':
        cardinality = 2;
        funcA = function (i) {
          return 1 - i;
        };
        funcB = function (i) {
          return i;
        };
        break;
      case '\\':
        cardinality = 2;
        funcA = function (i) {
          return 1 - i;
        };
        funcB = function (i) {
          return 1 - i;
        };
        break;
      default:
        cardinality = 1;
        funcA = function (i) {
          return i;
        };
        funcB = function (i) {
          return i;
        };
        break;
    }

    this.T = action.length;
    firstOccurrence[currentTile.name] = this.T;

    for (var t = 0; t < cardinality; t++) {
      action.push([
        this.T + t,
        this.T + funcA(t),
        this.T + funcA(funcA(t)),
        this.T + funcA(funcA(funcA(t))),
        this.T + funcB(t),
        this.T + funcB(funcA(t)),
        this.T + funcB(funcA(funcA(t))),
        this.T + funcB(funcA(funcA(funcA(t))))
      ]);
    }


    if (unique) {
      for (var t = 0; t < cardinality; t++) {
        var bitmap = currentTile.bitmap[t];
        this.tiles.push(tile(function (x, y) {
          return [
            bitmap[(tilesize * y + x) * 4],
            bitmap[(tilesize * y + x) * 4 + 1],
            bitmap[(tilesize * y + x) * 4 + 2],
            bitmap[(tilesize * y + x) * 4 + 3]
          ];
        }));
      }
    } else {
      bitmap = currentTile.bitmap;
      this.tiles.push(tile(function (x, y) {
        return [
          bitmap[(tilesize * y + x) * 4],
          bitmap[(tilesize * y + x) * 4 + 1],
          bitmap[(tilesize * y + x) * 4 + 2],
          bitmap[(tilesize * y + x) * 4 + 3]
        ];
      }));

      for (t = 1; t < cardinality; t++) {
        this.tiles.push(rotate(this.tiles[this.T + t - 1]));
      }
    }

    for (t = 0; t < cardinality; t++) {
      tempStationary.push(currentTile.weight || 1);
    }

  }

  this.T = action.length;
  this.weights = tempStationary;

  this.propagator = new Array(4);
  var tempPropagator = new Array(4);

  for (var i = 0; i < 4; i++) {
    this.propagator[i] = new Array(this.T);
    tempPropagator[i] = new Array(this.T);
    for (var t = 0; t < this.T; t++) {
      tempPropagator[i][t] = new Array(this.T);
      for (var t2 = 0; t2 < this.T; t2++) {
        tempPropagator[i][t][t2] = false;
      }
    }
  }

  for (i = 0; i < data.neighbors.length; i++) {
    var neighbor = data.neighbors[i];

    var left = neighbor.left.split(' ').filter(function (v) {
      return v.length;
    });
    var right = neighbor.right.split(' ').filter(function (v) {
      return v.length;
    });

    if (subset !== null && (subset.indexOf(left[0]) === -1 || subset.indexOf(right[0]) === -1)) {
      continue;
    }

    var L = action[firstOccurrence[left[0]]][left.length == 1 ? 0 : parseInt(left[1], 10)];
    var D = action[L][1];
    var R = action[firstOccurrence[right[0]]][right.length == 1 ? 0 : parseInt(right[1], 10)];
    var U = action[R][1];

    tempPropagator[0][R][L] = true;
    tempPropagator[0][action[R][6]][action[L][6]] = true;
    tempPropagator[0][action[L][4]][action[R][4]] = true;
    tempPropagator[0][action[L][2]][action[R][2]] = true;

    tempPropagator[1][U][D] = true;
    tempPropagator[1][action[D][6]][action[U][6]] = true;
    tempPropagator[1][action[U][4]][action[D][4]] = true;
    tempPropagator[1][action[D][2]][action[U][2]] = true;
  }

  for (t = 0; t < this.T; t++) {
    for (t2 = 0; t2 < this.T; t2++) {
      tempPropagator[2][t][t2] = tempPropagator[0][t2][t];
      tempPropagator[3][t][t2] = tempPropagator[1][t2][t];
    }
  }

  var sparsePropagator = new Array(4);

  for (var d = 0; d < 4; d++) {
    sparsePropagator[d] = new Array(this.T);
    for (var t = 0; t < this.T; t++) sparsePropagator[d][t] = new Array();
  }

  for (var d = 0; d < 4; d++) {
    for (var t1 = 0; t1 < this.T; t1++) {
      var sp = sparsePropagator[d][t1];
      var tp = tempPropagator[d][t1];

      for (var t2 = 0; t2 < this.T; t2++) {
        if (tp[t2]) sp.push(t2);
      }

      var ST = sp.length;

      //TODO could probably just set sp in propagator instead of copying it
      this.propagator[d][t1] = new Array(ST);

      for (var st = 0; st < ST; st++) {
        this.propagator[d][t1][st] = sp[st];
      }
    }

  }


}

SimpleTiledModel.prototype = Object.create(Model.prototype);
SimpleTiledModel.prototype.constructor = SimpleTiledModel;

SimpleTiledModel.prototype.onBoundary = function (x, y) {
  return !this.periodic && (x < 0 || y < 0 || x >= this.FMX || y >= this.FMY);
};

SimpleTiledModel.prototype.graphics = function (array, defaultColor) {
  array = array || new Uint8Array(this.FMX * this.tilesize * this.FMY * this.tilesize * 4);

  if (this.isGenerationComplete()) {
    this.graphicsComplete(array);
  } else {
    this.graphicsIncomplete(array, defaultColor);
  }

  return array;
};

SimpleTiledModel.prototype.graphicsComplete = function (array) {
  for (var x = 0; x < this.FMX; x++) {
    for (var y = 0; y < this.FMY; y++) {
      var tile = this.tiles[this.observed[x + y * this.FMX]];

      for (var yt = 0; yt < this.tilesize; yt++) {
        for (var xt = 0; xt < this.tilesize; xt++) {
          var pixelIndex = (x * this.tilesize + xt + (y * this.tilesize + yt) * this.FMX * this.tilesize) * 4;
          var color = tile[xt + yt * this.tilesize];

          array[pixelIndex] = color[0];
          array[pixelIndex + 1] = color[1];
          array[pixelIndex + 2] = color[2];
          array[pixelIndex + 3] = color[3];
        }
      }
    }
  }
};

SimpleTiledModel.prototype.graphicsIncomplete = function (array, defaultColor) {
  if (!defaultColor || defaultColor.length !== 4) {
    defaultColor = false;
  }

  for (var x = 0; x < this.FMX; x++) {
    for (var y = 0; y < this.FMY; y++) {
      var w = this.wave[x + y * this.FMX];
      var amount = 0;
      var sumWeights = 0;

      for (var t = 0; t < this.T; t++) {
        if (w[t]) {
          amount++;
          sumWeights += this.weights[t];
        }
      }

      var lambda = 1 / sumWeights;

      for (var yt = 0; yt < this.tilesize; yt++) {
        for (var xt = 0; xt < this.tilesize; xt++) {
          var pixelIndex = (x * this.tilesize + xt + (y * this.tilesize + yt) * this.FMX * this.tilesize) * 4;

          if (defaultColor && amount === this.T) {
            array[pixelIndex] = defaultColor[0];
            array[pixelIndex + 1] = defaultColor[1];
            array[pixelIndex + 2] = defaultColor[2];
            array[pixelIndex + 3] = defaultColor[3];
          } else {
            var r = 0;
            var g = 0;
            var b = 0;
            var a = 0;

            for (var t = 0; t < this.T; t++) {
              if (w[t]) {
                var c = this.tiles[t][xt + yt * this.tilesize];
                r+= c[0] * this.weights[t] * lambda;
                g+= c[1] * this.weights[t] * lambda;
                b+= c[2] * this.weights[t] * lambda;
                a+= c[3] * this.weights[t] * lambda;
              }
            }

            array[pixelIndex] = r;
            array[pixelIndex + 1] = g;
            array[pixelIndex + 2] = b;
            array[pixelIndex + 3] = a;
          }
        }
      }
    }
  }
};

module.exports = SimpleTiledModel;