"use strict";

var OverlappingModel = require('./../index').OverlappingModel,
    Jimp = require('jimp'),
    lcg = require('./lcg');

Jimp.read('./data/flowers.bmp', function (err, sourceImage) {
    if (err) {
        throw err;
    }

    var data = new Uint8Array(sourceImage.bitmap.data),
        width = sourceImage.bitmap.width,
        height = sourceImage.bitmap.height,
        destWidth = 48,
        destHeight = 48;

    var model = new OverlappingModel(data, width, height, 3, destWidth, destHeight, true, true, 2, 102);

    var time = Date.now();
    var finished = model.generate(lcg('test'));

    console.log(finished ? 'Generation successful' : 'Generation unsuccessful');
    console.log(Date.now() - time, 'ms');

    if (finished) {
        var result = model.graphics();

        new Jimp(destWidth, destHeight, function (err, image) {
            image.bitmap.data = new Buffer(result.buffer);
            image.write("output/overlapping-model.png");
        });
    }
});
