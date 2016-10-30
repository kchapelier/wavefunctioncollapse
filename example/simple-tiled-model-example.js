"use strict";

var SimpleTiledModel = require('./../index').SimpleTiledModel,
    Jimp = require('jimp'),
    seed = require('seed-random');

var definition = require('./data/castle.definition.js');

var loadTileBitmapData = function (basePath, tile, number) {
    var unique = number !== null,
        tilePath = basePath + tile.name + (unique ? ' ' + number : '') + '.png';

    return Jimp.read(tilePath).then(function (result) {
        if (unique) {
            tile.bitmap[number] = new Uint8Array(result.bitmap.data); //add the bitmap data in each tile variant
        } else {
            tile.bitmap = new Uint8Array(result.bitmap.data); //add the bitmap data in each tile
        }

        return true;
    });
};

var addBitmapDataToStructure = function (structure, callback) {
    var promises = [],
        path = structure.path,
        unique = !!structure.unique;

    structure.tiles.map(function (tile) {
        if (unique) {
            if (tile.symmetry === 'X') {
                tile.bitmap = new Array(1);
                promises.push(loadTileBitmapData(path, tile, 0));
            } else {
                tile.bitmap = new Array(4);
                promises.push(loadTileBitmapData(path, tile, 0));
                promises.push(loadTileBitmapData(path, tile, 1));
                promises.push(loadTileBitmapData(path, tile, 2));
                promises.push(loadTileBitmapData(path, tile, 3));
            }
        } else {
            promises.push(loadTileBitmapData(path, tile, null));
        }
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

        var time = Date.now();
        var finished = model.generate(seed('test2'));

        console.log(finished ? 'Generation successful' : 'Generation unsuccessful');
        console.log(Date.now() - time, 'ms');

        if (finished) {
            var result = model.graphics();

            var image = new Jimp(destWidth * definition.tilesize, destHeight * definition.tilesize, function (err, image) {
                image.bitmap.data = new Buffer(result.buffer);
                image.write("./output/simple-tiled-model.png");
            });
        }
    } catch(e) {
        console.log('An error occurred');
        console.log(e.stack);
    }
});
