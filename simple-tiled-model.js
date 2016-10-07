"use strict";

var Model = require('./model');

/**
 *
 * @param {object} data
 * @param {string} subsetName
 * @param {int} width
 * @param {int} height
 * @param {bool} periodic
 * @param {bool} black
 * @constructor
 */
var SimpleTiledModel = function SimpleTiledModel (data, subsetName, width, height, periodic, black) {
    var self = this;

    this.FMX = width;
    this.FMY = height;
    this.periodic = periodic;
    this.black = black;

    /*
    var xdoc = new XmlDocument();
    xdoc.Load($"samples/{name}/data.xml");
    XmlNode xnode = xdoc.FirstChild;
    tilesize = xnode.Get("size", 16);
    bool unique = xnode.Get("unique", false);
    xnode = xnode.FirstChild;
    */

    this.tilesize = data.tilesize || 16;
    var unique = !!data.unique;

    /*
    List<string> subset = null;
    if (subsetName != default(string))
    {
        subset = new List<string>();
        foreach (XmlNode xsubset in xnode.NextSibling.NextSibling.ChildNodes)
        if (xsubset.NodeType != XmlNodeType.Comment && xsubset.Get<string>("name") == subsetName)
            foreach (XmlNode stile in xsubset.ChildNodes) subset.Add(stile.Get<string>("name"));
    }
    */

    var subset = null;

    if (subsetName && data.subsets && !!data.subsets[subsetName]) {
        subset = data.subsets[subsetName];
    }

    /*
    Func<Func<int, int, Color>, Color[]> tile = f =>
    {
        Color[] result = new Color[tilesize * tilesize];
        for (int y = 0; y < tilesize; y++) for (int x = 0; x < tilesize; x++) result[x + y * tilesize] = f(x, y);
        return result;
    };
    */

    var tile = function tile(f) {
        var result = new Array(self.tilesize * self.tilesize);

        for (var y = 0; y < self.tilesize; y++) {
            for (var x = 0; x < self.tilesize; x++) {
                result[x + y * self.tilesize] = f(x, y);
            }
        }

        return result;
    };

    /*
    Func<Color[], Color[]> rotate = array => tile((x, y) => array[tilesize - 1 - y + x * tilesize]);
    */

    var rotate = function rotate (array) {
        return tile(function(x, y) {
            return array[self.tilesize - 1 - y + x * self.tilesize];
        });
    };

    /*
     tiles = new List<Color[]>();
     var tempStationary = new List<double>();
     */

    this.tiles = new Array();
    var tempStationary = new Array();

    var action = new Array();
    var firstOccurrence = {};

    /*
    foreach (XmlNode xtile in xnode.ChildNodes)
    {
        string tilename = xtile.Get<string>("name");
        if (subset != null && !subset.Contains(tilename)) continue;

        Func<int, int> a, b;
        int cardinality;

        char sym = xtile.Get("symmetry", 'X');
        if (sym == 'L')
        {
            cardinality = 4;
            a = i => (i + 1) % 4;
            b = i => i % 2 == 0 ? i + 1 : i - 1;
        }
        else if (sym == 'T')
        {
            cardinality = 4;
            a = i => (i + 1) % 4;
            b = i => i % 2 == 0 ? i : 4 - i;
        }
        else if (sym == 'I')
        {
            cardinality = 2;
            a = i => 1 - i;
            b = i => i;
        }
        else if (sym == '\\')
        {
            cardinality = 2;
            a = i => 1 - i;
            b = i => 1 - i;
        }
        else
        {
            cardinality = 1;
            a = i => i;
            b = i => i;
        }

        T = action.Count;
        firstOccurrence.Add(tilename, T);

        int[][] map = new int[cardinality][];
        for (int t = 0; t < cardinality; t++)
        {
            map[t] = new int[8];

            map[t][0] = t;
            map[t][1] = a(t);
            map[t][2] = a(a(t));
            map[t][3] = a(a(a(t)));
            map[t][4] = b(t);
            map[t][5] = b(a(t));
            map[t][6] = b(a(a(t)));
            map[t][7] = b(a(a(a(t))));

            for (int s = 0; s < 8; s++) map[t][s] += T;

            action.Add(map[t]);
        }

        if (unique)
        {
            for (int t = 0; t < cardinality; t++)
            {
                Bitmap bitmap = new Bitmap($"samples/{name}/{tilename} {t}.png");
                tiles.Add(tile((x, y) => bitmap.GetPixel(x, y)));
            }
        }
        else
        {
            Bitmap bitmap = new Bitmap($"samples/{name}/{tilename}.png");
            tiles.Add(tile((x, y) => bitmap.GetPixel(x, y)));
            for (int t = 1; t < cardinality; t++) tiles.Add(rotate(tiles[T + t - 1]));
        }

        for (int t = 0; t < cardinality; t++) tempStationary.Add(xtile.Get("weight", 1.0f));
    }
    */

    var currentTile;
    var funcA, funcB;
    var cardinality = 4;

    for (var i = 0; i < data.tiles.length; i++)
    {
        currentTile = data.tiles[i];

        if (subset !== null && subset.indexOf(currentTile.name) === -1) {
            continue;
        }

        switch (currentTile.symmetry) {
            case 'L':
                cardinality = 4;
                funcA = function (i) { return (i + 1) % 4; };
                funcB = function (i) { return i % 2 == 0 ? i + 1 : i - 1; };
                break;
            case 'T':
                cardinality = 4;
                funcA = function (i) { return (i + 1) % 4; };
                funcB = function (i) { return i % 2 == 0 ? i : 4 - i; };
                break;
            case 'I':
                cardinality = 2;
                funcA = function (i) { return 1 - i; };
                funcB = function (i) { return i; };
                break;
            case '\\':
                cardinality = 2;
                funcA = function (i) { return 1 - i; };
                funcB = function (i) { return 1 - i; };
                break;
            case 'X':
            default:
                cardinality = 1;
                funcA = function (i) { return i; };
                funcB = function (i) { return i; };
                break;
        }

        this.T = action.length;
        firstOccurrence[currentTile.name] = this.T;

        var map = new Array(cardinality);

        for (var t = 0; t < cardinality; t++) {
            map[t] = new Array(8);

            map[t][0] = this.T + t;
            map[t][1] = this.T + funcA(t);
            map[t][2] = this.T + funcA(funcA(t));
            map[t][3] = this.T + funcA(funcA(funcA(t)));
            map[t][4] = this.T + funcB(t);
            map[t][5] = this.T + funcB(funcA(t));
            map[t][6] = this.T + funcB(funcA(funcA(t)));
            map[t][7] = this.T + funcB(funcA(funcA(funcA(t))));

            action.push(map[t]);
        }

        var bitmap;
        if (unique) {
            for (var t = 0; t < cardinality; t++) {
                bitmap = currentTile.bitmap[t];
                this.tiles.push(tile(function (x, y) {
                    return [
                        bitmap[(self.tilesize * y + x) * 4],
                        bitmap[(self.tilesize * y + x) * 4 + 1],
                        bitmap[(self.tilesize * y + x) * 4 + 2],
                        bitmap[(self.tilesize * y + x) * 4 + 3]
                    ];
                }));
            }
        } else {
            bitmap = currentTile.bitmap;
            this.tiles.push(tile(function (x, y) {
                return [
                    bitmap[(self.tilesize * y + x) * 4],
                    bitmap[(self.tilesize * y + x) * 4 + 1],
                    bitmap[(self.tilesize * y + x) * 4 + 2],
                    bitmap[(self.tilesize * y + x) * 4 + 3]
                ];
            }));

            for (var t = 1; t < cardinality; t++) {
                this.tiles.push(rotate(this.tiles[this.T + t - 1]));
            }
        }

        for (var t = 0; t < cardinality; t++) {
            tempStationary.push(currentTile.weight || 1);
        }
    }

    /*
    T = action.Count;
    stationary = tempStationary.ToArray();

    propagator = new bool[4][][];
    for (int d = 0; d < 4; d++)
    {
        propagator[d] = new bool[T][];
        for (int t = 0; t < T; t++) propagator[d][t] = new bool[T];
    }
    */

    this.T = action.length;
    this.stationary = tempStationary;



    //console.log('Action', action.join('\n'));

    //console.log('First occurence', firstOccurrence);
    //console.log('stationary', this.stationary, this.stationary.length);
    //process.exit();



    this.propagator = new Array(4);

    for (var d = 0; d < 4; d++) {
        this.propagator[d] = new Array(this.T);
        for (var t = 0; t < this.T; t++) {
            this.propagator[d][t] = new Array(this.T);
            for (var t2 = 0; t2 < this.T; t2++) {
                this.propagator[d][t][t2] = false;
            }
        }
    }

    /*
    wave = new bool[FMX][][];
    changes = new bool[FMX][];
    for (int x = 0; x < FMX; x++)
    {
        wave[x] = new bool[FMY][];
        changes[x] = new bool[FMY];
        for (int y = 0; y < FMY; y++) wave[x][y] = new bool[T];
    }
    */

    this.wave = new Array(this.FMX);
    this.changes = new Array(this.FMX);
    for (var x = 0; x < this.FMX; x++) {
        this.wave[x] = new Array(this.FMY);
        this.changes[x] = new Array(this.FMY);

        for (var y = 0; y < this.FMY; y++) {
            this.wave[x][y] = new Array(this.T);
        }
    }

    /*
    foreach (XmlNode xneighbor in xnode.NextSibling.ChildNodes)
    {
        string[] left = xneighbor.Get<string>("left").Split(new char[] { ' ' }, StringSplitOptions.RemoveEmptyEntries);
        string[] right = xneighbor.Get<string>("right").Split(new char[] { ' ' }, StringSplitOptions.RemoveEmptyEntries);

        if (subset != null && (!subset.Contains(left[0]) || !subset.Contains(right[0]))) continue;

        int L = action[firstOccurrence[left[0]]][left.Length == 1 ? 0 : int.Parse(left[1])], D = action[L][1];
        int R = action[firstOccurrence[right[0]]][right.Length == 1 ? 0 : int.Parse(right[1])], U = action[R][1];

        propagator[0][R][L] = true;
        propagator[0][action[R][6]][action[L][6]] = true;
        propagator[0][action[L][4]][action[R][4]] = true;
        propagator[0][action[L][2]][action[R][2]] = true;

        propagator[1][U][D] = true;
        propagator[1][action[D][6]][action[U][6]] = true;
        propagator[1][action[U][4]][action[D][4]] = true;
        propagator[1][action[D][2]][action[U][2]] = true;
    }
    */

    for (var i = 0; i < data.neighbors.length; i++) {
        var neighbor = data.neighbors[i];

        var left = neighbor.left.split(' ').filter(function (v) { return v.length; });
        var right = neighbor.right.split(' ').filter(function (v) { return v.length; });

        if (subset !== null && (subset.indexOf(left[0]) === -1 || subset.indexOf(right[0]) === -1)) {
            continue;
        }

        var L = action[firstOccurrence[left[0]]][left.length == 1 ? 0 : parseInt(left[1], 10)],
            D = action[L][1],
            R = action[firstOccurrence[right[0]]][right.length == 1 ? 0 : parseInt(right[1], 10)],
            U = action[R][1];

        //console.log(left.join(', '), '/', right.join(', '));
        //console.log(L, D, R, U);

        this.propagator[0][R][L] = true;
        this.propagator[0][action[R][6]][action[L][6]] = true;
        this.propagator[0][action[L][4]][action[R][4]] = true;
        this.propagator[0][action[L][2]][action[R][2]] = true;

        this.propagator[1][U][D] = true;
        this.propagator[1][action[D][6]][action[U][6]] = true;
        this.propagator[1][action[U][4]][action[D][4]] = true;
        this.propagator[1][action[D][2]][action[U][2]] = true;
    }


    /*
    for (int t2 = 0; t2 < T; t2++) for (int t1 = 0; t1 < T; t1++)
    {
        propagator[2][t2][t1] = propagator[0][t1][t2];
        propagator[3][t2][t1] = propagator[1][t1][t2];
    }
    */

    for (var t2 = 0; t2 < this.T; t2++) {
        for (var t1 = 0; t1 < this.T; t1++) {
            this.propagator[2][t2][t1] = this.propagator[0][t1][t2];
            this.propagator[3][t2][t1] = this.propagator[1][t1][t2];
        }
    }

    //console.log(this.propagator[3][0].join(', '));

    //process.exit();
};

