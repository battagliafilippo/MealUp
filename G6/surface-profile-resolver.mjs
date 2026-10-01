/** G6 pure contract adapter. No DOM, application logic, asset edits or remote I/O. */
const finite=(x,name)=>{if(!Number.isFinite(x)||x<0)throw Error('INVALID_MEASUREMENT:'+name);return x;};
export function motionPose(profile,{progress=1,distance=0,reducedMotion=false}={}) {
 if(reducedMotion||profile.motion.kind==='static')return {uniformScale:1,translateY:0,opacity:1,reveal:1,decorativeCover:false,interactive:profile.motion.kind!=='wheel'||distance===0};
 if(profile.motion.kind==='wheel') {
  if(!Number.isFinite(distance)||Math.abs(distance)>1)throw Error('INVALID_WHEEL_DISTANCE');
  const d=Math.abs(distance);return {uniformScale:1-.24*d,translateY:.045*distance,opacity:1-.65*d,reveal:1,decorativeCover:false,interactive:distance===0};
 }
 if(!Number.isFinite(progress)||progress<0||progress>1)throw Error('INVALID_PROGRESS');
 const e=progress*progress*(3-2*progress);
 return {uniformScale:.88+.12*e,translateY:.045*(1-e),opacity:e,reveal:e,decorativeCover:progress<1,interactive:progress===1};
}
export function compileSurface(contract,input) {
 const {surfaceId,recipe,template,vessel,gaugeState,hostWidth,fontEm,measurements={},motion={}}=input;
 const p=contract.profiles.find(p=>p.id===surfaceId);if(!p)throw Error('UNKNOWN_SURFACE');
 if(!measurements||!['header','title','metadata','controls'].every(k=>Object.hasOwn(measurements,k)))throw Error('MEASURED_UI_HEIGHTS_REQUIRED');
 if(motion.direction!==undefined&&![1,-1].includes(motion.direction))throw Error('INVALID_SWIPE_DIRECTION');
 if(!recipe?.recipe_id||!template||template.template_key!==recipe.template_key||template.status!=='G5_PASS_FROZEN')throw Error('UNKNOWN_TEMPLATE_OR_GEOMETRY');
 if(!gaugeState||gaugeState.recipe_id!==recipe.recipe_id)throw Error('GAUGE_STATE_MISSING_OR_DIFFERENT_RECIPE');
 if(recipe.layers.filter(l=>l.role==='primary').length!==1)throw Error('PRIMARY_MISSING_OR_AMBIGUOUS');
 if(recipe.resolved_vessel_id!==template.vessel_id)throw Error('VESSEL_TEMPLATE_MISMATCH');
 if(template.vessel_id!=='VESSEL_FREE'&&(!vessel||vessel.vessel_id!==template.vessel_id||vessel.status!=='G5_PASS_FROZEN'))throw Error('VESSEL_GEOMETRY_MISSING');
 for(const layer of recipe.layers) {
  const metric=input.metrics?.[layer.render_source_master_id];if(!metric)throw Error('UNKNOWN_MASTER');
  if(layer.sha256!==metric.sha256)throw Error('NONCANONICAL_SOURCE_HASH');
  const sourceKey=recipe.template_key+'|'+layer.role+'|'+layer.slot_index;
  if(p.projection==='full'&&!contract.validated_slot_sources[sourceKey]?.includes(layer.render_source_master_id))throw Error('UNVALIDATED_SLOT_FOOTPRINT_REQUIRES_G5_QA');
 }
 const W=finite(hostWidth,'width'),em=finite(fontEm,'font');if(!W||!em)throw Error('ZERO_HOST');
 const H=finite(measurements.header??0,'header'),T=finite(measurements.title??2*em,'title'),M=finite(measurements.metadata??1.5*em,'metadata'),C=finite(measurements.controls??0,'controls');
 const gap=p.gap_em*em;const pad=Math.min(gap,W*.04);const usable=W-2*pad;if(usable<3*em)throw Error('HOST_TOO_NARROW_FOR_MANDATORY_GAUGE');
 const desiredArt=Math.min(p.max_art_side_em*em,usable*p.art_width_fraction);
 const splitArt=Math.min(p.max_art_side_em*em,usable*p.split_art_fraction);
 const split=p.layout==='adaptive'&&usable-splitArt-gap>=p.min_text_column_em*em&&splitArt/em>=(p.min_split_art_side_em??0);
 const side=split?splitArt:desiredArt;const art=[split?pad:(W-side)/2,H+gap,side,side];
 const gaugeInline=p.projection==='full'&&side/em>=p.gauge_policy.inline_scene_min_side_em;
 const pose=motionPose(p,motion);const scale=p.scene_settled_uniform_scale*pose.uniformScale;
 const sceneOrigin=[art[0]+(1-scale)*side/2,art[1]+((1-scale)/2+pose.translateY)*side];
 const mapBox=b=>[sceneOrigin[0]+b[0]*side*scale,sceneOrigin[1]+b[1]*side*scale,sceneOrigin[0]+b[2]*side*scale,sceneOrigin[1]+b[3]*side*scale];
 const primary=recipe.layers.find(l=>l.role==='primary');let foods=[],vesselBox=null;
 if(p.projection==='primary') {
  const m=input.metrics[primary.render_source_master_id];if(!m)throw Error('UNKNOWN_MASTER');
  const ar=m.alpha_aspect_ratio;const fw=scale*Math.min(1,ar),fh=scale*Math.min(1,1/ar);const center=[art[0]+side/2,art[1]+side/2];
  foods=[{...primary,projected:true,box:[center[0]-side*fw/2,center[1]-side*fh/2,center[0]+side*fw/2,center[1]+side*fh/2],uniformSceneScale:scale}];
 }else {
  foods=recipe.layers.map(layer=>{const slot=template.slots.find(s=>s.role===layer.role&&s.slot_index===layer.slot_index);if(!slot)throw Error('ROLE_SLOT_MISSING');let b=slot.scene_bbox_envelope;
   if(!b){const m=input.metrics[layer.render_source_master_id];const ar=m.alpha_aspect_ratio;const fw=slot.scale*Math.min(1,ar),fh=slot.scale*Math.min(1,1/ar);b=[slot.anchorX-fw/2,slot.anchorY-fh/2,slot.anchorX+fw/2,slot.anchorY+fh/2];}
   return {...layer,box:mapBox(b),uniformSceneScale:scale};});
  if(vessel){const b=vessel.outer_bbox_norm;const tr=vessel.scene_transform;const w=tr.source_canvas_width_scene,h=tr.source_canvas_height_scene,o=tr.source_origin_scene;vesselBox=mapBox([o[0]+b[0]*w,o[1]+b[1]*h,o[0]+b[2]*w,o[1]+b[3]*h]);}
 }
 const textX=split?art[0]+side+gap:pad;const textW=split?W-pad-textX:usable;const textY=split?H+gap:art[1]+side+gap;
 const title=[textX,textY,textW,T];const metadata=[textX,textY+T+gap,textW,M];let gaugeBox;
 if(gaugeInline)gaugeBox=mapBox([.685,.065,.955,.335]);
 else {const gs=Math.min(3*em,textW);gaugeBox=[textX,metadata[1]+M+gap,textX+gs,metadata[1]+M+gap+gs];}
 const rowBottom=Math.max(art[1]+side,metadata[1]+M,gaugeBox[3]);const controls=[pad,rowBottom+gap,usable,C];const hostHeight=(C?controls[1]+C:rowBottom)+gap;
 const uiBoxes=[{id:'header_search_filters_history',rect:[pad,0,usable,H]},{id:'recipe_title_or_kitchen_step',rect:title},{id:'nutrition_metadata',rect:metadata},...(C?[{id:'critical_controls_timer_actions',rect:controls}]:[])];
 const normalizedRect=r=>[r[0]/W,r[1]/hostHeight,r[2]/W,r[3]/hostHeight];
 return {profileId:p.id,recipeId:recipe.recipe_id,bindingKey:recipe.recipe_id+'|'+recipe.template_key,projection:p.projection,layout:split?'split':'stack',host:{width:W,height:hostHeight},artRect:art,artRectNorm:normalizedRect(art),scene:{origin:sceneOrigin,uniformScale:side*scale,maskTransform:'SAME_AFFINE_AS_FOOD_AND_VESSEL',vesselBox},foodLayers:foods,gauge:{state:gaugeState,recipeId:recipe.recipe_id,box:gaugeBox,placement:gaugeInline?'G5_INLINE_RESERVATION':'SEPARATE_FLOW_DOCK',opacity:gaugeInline?pose.opacity:1,zIndex:800,independent:true},uiBoxes,uiBoxesNorm:uiBoxes.map(b=>({id:b.id,rect:normalizedRect(b.rect)})),motion:{...pose,decorativeCoverRect:pose.decorativeCover?[art[0],art[1]+side*pose.reveal,side,side*(1-pose.reveal)]:null,decorativeCoverZIndex:900},interaction:{pointerEventsOnArt:'none',interactive:pose.interactive,neighbourInert:p.motion.kind==='wheel'&&!pose.interactive,cardProgress:p.motion.kind==='book'?(motion.reducedMotion?1:motion.progress??1):null,cardTranslateX:p.motion.kind==='book'&&!motion.reducedMotion?(motion.direction===-1?-1:1)*(1-(motion.progress??1))*W:0},deferred:['G7 actual GaugeState validation and state animation','G8 renderer wiring','G9 actual DOM/font/hit-target/occlusion QA']};
}

