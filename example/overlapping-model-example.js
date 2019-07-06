"use strict";

const OverlappingModel = require('./../index').OverlappingModel;
const Jimp = require('jimp');
const lcg = require('./lcg');

Jimp.read('./data/flowers.bmp', function (err, sourceImage) {
  if (err) {
    throw err;
  }

  const data = new Uint8Array(sourceImage.bitmap.data);
  const width = sourceImage.bitmap.width;
  const height = sourceImage.bitmap.height;
  const destWidth = 48;
  const destHeight = 48;

  const model = new OverlappingModel(data, width, height, 3, destWidth, destHeight, true, true, 2, 102);
  const finished = model.generate(lcg('testt'));

  if (finished) {
    console.log('Success');
    const result = model.graphics();

    new Jimp(destWidth, destHeight, function (err, image) {
      image.bitmap.data = Buffer.from(result.buffer);
      image.write('./output/overlapping-model.png');
    });
  } else {
    console.log('The generation ended in a contradiction');
  }
});