SimpleTiledModel.prototype = Object.create(Model.prototype);
SimpleTiledModel.prototype.constructor = SimpleTiledModel;

SimpleTiledModel.prototype.propagator = null;

SimpleTiledModel.prototype.tiles = 0;
SimpleTiledModel.prototype.tilesize = 0;
SimpleTiledModel.prototype.black = false;

/**
 * @protected
 * @returns {boolean}
 */
SimpleTiledModel.prototype.propagate = function () {
    var change = false,
        b;

    for (var x2 = 0; x2 < this.FMX; x2++) {
        for (var y2 = 0; y2 < this.FMY; y2++) {
            for(var d = 0; d < 4; d++) {
                /*
                int x1 = x2, y1 = y2;
                if (d == 0)
                {
                    if (x2 == 0)
                    {
                        if (!periodic) continue;
                        else x1 = FMX - 1;
                    }
                    else x1 = x2 - 1;
                }
                else if (d == 1)
                {
                    if (y2 == FMY - 1)
                    {
                        if (!periodic) continue;
                        else y1 = 0;
                    }
                    else y1 = y2 + 1;
                }
                else if (d == 2)
                {
                    if (x2 == FMX - 1)
                    {
                        if (!periodic) continue;
                        else x1 = 0;
                    }
                    else x1 = x2 + 1;
                }
                else
                {
                    if (y2 == 0)
                    {
                        if (!periodic) continue;
                        else y1 = FMY - 1;
                    }
                    else y1 = y2 - 1;
                }
                */

                var x1 = x2,
                    y1 = y2;

                if (d === 0) {
                    if (x2 === 0) {
                        if (!this.periodic) {
                            continue;
                        } else {
                            x1 = this.FMX - 1;
                        }
                    } else {
                        x1 = x2 - 1;
                    }
                } else if (d === 1) {
                    if (y2 === this.FMY - 1) {
                        if (!this.periodic) {
                            continue;
                        } else {
                            y1 = 0;
                        }
                    } else {
                        y1 = y2 + 1;
                    }
                } else if (d === 2) {
                    if (x2 === this.FMX - 1) {
                        if (!this.periodic) {
                            continue;
                        } else {
                            x1 = 0;
                        }
                    } else {
                        x1 = x2 + 1;
                    }
                } else {
                    if (y2 === 0) {
                        if (!this.periodic) {
                            continue;
                        } else {
                            y1 = this.FMY - 1;
                        }
                    } else {
                        y1 = y2 - 1;
                    }
                }

                /*
                if (!changes[x1][y1]) continue;

                bool[] w1 = wave[x1][y1];
                bool[] w2 = wave[x2][y2];
                */

                if (!this.changes[x1][y1]) {
                    continue;
                }

                var w1 = this.wave[x1][y1],
                    w2 = this.wave[x2][y2];

                /*
                for (int t2 = 0; t2 < T; t2++) if (w2[t2])
                {
                    bool[] prop = propagator[d][t2];
                    b = false;

                    for (int t1 = 0; t1 < T && !b; t1++) if (w1[t1]) b = prop[t1];
                    if (!b)
                    {
                        wave[x2][y2][t2] = false;
                        changes[x2][y2] = true;
                        change = true;
                    }
                }
                */

                for (var t2 = 0; t2 < this.T; t2++) {
                    if (w2[t2]) {
                        var prop = this.propagator[d][t2];
                        b = false;

                        for (var t1 = 0; t1 < this.T && !b; t1++) {
                            if (w1[t1]) {
                                b = prop[t1];
                            }
                        }

                        if (!b) {
                            this.wave[x2][y2][t2] = false;
                            this.changes[x2][y2] = true;
                            change = true;
                        }
                    }
                }

            }
        }
    }

    return change;
};