export function compileWheelCollection(contract,{instances,viewportWidth,viewportHeight,fontEm,metrics,reducedMotion=false}) {
 if(!Array.isArray(instances)||instances.length!==3||new Set(instances.map(i=>i.recipe?.recipe_id)).size!==3)throw Error('WHEEL_REQUIRES_THREE_DISTINCT_RECIPES');
 if(!Number.isFinite(viewportHeight)||viewportHeight<=0)throw Error('INVALID_SAFE_VIEWPORT');
 const make=(instance,surfaceId,distance)=>compileSurface(contract,{...instance,surfaceId,hostWidth:viewportWidth,fontEm,metrics,motion:{distance,reducedMotion}});
 const full=instances.map((i,n)=>make(i,'RECIPE_WHEEL',n-1));const center=full[1],gap=.75*fontEm;
 if(reducedMotion||center.host.height+4*fontEm>viewportHeight) return {mode:'STANDARD_LIST',reason:reducedMotion?'REDUCED_MOTION':'CENTRAL_CARD_AND_PEEKS_DO_NOT_FIT',instances:instances.map(i=>make(i,'RECIPE_LIST',0)),registeredViewportClip:false};
 const centerY=(viewportHeight-center.host.height)/2,positions=[];
 positions[1]={index:1,x:0,y:centerY,scale:1,opacity:1,interactive:true,compiled:center};
 const upperH=full[0].host.height*.76,lowerH=full[2].host.height*.76;
 positions[0]={index:0,x:viewportWidth*.12,y:centerY-gap-upperH,scale:.76,opacity:.35,interactive:false,inert:true,compiled:full[0]};
 positions[2]={index:2,x:viewportWidth*.12,y:centerY+center.host.height+gap,scale:.76,opacity:.35,interactive:false,inert:true,compiled:full[2]};
 if(positions[0].y+upperH<=0||positions[2].y>=viewportHeight)return {mode:'STANDARD_LIST',reason:'NEIGHBOUR_PEEKS_DO_NOT_FIT',instances:instances.map(i=>make(i,'RECIPE_LIST',0)),registeredViewportClip:false};
 return {mode:'WHEEL_THREE',safeViewport:{width:viewportWidth,height:viewportHeight},instances:positions,registeredViewportClip:true,centralCardFullyVisible:true};
}
