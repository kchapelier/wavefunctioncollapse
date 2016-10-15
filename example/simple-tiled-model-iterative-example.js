"use strict";

var SimpleTiledModel = require('./../index').SimpleTiledModel,
    Jimp = require('jimp'),
    seed = require('seed-random');

var definition = require('./data/castle.definition.js');

var addBitmapDataToStructure = function (structure, callback) {
    var promises = [];

    structure.tiles.map(function (tile) {
        promises.push(Jimp.read(tile.path).then(function (result) {
            tile.bitmap = new Uint8Array(result.bitmap.data); //add the bitmap data in each tiles
            return true;
        }));
    });

    Promise.all(promises).then(function () {
        callback(null, structure);
    }, function (error) {
        callback(error, null);
    });
};

addBitmapDataToStructure(definition, function (err, definition) {
    if (err) {
        throw err;
    }

    var destWidth = 20,
        destHeight = 20;

    //try catch to prevent the eventual errors from being silenced by the promise...

    try {
        var model = new SimpleTiledModel(definition, null, destWidth, destHeight, false);

        var rng = seed('test');

        var image = new Jimp(destWidth * definition.tilesize, destHeight * definition.tilesize, function (err, image) {
            var rgbaData = new Uint8Array(image.bitmap.data.buffer);
            var contradiction = false;
            var iteration = 0;

            for (var i = 0; i < 500 && !model.isGenerationComplete() && !contradiction; i++) {
                contradiction = !model.iterate(1, rng);

                if (!contradiction) {
                    iteration = model.iterativeGraphics(rgbaData, null, iteration);
                    image.write("./output/simple-tiled-iterative-model-" + i + ".bmp");
                }
            }

            console.log(!contradiction ? 'Generation successful' : 'Generation unsuccessful');

        });
    } catch(e) {
        console.log('An error occurred');
        console.log(e.stack);
    }
});
