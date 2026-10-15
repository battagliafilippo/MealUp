'use strict';

const SCALE=Object.freeze({minKcal:0,maxKcal:1000,minAngle:-60,maxAngle:60});
const assert=(condition,message)=>{if(!condition)throw Error(message)};

function gaugeState(kcal){
 assert(Number.isFinite(kcal)&&kcal>=0,'KCAL_MUST_BE_NONNEGATIVE_NUMBER');
 const clamped=Math.min(SCALE.maxKcal,Math.max(SCALE.minKcal,kcal));
 const ratio=(clamped-SCALE.minKcal)/(SCALE.maxKcal-SCALE.minKcal);
 const angle=SCALE.minAngle+ratio*(SCALE.maxAngle-SCALE.minAngle);
 const zone=ratio<0.2?'GREEN':ratio<0.4?'LIME':ratio<0.6?'YELLOW':
  ratio<0.8?'ORANGE':'RED';
 return {kcal,clampedKcal:clamped,ratio,angleDegrees:angle,zone,
  saturatedHigh:kcal>SCALE.maxKcal};
}

function selfTest(){
 const zero=gaugeState(0),r2=gaugeState(490),high=gaugeState(1000),overflow=gaugeState(3900);
 assert(zero.angleDegrees===-60&&zero.zone==='GREEN','ZERO_GREEN');
 assert(Math.abs(r2.angleDegrees-(-1.2))<1e-9&&r2.zone==='YELLOW','R2_CARD_MAPPING');
 assert(high.angleDegrees===60&&high.zone==='RED','MAX_RED');
 assert(overflow.angleDegrees===60&&overflow.kcal===3900&&overflow.saturatedHigh,'OVERFLOW_RED_EXACT_NUMBER');
 const ordered=[0,170,315,480,645,820,995,3900].map(gaugeState);
 assert(ordered.every((v,i)=>i===0||v.angleDegrees>=ordered[i-1].angleDegrees),'MONOTONIC_NEEDLE');
 let rejected=false;try{gaugeState(-1)}catch(e){rejected=/KCAL_MUST/.test(e.message)}
 assert(rejected,'NEGATIVE_REJECTED');
 console.log('PASS frozen gauge mapping: monotonic green-to-red, exact kcal, high clamp');
}

if(require.main===module){try{selfTest()}catch(e){console.error('FAIL gauge mapping:',e.stack||e);process.exitCode=1;}}
module.exports={SCALE,gaugeState,selfTest};
