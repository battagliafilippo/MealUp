'use strict';
const {gaugeState}=require('./gauge-mapping.cjs');

const SOURCE=Object.freeze({kcal:380,angleDegrees:-14.4,pivotPx:Object.freeze([232,184])});
// The frozen logical scale is -60..60. The owner-provided 380 kcal gauge fixes
// the zero-rotation geometry; the outer anchors keep the same shaft shape while
// placing low values in green and high values in red.
const VISUAL_CALIBRATION=Object.freeze({
 sourceContractAngleDegrees:-14.4,
 greenAnchorContractAngleDegrees:-48.6,
 greenAnchorRotationDegrees:-19,
 redAnchorContractAngleDegrees:57,
 redAnchorRotationDegrees:116,
 lowRotationPerContractDegree:19/(-14.4-(-48.6)),
 highRotationPerContractDegree:116/(57-(-14.4))
});
const MOTION=Object.freeze({durationMs:220,easing:'cubic-bezier(0.2,0,0,1)',
 reducedMotionDurationMs:0,overshoot:false,loop:false});

function gaugeMotion(kcal,{reducedMotion=false}={}){
 const target=gaugeState(kcal);
 const contractDelta=target.angleDegrees-SOURCE.angleDegrees;
 const visualScale=contractDelta<0
  ?VISUAL_CALIBRATION.lowRotationPerContractDegree
  :VISUAL_CALIBRATION.highRotationPerContractDegree;
 return Object.freeze({
  kcal:target.kcal,
  clampedKcal:target.clampedKcal,
  zone:target.zone,
  sourceAngleDegrees:SOURCE.angleDegrees,
  targetAngleDegrees:target.angleDegrees,
  rotationDeltaDegrees:contractDelta*visualScale,
  pivotPx:[...SOURCE.pivotPx],
  durationMs:reducedMotion?MOTION.reducedMotionDurationMs:MOTION.durationMs,
  easing:MOTION.easing,
  overshoot:MOTION.overshoot,
  loop:MOTION.loop,
  exactVisibleKcal:target.kcal,
  saturatedHigh:target.saturatedHigh
 });
}

module.exports={SOURCE,VISUAL_CALIBRATION,MOTION,gaugeMotion};
