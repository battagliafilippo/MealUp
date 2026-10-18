'use strict';
const {gaugeState}=require('./gauge-mapping.cjs');

const SOURCE=Object.freeze({kcal:270,angleDegrees:-27.6,pivotPx:Object.freeze([248,232])});
// The frozen logical scale is -60..60. The photographed physical arc has a
// wider sweep: a07 (-27.6) is the zero-rotation source and approved d32 (57)
// supplies the red-end calibration. The extracted shaft needs 121 degrees of
// clockwise CSS rotation to land visibly inside the red segment.
const VISUAL_CALIBRATION=Object.freeze({
 sourceContractAngleDegrees:-27.6,
 greenAnchorContractAngleDegrees:-48.6,
 greenAnchorRotationDegrees:-14,
 redAnchorContractAngleDegrees:57,
 redAnchorRotationDegrees:121,
 lowRotationPerContractDegree:14/(-27.6-(-48.6)),
 highRotationPerContractDegree:121/(57-(-27.6))
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
