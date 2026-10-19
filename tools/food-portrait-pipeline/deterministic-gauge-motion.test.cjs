'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {gaugeMotion}=require('./deterministic-gauge-motion.cjs');

test('needle is exact at the owner 380 kcal reference state',()=>{
 const g=gaugeMotion(380);assert.ok(Math.abs(g.rotationDeltaDegrees)<1e-9);
 assert.equal(g.zone,'LIME');assert.deepEqual(g.pivotPx,[232,184]);
});
test('lower kcal moves left toward green and higher kcal moves right toward red',()=>{
 const values=[0,95,270,490,790,1000,1600].map(gaugeMotion);
 assert.ok(values.every((g,i)=>i===0||g.targetAngleDegrees>=values[i-1].targetAngleDegrees));
 assert.equal(values[0].zone,'GREEN');assert.equal(values.at(-1).zone,'RED');
 assert.ok(values[0].rotationDeltaDegrees<0&&values.at(-1).rotationDeltaDegrees>0);
 assert.equal(values.at(-1).targetAngleDegrees,60);
 assert.equal(values.at(-1).exactVisibleKcal,1600);
 assert.ok(Math.abs(gaugeMotion(95).rotationDeltaDegrees-(-19))<1e-9);
 assert.ok(Math.abs(gaugeMotion(975).rotationDeltaDegrees-116)<1e-9);
});
test('microanimation is single non-overshooting transition and respects reduced motion',()=>{
 const animated=gaugeMotion(520),reduced=gaugeMotion(520,{reducedMotion:true});
 assert.equal(animated.durationMs,220);assert.equal(animated.loop,false);
 assert.equal(animated.overshoot,false);assert.equal(reduced.durationMs,0);
});
