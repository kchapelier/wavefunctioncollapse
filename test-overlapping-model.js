"use strict";

var OverlappingModel = require('./index').OverlappingModel;

var Jimp = require('jimp');

var seed = require('seed-random');

Jimp.read("Flowers.bmp", function (err, lenna) {
  if (err) throw err;

  var data = new Uint8Array(lenna.bitmap.data);
  var width = lenna.bitmap.width;
  var height = lenna.bitmap.height;

  var destWidth = 48;
  var destHeight = 48;

  var model = new OverlappingModel(data, width, height, 3, destWidth, destHeight, true, true, 2, 102);

  var time = Date.now();
  var finished = model.iterate(1000/*, seed('testing')*/);
  console.log(Date.now() - time, 'ms');

  console.log(finished);

  if (finished) {
      var time = Date.now();
    var result = model.graphics(null);
      console.log(Date.now() - time, 'ms');

    var image = new Jimp(destWidth, destHeight, function (err, image) {
      image.bitmap.data = new Buffer(result.buffer);
      image.write("FlowerTest.png");
    });
  }


});
