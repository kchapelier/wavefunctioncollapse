'use strict';
// Synthetic correctness test for WFC's pattern-key round trip. The model path
// must refer to either the pinned original or an experimental adaptation.
const assert = require('node:assert/strict');
const Model = require(process.env.WFC_MODEL_PATH || '../overlapping-model');
function make(n, extra=0) {
  const width=n+extra, height=n;
  const colors=Array.from({length:width*height},(_,i)=>[i,i*3 % 256,i*7 % 256,255]);
  const pixels=Uint8Array.from(colors.flat());
  const m=new Model(pixels,width,height,n,n,n,false,false,1,0);
  const expected=[];
  for(let x=0;x<=extra;x++) {
    const pat=[];
    for(let y=0;y<n;y++) for(let dx=0;dx<n;dx++) pat.push(y*width+x+dx);
    expected.push(pat);
  }
  assert.deepEqual(m.patterns,expected,`N=${n} distinct patterns must preserve every pixel`);
  assert.deepEqual(m.weights,Array(expected.length).fill(1),'unique windows must stay distinct');
  return m;
}
for(const n of [2,3,4,5]) make(n);
make(4,1);
const flat=Uint8Array.from(Array.from({length:25},()=>[50,60,70,255]).flat());
const duplicate=new Model(flat,5,5,4,4,4,false,false,1,0);
assert.equal(duplicate.T,1);assert.deepEqual(duplicate.patterns[0],Array(16).fill(0));assert.deepEqual(duplicate.weights,[4]);
console.log('PASS: 2/3/4/5-color-grid round trips, distinct 4x4 windows, duplicate weight');
