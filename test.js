"use strict";

var OverlappingModel = require('./overlapping-model');

// <overlapping name="Flowers" N="3" symmetry="2" foundation="102" width="30" height="30" screenshots="1"/>

//new OverlappingModel(name, xnode.Get("N", 2), xnode.Get("width", 48), xnode.Get("height", 48), xnode.Get("periodicInput", true), xnode.Get("periodicOutput", true), xnode.Get("symmetry", 8), xnode.Get("foundation", 0));

//var model = new OverlappingModel(data, width, height, 3, 30, 30, true, true, 2, 102);

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
  var finished = model.run(0/*, seed('testing')*/);
  console.log(Date.now() - time, 'ms');

  console.log(finished);

  if (finished) {
    var result = model.graphics();

    var image = new Jimp(destWidth, destHeight, function (err, image) {
      image.bitmap.data = new Buffer(result.buffer);
      image.write("FlowerTest.png");
    });
  }


});
