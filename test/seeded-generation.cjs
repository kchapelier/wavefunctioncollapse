'use strict';
const assert = require('node:assert/strict');
const OverlappingModel = require('../overlapping-model');
function rng(seed){let s=seed>>>0;return()=>((s=(Math.imul(s,1664525)+1013904223)>>>0)/4294967296);}
function pixels(rows){return Uint8Array.from(rows.flatMap(row=>[...row].flatMap(c=>c==='1'?[210,180,90,255]:[30,40,50,255])));}
const rows=['000000','001100','011110','011110','001100','000000'];
const input=pixels(rows);
function newModel(w=24,h=24,source=input,sx=6,sy=6,n=2){return new OverlappingModel(source,sx,sy,n,w,h,true,true,1,0);}
function key(data,w,h,x,y,n=2){const p=[];for(let dy=0;dy<n;dy++)for(let dx=0;dx<n;dx++)p.push(data[(((y+dy)%h)*w+(x+dx)%w)*4]);return p.join(',');}
const allowed=new Set();for(let y=0;y<6;y++)for(let x=0;x<6;x++)allowed.add(key(input,6,6,x,y));
const start=performance.now(), results=[], artifacts=[];
for(let seed=1;seed<=20;seed++){
 const m=newModel(), ok=m.iterate(577,rng(seed)),complete=m.isGenerationComplete();
 if(ok&&complete){const out=m.graphics();for(let y=0;y<24;y++)for(let x=0;x<24;x++)assert(allowed.has(key(out,24,24,x,y)),'foreign 2x2 pattern');artifacts.push([...out]);}
 results.push({seed,ok,complete,patterns:m.T});
}
assert.equal(results.filter(r=>r.ok&&r.complete).length,20,'expected 20 completed seeded runs');
assert.equal(new Set(artifacts.map(a=>JSON.stringify(a))).size,20,'expected 20 distinct completed outputs');
const a=newModel(),b=newModel();a.iterate(577,rng(123));b.iterate(577,rng(123));assert(a.isGenerationComplete()&&b.isGenerationComplete());assert.deepEqual(a.graphics(),b.graphics());
const check=pixels(['01','10']);const impossible=newModel(5,5,check,2,2,2);const failure=impossible.iterate(26,rng(1));assert.equal(failure,false);assert.equal(impossible.isGenerationComplete(),false);
const partial=newModel(24,24,check,2,2,1);const limitReturn=partial.iterate(1,rng(1));assert.equal(limitReturn,true);assert.equal(partial.isGenerationComplete(),false);
console.log(JSON.stringify({runtime:process.version,outputDimensions:[24,24],sourceDimensions:[6,6],N:2,symmetry:1,periodicInput:true,periodicOutput:true,allowedPatterns:allowed.size,runs:results,successful:results.filter(r=>r.complete).length,uniqueSuccessfulImages:new Set(artifacts.map(a=>JSON.stringify(a))).size,deterministicSameSeed:true,impossibleOddTorus:{return:failure,complete:false},oneIteration:{return:limitReturn,complete:false},elapsedMs:+(performance.now()-start).toFixed(2)},null,2));
