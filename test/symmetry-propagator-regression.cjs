'use strict';
const assert=require('node:assert/strict');
const Model=require(process.env.WFC_MODEL_PATH || '../overlapping-model');
const N=4,W=4,H=4;
const rgba=Uint8Array.from(Array.from({length:W*H},(_,i)=>[i,i*3,i*7,255]).flat());
const m=new Model(rgba,W,H,N,N,N,true,false,8,0);
// Independent coordinate transforms; count all periodic windows and dihedral variants.
const maps=[(x,y)=>[x,y],(x,y)=>[N-1-x,y],(x,y)=>[N-1-y,x],(x,y)=>[N-1-y,N-1-x],(x,y)=>[N-1-x,N-1-y],(x,y)=>[x,N-1-y],(x,y)=>[y,N-1-x],(x,y)=>[y,x]];
const expected=new Map();
for(let sy=0;sy<H;sy++)for(let sx=0;sx<W;sx++)for(const transform of maps){
 let p=[];for(let y=0;y<N;y++)for(let x=0;x<N;x++){const [tx,ty]=transform(x,y);p.push(((sy+ty)%H)*W+(sx+tx)%W);}
 const k=p.join(',');expected.set(k,(expected.get(k)||0)+1);
}
assert.equal(m.T,expected.size);assert.equal(m.weights.reduce((a,b)=>a+b,0),W*H*8);
for(let i=0;i<m.T;i++)assert.equal(m.weights[i],expected.get(m.patterns[i].join(',')),'pattern or weight mismatch');
for(let d=0;d<4;d++)for(let i=0;i<m.T;i++){
 let actual=new Set(m.propagator[d][i]);assert.equal(actual.size,m.propagator[d][i].length);
 for(let j=0;j<m.T;j++){
   const dx=m.DX[d],dy=m.DY[d];let ok=true;
   for(let y=0;y<N;y++)for(let x=0;x<N;x++)if(x-dx>=0&&x-dx<N&&y-dy>=0&&y-dy<N && m.patterns[i][y*N+x]!==m.patterns[j][(y-dy)*N+x-dx])ok=false;
   assert.equal(actual.has(j),ok,`adjacency ${d},${i},${j}`);
 }
}
console.log(JSON.stringify({patterns:m.T,weightSum:m.weights.reduce((a,b)=>a+b,0),symmetries:8,allFourAdjacencyDirections:true}));
