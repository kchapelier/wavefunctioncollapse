# wavefunctioncollapse

Javascript port of https://github.com/mxgmn/WaveFunctionCollapse

- [Interactive OverlappingModel demo](http://www.kchapelier.com/wfc-example/overlapping-model.html)
- [Interactive SimpleTiledModel demo](http://www.kchapelier.com/wfc-example/simple-tiled-model.html)
- [Animated SimpleTiledModel demo](http://www.kchapelier.com/wfc-example/simple-tiled-model-animated.html)

## Installing

With [npm](http://npmjs.org) do:

```
npm install wavefunctioncollapse --production
```

## Public API

### OverlappingModel Constructor

**new OverlappingModel(data, dataWidth, dataHeight, N, width, height, periodicInput, periodicOutput, symmetry[, ground])**

 - *data :* The RGBA data of the source image.
 - *dataWidth :* The width of the source image.
 - *dataHeight :* The height of the source image.
 - *N :* Size of the patterns.
 - *width :* The width of the generation (in pixels).
 - *height :* The height of the generation (in pixels).
 - *periodicInput :* Whether the source image is to be considered as periodic / as a repeatable texture.
 - *periodicOutput :* Whether the generation should be periodic / a repeatable texture.
 - *symmetry :* Allowed symmetries from 1 (no symmetry) to 8 (all mirrored / rotated variations)
 - *ground :* Id of the specific pattern to use as the bottom of the generation ([learn more](https://github.com/mxgmn/WaveFunctionCollapse/issues/3#issuecomment-250995366))

```js
var wfc = require('wavefunctioncollapse');

var imgData = ... // let's pretend this is an ImageData retrieved from a canvas context in the browser

var model = new wfc.OverlappingModel(imgData.data, imgData.width, imgData.height, 3, 48, 48, true, true, 4);
```

### OverlappingModel Methods

**model.graphics([array])**

Retrieve the RGBA data of the generation.

 - *array :* Array to write the RGBA data into (must already be set to the correct size), if not set a new Uint8Array will be created and returned. It is recommended to use Uint8Array or Uint8ClampedArray.

```js
// create a blank ImageData
var imgData = canvasContext.createImageData(48, 48);

// write the RGBA data directly in the ImageData
model.graphics(imgData.data);

// print the ImageData in the canvas
canvasContext.putImageData(imgData, 0, 0);
```

### SimpleTiledModel Constructor

**new SimpleTiledModel(data, subsetName, width, height, periodicOutput)**

 - *data :* Tiles, subset and constraints definitions. The proper doc on this matter is yet to be written, check the example in the meantime.
 - *subsbetName :* Name of the subset to use from the data. If falsy, use all tiles.
 - *width :* The width of the generation (in tiles).
 - *height :* The height of the generation (in tiles).
 - *periodicOutput :* Whether the generation should be periodic / a repeatable texture.

```js
var wfc = require('wavefunctioncollapse');

var data = ... // object with tiles, subsets and constraints definitions

var model = new wfc.SimpleTiledModel(data, null, 48, 48, false);
```

### SimpleTiledModel Methods

**model.graphics([array[, defaultColor]])**

Retrieve the RGBA data of the generation.

 - *array :* Array to write the RGBA data into (must already be set to the correct size), if not set a new Uint8Array will be created and returned. It is recommended to use Uint8Array or Uint8ClampedArray.
 - *defaultColor :* RGBA data of the default color to use on untouched tiles.

```js
// create a blank ImageData
var imgData = canvasContext.createImageData(48, 48);

// write the RGBA data directly in the ImageData, use an opaque blue as the default color
model.graphics(imgData.data, [0, 0, 255, 255]);

// print the ImageData in the canvas
canvasContext.putImageData(imgData, 0, 0);
```

### Common Methods

**model.generate([rng])**

Execute a complete new generation. Returns whether the generation was successful.

```js
model.generate(Math.random); // return true or false
```

 - *rng :* A function to use as random number generator, defaults to Math.random.

**model.iterate(iterations[, rng])**

Execute a fixed number of iterations. Stop when the generation is successful or reaches a contradiction. Returns whether the iterations ran without reaching a contradiction.

 - *iterations :* Maximum number of iterations to execute (0 = infinite).
 - *rng :* A function to use as random number generator, defaults to Math.random.

```js
model.iterate(30, Math.random); // return true or false
```

**model.isGenerationComplete()**

Returns whether the previous generation completed successfully.

**model.clear()**

Clear the internal state to start a new generation.

## Changelog

### [2.0.0](https://github.com/kchapelier/wavefunctioncollapse/tree/2.0.0) (2019-07-06)

 * Port of the newer, faster, implementation.
 * This port is now written in ES6 instead of ES5 [breaking change].

### [1.0.0](https://github.com/kchapelier/wavefunctioncollapse/tree/1.0.0) (2016-10-14)

 * Change and freeze the public API (with iteration support).
 * First publication on NPM.

### License

MIT
