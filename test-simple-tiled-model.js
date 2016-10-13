"use strict";

var SimpleTiledModel = require('./index').SimpleTiledModel;

var Jimp = require('jimp');

var structure = {
    tilesize: 7,
    tiles: [
        { name:"bridge", path:"./data/castle/bridge.png", symmetry:"I" },
        { name:"ground", path:"./data/castle/ground.png", symmetry:"X" },
        { name:"river", path:"./data/castle/river.png", symmetry:"I" },
        { name:"riverturn", path:"./data/castle/riverturn.png", symmetry:"L" },
        { name:"road", path:"./data/castle/road.png", symmetry:"I" },
        { name:"roadturn", path:"./data/castle/roadturn.png", symmetry:"L" },
        { name:"t", path:"./data/castle/t.png", symmetry:"T" },
        { name:"tower", path:"./data/castle/tower.png", symmetry:"L" },
        { name:"wall", path:"./data/castle/wall.png", symmetry:"I" },
        { name:"wallriver", path:"./data/castle/wallriver.png", symmetry:"I" },
        { name:"wallroad", path:"./data/castle/wallroad.png", symmetry:"I" }
    ],
    neighbors: [
        { left:"bridge 1", right:"river 1" },
        { left:"bridge 1", right:"riverturn 1" },
        { left:"bridge", right:"road 1" },
        { left:"bridge", right:"roadturn 1" },
        { left:"bridge", right:"t" },
        { left:"bridge", right:"t 3" },
        { left:"bridge", right:"wallroad" },
        { left:"ground", right:"ground" },
        { left:"ground", right:"river" },
        { left:"ground", right:"riverturn" },
        { left:"ground", right:"road" },
        { left:"ground", right:"roadturn" },
        { left:"ground", right:"t 1" },
        { left:"ground", right:"tower" },
        { left:"ground", right:"wall" },
        { left:"river 1", right:"river 1" },
        { left:"river 1", right:"riverturn 1" },
        { left:"river", right:"road" },
        { left:"river", right:"roadturn" },
        { left:"river", right:"t 1" },
        { left:"river", right:"tower" },
        { left:"river", right:"wall" },
        { left:"river 1", right:"wallriver" },
        { left:"riverturn", right:"riverturn 2" },
        { left:"road", right:"riverturn" },
        { left:"roadturn 1", right:"riverturn" },
        { left:"roadturn 2", right:"riverturn" },
        { left:"t 3", right:"riverturn" },
        { left:"tower 1", right:"riverturn" },
        { left:"tower 2", right:"riverturn" },
        { left:"wall", right:"riverturn" },
        { left:"riverturn", right:"wallriver" },
        { left:"road 1", right:"road 1" },
        { left:"roadturn", right:"road 1" },
        { left:"road 1", right:"t" },
        { left:"road 1", right:"t 3" },
        { left:"road", right:"tower" },
        { left:"road", right:"wall" },
        { left:"road 1", right:"wallroad" },
        { left:"roadturn", right:"roadturn 2" },
        { left:"roadturn", right:"t" },
        { left:"roadturn 1", right:"tower" },
        { left:"roadturn 2", right:"tower" },
        { left:"roadturn 1", right:"wall" },
        { left:"roadturn", right:"wallroad" },
        { left:"t", right:"t 2" },
        { left:"t 3", right:"tower" },
        { left:"t 3", right:"wall" },
        { left:"t", right:"wallroad" },
        { left:"t 1", right:"wallroad" },
        { left:"tower", right:"wall 1" },
        { left:"tower", right:"wallriver 1" },
        { left:"tower", right:"wallroad 1" },
        { left:"wall 1", right:"wall 1" },
        { left:"wall 1", right:"wallriver 1" },
        { left:"wall 1", right:"wallroad 1" },
        { left:"wallriver 1", right:"wallroad 1" }
    ]
};

var addBitmapDataToStructure = function (structure, callback) {
    var promises = [];

    structure.tiles.map(function (tile) {
        promises.push(Jimp.read(tile.path).then(function (result) {
            tile.bitmap = new Uint8Array(result.bitmap.data);
            return true;
        }));
    });

    Promise.all(promises).then(function () {
        callback(null, structure);
    }, function (error) {
        callback(error, null);
    });
};


var seed = require('seed-random');

addBitmapDataToStructure(structure, function (error, structure) {
    console.log(error);

    if (error) throw error;

    console.log('HERE');

    var destWidth = 20;
    var destHeight = 20;

    try {
        var model = new SimpleTiledModel(structure, null, destWidth, destHeight, false);


        var finished = model.iterate(200);

        console.log(finished);

        if (finished) {
            var result = model.graphics(null, [255,255,0,255]);

            var image = new Jimp(destWidth * structure.tilesize, destHeight * structure.tilesize, function (err, image) {
                image.bitmap.data = new Buffer(result.buffer);
                image.write("CastleTest.png");
            });
        }
    } catch(e) {
        console.log(e.stack);
    }

    //console.log(model);
    console.log('THERE');
});
