"use strict";

var Model = require('./model');

function OverlappingModel (data, dataWidth, dataHeight, N, width, height, periodicInput, periodicOutput, symmetry, ground) {
  this.N = N;
  this.FMX = width;
  this.FMY = height;
  this.periodic = periodicOutput;

  var SMX = dataWidth;
  var SMY = dataHeight;
  var sample = new Array(SMX);
  for (var i = 0; i < SMX; i++) {
    sample[i] = new Array(dataHeight);
  }

  this.colors = new Array();
  var colorMap = {};

  for (var y = 0; y < dataHeight; y++) {
    for (var x = 0; x < dataWidth; x++) {
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
  this.ground = (ground + this.T) % this.T;
  this.patterns = new Array(this.T);
  this.weights = new Array(this.T);

  for (i = 0; i < this.T; i++) {
    var w = parseInt(weightsKeys[i], 10);

    this.patterns[i] = patternFromIndex(w);
    this.weights[i] = weights[w]
  }

  var agrees = function agrees (p1, p2, dx, dy) {
    var xmin = dx < 0 ? 0 : dx;
    var xmax = dx < 0 ? dx + N : N;
    var ymin = dy < 0 ? 0 : dy;
    var ymax = dy < 0 ? dy + N : N;

    for (var y = ymin; y < ymax; y++) {
      for (var x = xmin; x < xmax; x++) {
        if (p1[x + N * y] != p2[x - dx + N * (y - dy)]) {
          return false;
        }
      }
    }

    return true;
  };

  this.propagator = new Array(4);

  for (var d = 0; d < 4; d++) {
    this.propagator[d] = new Array(this.T);
    for (var t = 0; t < this.T; t++) {
      var list = new Array();

      for (var t2 = 0; t2 < this.T; t2++) {
        if (agrees(this.patterns[t], this.patterns[t2], this.DX[d], this.DY[d])) list.push(t2);
      }

      //TODO could just directly set list as the element, right ?
      this.propagator[d][t] = new Array(list.length);

      for (var c = 0; c < list.length; c++) {
        this.propagator[d][t][c] = list[c];
      }
    }
  }
}

OverlappingModel.prototype = Object.create(Model.prototype);
OverlappingModel.prototype.constructor = OverlappingModel;

OverlappingModel.prototype.onBoundary = function (x, y) {
  return !this.periodic && (x + this.N  > this.FMX || y + this.N > this.FMY || x < 0 || y < 0);
};

OverlappingModel.prototype.clear = function () {
  Model.prototype.clear.call(this);

  if (this.ground !== 0) {
    for (var x = 0; x < this.FMX; x++) {
      for (var t = 0; t < this.T; t++) if (t !== this.ground) this.ban(x + (this.FMY - 1) * this.FMX, t);
      for (var y = 0; y < this.FMY - 1; y++) this.ban(x + y * this.FMX, this.ground);
    }

    this.propagate();
  }
};

OverlappingModel.prototype.graphics = function (array) {
  array = array || new Uint8Array(this.FMX * this.FMY * 4);

  if (this.observed !== null) {
    this.graphicsComplete(array);
  } else {
    throw new Error('graphicsIncomplete not implemented yet');
    //this.graphicsIncomplete(array);
  }

  return array;
};

OverlappingModel.prototype.graphicsComplete = function (array) {
  //console.time('graphicsComplete');

  for (var y = 0; y < this.FMY; y++) {
    var dy = y < this.FMY - this.N + 1 ? 0 : this.N - 1;
    for (var x = 0; x < this.FMX; x++) {
      var dx = x < this.FMX - this.N + 1 ? 0 : this.N - 1;

      var pixelIndex = (y * this.FMX + x) * 4;

      var color = this.colors[this.patterns[this.observed[x - dx + (y - dy) * this.FMX]][dx + dy * this.N]];

      array[pixelIndex] = color[0];
      array[pixelIndex + 1] = color[1];
      array[pixelIndex + 2] = color[2];
      array[pixelIndex + 3] = color[3];
    }
  }

  //console.timeEnd('graphicsComplete');
};

module.exports = OverlappingModel;