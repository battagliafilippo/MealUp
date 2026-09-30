import '../G5/assets/food-objects/resolver.js';
import {compileSurface} from '../G6/surface-profile-resolver.mjs';
import {validateGaugeState} from '../G7_Completed/gauge-state.mjs';
import {compileGauge,drawGauge} from '../G7_Completed/gauge-renderer.mjs';
const stop=code=>{throw Error(code);};
export function createSceneCompiler(kit){
 const resolver=globalThis.MealUpFoodObjectResolver.create({catalog:kit.catalog,mappings:kit.mappings,matrix:kit.matrix,aliases:kit.aliases});
 if(!resolver.validate().ok)stop('S2_RESOLVER_INVALID');
 const recipes=new Map(kit.recipes.recipes.map(r=>[r.recipe_id,r])),templates=new Map(kit.templates.templates.map(t=>[t.template_key,t])),vessels=new Map(kit.vessels.vessels.map(v=>[v.vessel_id,v]));
 const metrics=Object.fromEntries(kit.metrics.assets.map(a=>[a.master_id,a]));
 return Object.freeze({
  compile(input){
   const recipe=recipes.get(input.recipe_id);if(!recipe)stop('S3_RECIPE_COMPOSITION_MISSING');const logical=resolver.resolveRecipe(input.recipe_id);if(!logical.ok)stop('S2_MASTER_NOT_RESOLVED');const correction=kit.geometry.recipe_corrections?.[input.recipe_id];let resolvedVessel=logical.vessel_id;if(correction){if(correction.field!=='vessel_id'||correction.from!==logical.vessel_id)stop('S3_INVALID_FROZEN_CORRECTION');resolvedVessel=correction.to;}if(logical.composition_id!==recipe.composition_id||resolvedVessel!==recipe.resolved_vessel_id)stop('S3_COMPOSITION_PARITY_MISMATCH');
   for(const layer of recipe.layers){const row=logical.logical_layers.find(x=>x.role===layer.role&&x.slot_index===layer.matrix_slot_index);if(!row||row.master_id!==layer.logical_master_id)stop('S3_LOGICAL_RENDER_LAYER_MISMATCH');if(!layer.transform?.uniform_scale||layer.transform.mirror||layer.transform.crop||layer.transform.filter||layer.rotation_deg!==0)stop('S6_NONCANONICAL_FOOD_TRANSFORM');}
   const state=validateGaugeState(input.gaugeState,{recipe_id:input.recipe_id,context_id:input.context_id,revision:input.revision});
   const vessel=vessels.get(recipe.resolved_vessel_id),template=templates.get(recipe.template_key);
   const surface=compileSurface(kit.surface,{...input,recipe,template,vessel,gaugeState:state,metrics,surfaceId:input.surfaceId});
   const gauge=compileGauge(kit.gauge,{state,binding:state,box:surface.gauge.box,fontEm:input.fontEm,metadataRect:surface.uiBoxes.find(u=>u.id==='nutrition_metadata').rect,measureText:input.measureText});
   if(vessel&&(!vessel.outer_boundary_norm?.length||!vessel.food_clip_mask_or_equivalent_geometry?.sha256||!vessel.front_occluder_mask_or_equivalent_geometry?.sha256))stop('S6_VESSEL_MASKS_UNDEFINED');
   return {recipe_id:input.recipe_id,context_id:input.context_id,revision:input.revision,surface,gauge,vessel:surface.projection==='full'?vessel:null,metrics,logical,source_board:{path:'references/VESSEL_LIBRARY_reference.png',sha256:kit.vessel_board_sha256},canonical_food_layers:surface.foodLayers,required_state:state};
  }
 });
}
export function requiredAssets(plan){
 const req=plan.canonical_food_layers.map(l=>({key:l.asset_file,path:'../'+l.asset_file,sha256:l.sha256}));
 if(plan.vessel){req.push({key:'vessel-board',path:'../G5/'+plan.source_board.path,sha256:plan.source_board.sha256});for(const role of ['food_clip_mask_or_equivalent_geometry','front_occluder_mask_or_equivalent_geometry']){const a=plan.vessel[role];req.push({key:a.file,path:'../G5/'+a.file,sha256:a.sha256,mask:true});}}
 for(const role of ['shell','needle']){const a=plan.gauge.assets[role];req.push({key:'gauge-'+role,path:'../G7_Completed/'+a.path,sha256:a.sha256});}
 return [...new Map(req.map(a=>[a.key,a])).values()];
}
function verified(assets,key,sha){const value=assets[key];if(!value||value.sha256!==sha||!value.image)stop('S1_CANONICAL_ASSET_MISSING_OR_MISMATCH');return value;}
function pathPolygon(ctx,points,x,y,w,h){ctx.beginPath();points.forEach(([px,py],i)=>{if(i)ctx.lineTo(x+px*w,y+py*h);else ctx.moveTo(x+px*w,y+py*h);});ctx.closePath();}
export function renderRecipeScene(ctx,plan,assets,{createCanvas,fontFamily='Satoshi'}={}){
 if(typeof createCanvas!=='function')stop('S6_CANVAS_FACTORY_REQUIRED');const s=plan.surface,{width:W,height:H}=s.host;
 const art=createCanvas(Math.ceil(W),Math.ceil(H)),a=art.getContext('2d');a.save();a.beginPath();a.rect(...s.artRect);a.clip();a.globalAlpha=1;
 let vesselDst;
 if(plan.vessel){const v=plan.vessel,tr=v.scene_transform,scale=s.scene.uniformScale;vesselDst=[s.scene.origin[0]+tr.source_origin_scene[0]*scale,s.scene.origin[1]+tr.source_origin_scene[1]*scale,tr.source_canvas_width_scene*scale,tr.source_canvas_height_scene*scale];const board=verified(assets,'vessel-board',plan.source_board.sha256).image;
  const [sx,sy,ex,ey]=v.source_rect_norm,src=[sx*board.width,sy*board.height,(ex-sx)*board.width,(ey-sy)*board.height];
  a.save();pathPolygon(a,v.outer_boundary_norm,...vesselDst);a.clip();a.drawImage(board,...src,...vesselDst);a.restore();
 }
 const food=createCanvas(Math.ceil(W),Math.ceil(H)),f=food.getContext('2d');
 for(const layer of [...plan.canonical_food_layers].sort((a,b)=>a.z_index-b.z_index)){
  const image=verified(assets,layer.asset_file,layer.sha256).image;
  if(image.width!==512||image.height!==512)stop('S1_NONCANONICAL_FOOD_DIMENSIONS');
  if(s.projection==='primary'){const bb=plan.metrics[layer.render_source_master_id].alpha_bbox_px,b=layer.box,scale=Math.min((b[2]-b[0])/(bb[2]-bb[0]),(b[3]-b[1])/(bb[3]-bb[1])),x=(b[0]+b[2])/2-(bb[0]+bb[2])*scale/2,y=(b[1]+b[3])/2-(bb[1]+bb[3])*scale/2;f.drawImage(image,x,y,512*scale,512*scale);}
  else {const t=layer.transform,size=t.raw_image_side_scene*s.scene.uniformScale,x=s.scene.origin[0]+t.raw_image_center_scene[0]*s.scene.uniformScale-size/2,y=s.scene.origin[1]+t.raw_image_center_scene[1]*s.scene.uniformScale-size/2;f.drawImage(image,x,y,size,size);}
 }
 if(plan.vessel&&s.projection==='full'){const mask=plan.vessel.food_clip_mask_or_equivalent_geometry;const alpha=verified(assets,mask.file,mask.sha256).alphaMask;if(!alpha)stop('S6_LUMINANCE_MASK_ALPHA_ADAPTER_REQUIRED');f.globalCompositeOperation='destination-in';f.drawImage(alpha,...vesselDst);f.globalCompositeOperation='source-over';}
 a.drawImage(food,0,0);
 if(plan.vessel&&s.projection==='full'){const v=plan.vessel,mask=v.front_occluder_mask_or_equivalent_geometry,alpha=verified(assets,mask.file,mask.sha256).alphaMask;if(!alpha)stop('S6_FRONT_OCCLUDER_MISSING');const front=createCanvas(Math.ceil(W),Math.ceil(H)),fc=front.getContext('2d'),board=verified(assets,'vessel-board',plan.source_board.sha256).image,[sx,sy,ex,ey]=v.source_rect_norm;fc.save();pathPolygon(fc,v.outer_boundary_norm,...vesselDst);fc.clip();fc.drawImage(board,sx*board.width,sy*board.height,(ex-sx)*board.width,(ey-sy)*board.height,...vesselDst);fc.restore();fc.globalCompositeOperation='destination-in';fc.drawImage(alpha,...vesselDst);a.drawImage(front,0,0);}
 a.restore();ctx.save();ctx.globalAlpha=s.motion.opacity;ctx.drawImage(art,0,0);ctx.restore();
 // Gauge independently follows registered inline/flow opacity; it is never baked into food.
 ctx.save();ctx.globalAlpha=s.gauge.opacity;drawGauge(ctx,plan.gauge,{shell:verified(assets,'gauge-shell',plan.gauge.assets.shell.sha256),needle:verified(assets,'gauge-needle',plan.gauge.assets.needle.sha256)},fontFamily);ctx.restore();
 if(s.motion.decorativeCoverRect){ctx.save();ctx.fillStyle='#fff8e9';ctx.fillRect(...s.motion.decorativeCoverRect);ctx.restore();}
 return {gaugeValue:plan.gauge.value,accessibleText:plan.gauge.accessible_text,interaction:s.interaction,host:s.host};
}
export function luminanceMaskToAlpha(image,{createCanvas}){const mask=createCanvas(image.width,image.height),ctx=mask.getContext('2d');ctx.drawImage(image,0,0);const pixels=ctx.getImageData(0,0,image.width,image.height);for(let i=0;i<pixels.data.length;i+=4){pixels.data[i+3]=pixels.data[i];pixels.data[i]=255;pixels.data[i+1]=255;pixels.data[i+2]=255;}ctx.putImageData(pixels,0,0);return mask;}
