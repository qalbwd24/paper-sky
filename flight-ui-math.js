/* Display and touch helpers. Aircraft always render at their real shared scale. */
(function(root,factory){if(typeof module!=='undefined')module.exports=factory();else root.FlightUIMath=factory();})(globalThis,()=>{
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 function axis(v){const m=Math.abs(v);return m<=.06?0:Math.sign(v)*Math.pow(clamp((m-.06)/.94,0,1),1.25);}
 function visual(distance,fov,height,span){const pixels=Math.max(.01,span)*height/(2*Math.tan(fov*Math.PI/360)*Math.max(.5,distance));return {diameter:Math.max(36,pixels+16)};}
 function cue(p,local,width,height,radius=18){const front=local.z<0&&p.z<1,inside=front&&Math.abs(p.x)<.88&&Math.abs(p.y)<.80;let x=front?p.x:local.x,y=front?-p.y:-local.y;if(!front&&Math.hypot(x,y)<.001)y=1;
  if(!inside){const m=Math.max(.0001,Math.abs(x)/.88,Math.abs(y)/.80);x/=m;y/=m;}
  const margin=Math.min(radius+8,Math.min(width,height)/4);return {inside,x:inside?(x*.5+.5)*width:clamp((x*.5+.5)*width,margin,width-margin),y:inside?(y*.5+.5)*height:clamp((y*.5+.5)*height,margin,height-margin),angle:Math.atan2(y,x)};
 }
 function separate(layout,placed,width,height){if(layout.inside)return layout;let x=layout.x,y=layout.y;const vertical=x<width*.18||x>width*.82;for(const offset of [0,48,-48,96,-96,144,-144,192,-192]){const nx=vertical?x:clamp(layout.x+offset,45,width-45),ny=vertical?clamp(layout.y+offset,70,height-65):y;if(!placed.some(p=>Math.hypot(p.x-nx,p.y-ny)<44)){x=nx;y=ny;break;}}const result={...layout,x,y};placed.push(result);return result;}
 return {clamp,axis,visual,cue,separate};
});