/**
 * @param {int} x
 * @param {int} y
 * @protected
 * @returns {boolean}
 */
SimpleTiledModel.prototype.onBoundary = function (x, y) {
    return false;
};

/**
 * Retrieve the RGBA data
 * @param {Uint8Array|Uint8ClampedArray} [array] Array to write the RGBA data into, if not set a new Uint8Array will be created and returned
 * @returns {Uint8Array|Uint8ClampedArray} RGBA data
 */
SimpleTiledModel.prototype.graphics = function (array) {
    /*
    Bitmap result = new Bitmap(FMX * tilesize, FMY * tilesize);
    int[] bitmapData = new int[result.Height * result.Width];
    */

    array = array || new Uint8Array(this.FMX * this.tilesize * this.FMY * this.tilesize * 4);

    for (var x = 0; x < this.FMX; x++) {
        for (var y = 0; y < this.FMY; y++) {
            /*
            bool[] a = wave[x][y];
            int amount = (from b in a where b select 1).Sum();
            double lambda = 1.0 / (from t in Enumerable.Range(0, T) where a[t] select stationary[t]).Sum();
            */

            var a = this.wave[x][y];
            var amount = 0;
            var sum = 0;

            for (var t = 0; t < a.length; t++) {
                if (a[t]) {
                    amount += 1;
                    sum += this.stationary[t];
                }
            }

            for (var yt = 0; yt < this.tilesize; yt++) {
                for (var xt = 0; xt < this.tilesize; xt++) {
                    /*
                    if (black && amount == T) bitmapData[x * tilesize + xt + (y * tilesize + yt) * FMX * tilesize] = unchecked((int)0xff000000);
                    else
                    {
                        double r = 0, g = 0, b = 0;
                        for (int t = 0; t < T; t++) if (wave[x][y][t])
                    {
                        Color c = tiles[t][xt + yt * tilesize];
                        r += (double)c.R * stationary[t] * lambda;
                        g += (double)c.G * stationary[t] * lambda;
                        b += (double)c.B * stationary[t] * lambda;
                    }

                        bitmapData[x * tilesize + xt + (y * tilesize + yt) * FMX * tilesize] =
                            unchecked((int)0xff000000 | ((int)r << 16) | ((int)g << 8) | (int)b);
                    }
                    */

                    if (this.black && amount === this.T) {
                        array[(x * this.tilesize + xt + (y * this.tilesize + yt) * this.FMX * this.tilesize) * 4] = 0;
                        array[(x * this.tilesize + xt + (y * this.tilesize + yt) * this.FMX * this.tilesize) * 4 + 1] = 0;
                        array[(x * this.tilesize + xt + (y * this.tilesize + yt) * this.FMX * this.tilesize) * 4 + 2] = 0;
                        array[(x * this.tilesize + xt + (y * this.tilesize + yt) * this.FMX * this.tilesize) * 4 + 3] = 255;
                    } else {
                        var r = 0, g = 0, b = 0, a = 0;

                        for (var t = 0; t < this.T; t++) {
                            if (this.wave[x][y][t]) {
                                var color = this.tiles[t][xt + yt * this.tilesize];
                                r += color[0] * this.stationary[t] / sum;
                                g += color[1] * this.stationary[t] / sum;
                                b += color[2] * this.stationary[t] / sum;
                                a += color[3] * this.stationary[t] / sum;
                            }
                        }

                        array[(x * this.tilesize + xt + (y * this.tilesize + yt) * this.FMX * this.tilesize) * 4] = r / sum;
                        array[(x * this.tilesize + xt + (y * this.tilesize + yt) * this.FMX * this.tilesize) * 4 + 1] = g / sum;
                        array[(x * this.tilesize + xt + (y * this.tilesize + yt) * this.FMX * this.tilesize) * 4 + 2] = b / sum;
                        array[(x * this.tilesize + xt + (y * this.tilesize + yt) * this.FMX * this.tilesize) * 4 + 3] = a / sum;
                    }
                }
            }

        }
    }

    return array;
};

module.exports = SimpleTiledModel;
