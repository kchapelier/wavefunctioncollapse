"use strict";

const Model = require('./model');

/**
 *
 * @param {object} data Tiles, subset and constraints definitions
 * @param {string} subsetName Name of the subset to use from the data, use all tiles if falsy
 * @param {int} width The width of the generation
 * @param {int} height The height of the generation
 * @param {boolean} periodic Whether the source image is to be considered as periodic / as a repeatable texture
 *
 * @constructor
 */
const SimpleTiledModel = function SimpleTiledModel (data, subsetName, width, height, periodic) {
  const tilesize = data.tilesize || 16;

  this.FMX = width;
  this.FMY = height;
  this.FMXxFMY = width * height;

  this.periodic = periodic;
  this.tilesize = tilesize;

  const unique = !!data.unique;
  let subset = null;

  if (subsetName && data.subsets && !!data.subsets[subsetName]) {
    subset = data.subsets[subsetName];
  }

  const tile = function tile (f) {
    const result = new Array(tilesize * tilesize);

    for (let y = 0; y < tilesize; y++) {
      for (let x = 0; x < tilesize; x++) {
        result[x + y * tilesize] = f(x, y);
      }
    }

    return result;
  };

  const rotate = function rotate (array) {
    return tile(function (x, y) {
      return array[tilesize - 1 - y + x * tilesize];
    });
  };

  const reflect = function reflect(array) {
    return tile(function (x, y) {
      return array[tilesize - 1 - x + y * tilesize];
    });
  };

  this.tiles = [];
  const tempStationary = [];

  const action = [];
  const firstOccurrence = {};

  let funcA;
  let funcB;
  let cardinality;

  for (let i = 0; i < data.tiles.length; i++) {
    const currentTile = data.tiles[i];

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
      case 'F':
        cardinality = 8;
        funcA = function (i) {
          return i < 4 ? (i + 1) % 4 : 4 + (i - 1) % 4;
        };
        funcB = function (i) {
          return i < 4 ? i + 4 : i - 4;
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

    for (let t = 0; t < cardinality; t++) {
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


    let bitmap;

    if (unique) {
      for (let t = 0; t < cardinality; t++) {
        bitmap = currentTile.bitmap[t];
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

      for (let t = 1; t < cardinality; t++) {
        this.tiles.push(t < 4 ? rotate(this.tiles[this.T + t - 1]) : reflect(this.tiles[this.T + t - 4]));
      }
    }

    for (let t = 0; t < cardinality; t++) {
      tempStationary.push(currentTile.weight || 1);
    }

  }

  this.T = action.length;
  this.weights = tempStationary;

  this.propagator = new Array(4);
  const tempPropagator = new Array(4);

  for (let i = 0; i < 4; i++) {
    this.propagator[i] = new Array(this.T);
    tempPropagator[i] = new Array(this.T);
    for (let t = 0; t < this.T; t++) {
      tempPropagator[i][t] = new Array(this.T);
      for (let t2 = 0; t2 < this.T; t2++) {
        tempPropagator[i][t][t2] = false;
      }
    }
  }

  for (let i = 0; i < data.neighbors.length; i++) {
    const neighbor = data.neighbors[i];

    const left = neighbor.left.split(' ').filter(function (v) {
      return v.length;
    });
    const right = neighbor.right.split(' ').filter(function (v) {
      return v.length;
    });

    if (subset !== null && (subset.indexOf(left[0]) === -1 || subset.indexOf(right[0]) === -1)) {
      continue;
    }

    const L = action[firstOccurrence[left[0]]][left.length == 1 ? 0 : parseInt(left[1], 10)];
    const D = action[L][1];
    const R = action[firstOccurrence[right[0]]][right.length == 1 ? 0 : parseInt(right[1], 10)];
    const U = action[R][1];

    tempPropagator[0][R][L] = true;
    tempPropagator[0][action[R][6]][action[L][6]] = true;
    tempPropagator[0][action[L][4]][action[R][4]] = true;
    tempPropagator[0][action[L][2]][action[R][2]] = true;

    tempPropagator[1][U][D] = true;
    tempPropagator[1][action[D][6]][action[U][6]] = true;
    tempPropagator[1][action[U][4]][action[D][4]] = true;
    tempPropagator[1][action[D][2]][action[U][2]] = true;
  }

  for (let t = 0; t < this.T; t++) {
    for (let t2 = 0; t2 < this.T; t2++) {
      tempPropagator[2][t][t2] = tempPropagator[0][t2][t];
      tempPropagator[3][t][t2] = tempPropagator[1][t2][t];
    }
  }

  for (let d = 0; d < 4; d++) {
    for (let t1 = 0; t1 < this.T; t1++) {
      const sp = [];
      const tp = tempPropagator[d][t1];

      for (let t2 = 0; t2 < this.T; t2++) {
        if (tp[t2]) {
          sp.push(t2);
        }
      }

      this.propagator[d][t1] = sp;
    }
  }
};

SimpleTiledModel.prototype = Object.create(Model.prototype);
SimpleTiledModel.prototype.constructor = SimpleTiledModel;

/**
 *
 * @param {int} x
 * @param {int} y
 *
 * @returns {boolean}
 *
 * @protected
 */
SimpleTiledModel.prototype.onBoundary = function (x, y) {
  return !this.periodic && (x < 0 || y < 0 || x >= this.FMX || y >= this.FMY);
};

/**
 * Retrieve the RGBA data
 *
 * @param {Array|Uint8Array|Uint8ClampedArray} [array] Array to write the RGBA data into (must already be set to the correct size), if not set a new Uint8Array will be created and returned
 * @param {Array|Uint8Array|Uint8ClampedArray} [defaultColor] RGBA data of the default color to use on untouched tiles
 *
 * @returns {Array|Uint8Array|Uint8ClampedArray} RGBA data
 *
 * @public
 */
SimpleTiledModel.prototype.graphics = function (array, defaultColor) {
  array = array || new Uint8Array(this.FMXxFMY * this.tilesize * this.tilesize * 4);

  if (this.isGenerationComplete()) {
    this.graphicsComplete(array);
  } else {
    this.graphicsIncomplete(array, defaultColor);
  }

  return array;
};

/**
 * Set the RGBA data for a complete generation in a given array
 *
 * @param {Array|Uint8Array|Uint8ClampedArray} [array] Array to write the RGBA data into, if not set a new Uint8Array will be created and returned
 *
 * @protected
 */
SimpleTiledModel.prototype.graphicsComplete = function (array) {
  for (let x = 0; x < this.FMX; x++) {
    for (let y = 0; y < this.FMY; y++) {
      const tile = this.tiles[this.observed[x + y * this.FMX]];

      for (let yt = 0; yt < this.tilesize; yt++) {
        for (let xt = 0; xt < this.tilesize; xt++) {
          const pixelIndex = (x * this.tilesize + xt + (y * this.tilesize + yt) * this.FMX * this.tilesize) * 4;
          const color = tile[xt + yt * this.tilesize];

          array[pixelIndex] = color[0];
          array[pixelIndex + 1] = color[1];
          array[pixelIndex + 2] = color[2];
          array[pixelIndex + 3] = color[3];
        }
      }
    }
  }
};

/**
 * Set the RGBA data for an incomplete generation in a given array
 *
 * @param {Array|Uint8Array|Uint8ClampedArray} [array] Array to write the RGBA data into, if not set a new Uint8Array will be created and returned
 * @param {Array|Uint8Array|Uint8ClampedArray} [defaultColor] RGBA data of the default color to use on untouched tiles
 *
 * @protected
 */
SimpleTiledModel.prototype.graphicsIncomplete = function (array, defaultColor) {
  if (!defaultColor || defaultColor.length !== 4) {
    defaultColor = false;
  }

  for (let x = 0; x < this.FMX; x++) {
    for (let y = 0; y < this.FMY; y++) {
      const w = this.wave[x + y * this.FMX];
      let amount = 0;
      let sumWeights = 0;

      for (let t = 0; t < this.T; t++) {
        if (w[t]) {
          amount++;
          sumWeights += this.weights[t];
        }
      }

      const lambda = 1 / sumWeights;

      for (let yt = 0; yt < this.tilesize; yt++) {
        for (let xt = 0; xt < this.tilesize; xt++) {
          const pixelIndex = (x * this.tilesize + xt + (y * this.tilesize + yt) * this.FMX * this.tilesize) * 4;

          if (defaultColor && amount === this.T) {
            array[pixelIndex] = defaultColor[0];
            array[pixelIndex + 1] = defaultColor[1];
            array[pixelIndex + 2] = defaultColor[2];
            array[pixelIndex + 3] = defaultColor[3];
          } else {
            let r = 0;
            let g = 0;
            let b = 0;
            let a = 0;

            for (let t = 0; t < this.T; t++) {
              if (w[t]) {
                const c = this.tiles[t][xt + yt * this.tilesize];
                const weight = this.weights[t] * lambda;
                r+= c[0] * weight;
                g+= c[1] * weight;
                b+= c[2] * weight;
                a+= c[3] * weight;
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