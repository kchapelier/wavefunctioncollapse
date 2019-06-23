"use strict";

var randomIndice = require('./random-indice');

var Model = function Model () {};

Model.prototype.initiliazedField = false;
Model.prototype.generationComplete = false;

/**
 * @protected
 */
Model.prototype.initialize = function () {
  this.wave = new Array(this.FMX * this.FMY);
  this.compatible = new Array(this.wave.length);

  for (var i = 0; i < this.wave.length; i++) {
    this.wave[i] = new Array(this.T);
    this.compatible[i] = new Array(this.T);

    for (var t = 0; t < this.T; t++) {
      this.compatible[i][t] = [0,0,0,0];
    }
  }

  this.weightLogWeights = new Array(this.T);
  this.sumOfWeights = 0;
  this.sumOfWeightLogWeights = 0;

  for (var t = 0; t < this.T; t++) {
    this.weightLogWeights[t] = this.weights[t] * Math.log(this.weights[t]);
    this.sumOfWeights += this.weights[t];
    this.sumOfWeightLogWeights += this.weightLogWeights[t];
  }

  this.startingEntropy = Math.log(this.sumOfWeights) - this.sumOfWeightLogWeights / this.sumOfWeights;

  this.sumsOfOnes = new Array(this.FMX * this.FMY);
  this.sumsOfWeights = new Array(this.FMX * this.FMY);
  this.sumsOfWeightLogWeights = new Array(this.FMX * this.FMY);
  this.entropies = new Array(this.FMX * this.FMY);

  this.stack = new Array(this.FMX * this.FMY * this.T);
  this.stackSize = 0;
};

/**
 *
 * @param {Function} rng Random number generator function
 *
 * @returns {*}
 *
 * @protected
 */
Model.prototype.observe = function (rng) {

  var min = 1000;
  var argmin = -1;

  for (var i = 0; i < this.wave.length; i++) {
    if (this.onBoundary(i % this.FMX, i / this.FMX | 0)) continue;

    var amount = this.sumsOfOnes[i];

    if (amount === 0) return false;

    var entropy = this.entropies[i];

    if (amount > 1 && entropy <= min) {
      var noise = 0.000001 * rng();

      if (entropy + noise < min) {
        min = entropy + noise;
        argmin = i;
      }
    }
  }

  if (argmin === -1) {
    this.observed = new Array(this.FMX * this.FMY);

    for (var i = 0; i < this.wave.length; i++) {
      for (var t = 0; t < this.T; t++) {
        if (this.wave[i][t]) {
          this.observed[i] = t;
          break;
        }
      }
    }

    return true;
  }

  this.distribution = new Array(this.T);
  for (var t = 0; t < this.T; t++) {
    this.distribution[t] = this.wave[argmin][t] ? this.weights[t] : 0;
  }
  var r = randomIndice(this.distribution, rng());

  var w = this.wave[argmin];
  for (var t = 0; t < this.T; t++) {
    if (w[t] !== (t === r)) this.ban(argmin, t);
  }

  return null;
};

/**
 * @protected
 */
Model.prototype.propagate = function () {
  while (this.stackSize > 0) {
    var e1 = this.stack[this.stackSize - 1];
    this.stackSize--;

    var i1 = e1[0];
    var x1 = i1 % this.FMX;
    var y1 = i1 / this.FMX | 0;

    for (var d = 0; d < 4; d++) {
      var dx = this.DX[d];
      var dy = this.DY[d];

      var x2 = x1 + dx;
      var y2 = y1 + dy;

      if (this.onBoundary(x2, y2)) continue;

      if (x2 < 0) x2 += this.FMX;
      else if (x2 >= this.FMX) x2 -= this.FMX;
      if (y2 < 0) y2 += this.FMY;
      else if (y2 >= this.FMY) y2 -= this.FMY;

      var i2 = x2 + y2 * this.FMX;
      var p = this.propagator[d][e1[1]];
      var compat = this.compatible[i2];

      for (var l = 0; l < p.length; l++) {
        var t2 = p[l];
        var comp = compat[t2];
        comp[d]--;
        if (comp[d] == 0) this.ban(i2, t2);
      }
    }
  }
};

/**
 * Execute a single iteration
 *
 * @param {Function} rng Random number generator function
 *
 * @returns {boolean|null}
 *
 * @protected
 */
Model.prototype.singleIteration = function (rng) {
  var result = this.observe(rng);

  if (result !== null) {
    this.generationComplete = result;

    return !!result;
  }

  this.propagate();

  return null;
};

/**
 * Execute a fixed number of iterations. Stop when the generation is successful or reaches a contradiction.
 *
 * @param {int} [iterations=0] Maximum number of iterations to execute (0 = infinite)
 * @param {Function|null} [rng=Math.random] Random number generator function
 *
 * @returns {boolean} Success
 *
 * @public
 */
Model.prototype.iterate = function (iterations, rng) {
  var result;
  var i;

  if (!this.wave) this.initialize();

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
 *
 * @param {Function|null} [rng=Math.random] Random number generator function
 *
 * @returns {boolean} Success
 *
 * @public
 */
Model.prototype.generate = function (rng) {
  var result;

  rng = rng || Math.random;

  if (!this.wave) this.initialize();

  this.clear();

  while(true) {
    result = this.singleIteration(rng);

    if (result !== null) {
      return !!result;
    }
  }
};

/**
 * Check whether the previous generation completed successfully
 *
 * @returns {boolean}
 *
 * @public
 */
Model.prototype.isGenerationComplete = function () {
  return this.generationComplete;
};

/**
 *
 * @param {int} i
 * @param {int} t
 *
 * @protected
 */
Model.prototype.ban = function (i, t) {
  this.wave[i][t] = false;
  var comp = this.compatible[i][t];
  for (var d = 0; d < 4; d++) comp[d] = 0;
  this.stack[this.stackSize] = [i, t];
  this.stackSize++;

  this.sumsOfOnes[i] -= 1;
  this.sumsOfWeights[i] -= this.weights[t];
  this.sumsOfWeightLogWeights[i] -= this.weightLogWeights[t];

  var sum = this.sumsOfWeights[i];
  this.entropies[i] = Math.log(sum) - this.sumsOfWeightLogWeights[i] / sum;
};

/**
 * Clear the internal state to start a new generation
 *
 * @public
 */
Model.prototype.clear = function () {
  for (var i = 0; i < this.wave.length; i++) {
    for (var t = 0; t < this.T; t++) {
      this.wave[i][t] = true;

      for (var d = 0; d < 4; d++) {
        this.compatible[i][t][d] = this.propagator[this.opposite[d]][t].length;
      }
    }

    this.sumsOfOnes[i] = this.weights.length;
    this.sumsOfWeights[i] = this.sumOfWeights;
    this.sumsOfWeightLogWeights[i] = this.sumOfWeightLogWeights;
    this.entropies[i] = this.startingEntropy;
  }

  this.initiliazedField = true;
  this.generationComplete = false;
};

Model.prototype.DX = [-1, 0, 1, 0];
Model.prototype.DY = [0, 1, 0, -1];
Model.prototype.opposite = [2, 3, 0, 1];

module.exports = Model;