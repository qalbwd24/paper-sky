/* Local PaperSky mesh + original relative blend shapes. Local nose is -Z. */
function createPaperSkyPlane(renderer,color=null){
 const T=THREE,D=PaperSkyPlaneData;
 if(!D.geometry){
  const bytes=Uint8Array.from(atob(D.binary),c=>c.charCodeAt(0)),g=new T.BufferGeometry();
  const floats=key=>new Float32Array(bytes.buffer,...D.layout[key]).slice();
  const positions=floats('position');let minX=Infinity,maxX=-Infinity;
  for(let i=0;i<positions.length;i+=3){minX=Math.min(minX,positions[i]);maxX=Math.max(maxX,positions[i]);}
  // Match the existing .18 m wingspan before the game's scene-specific parent scale.
  const scale=.18/(maxX-minX),vectors=(a,factor)=>{for(let i=0;i<a.length;i+=3){a[i]*=factor;a[i+1]*=factor;a[i+2]*=-factor;}return a;};
  g.setAttribute('position',new T.BufferAttribute(vectors(positions,scale),3));g.setAttribute('normal',new T.BufferAttribute(vectors(floats('normal'),1),3));g.setAttribute('uv',new T.BufferAttribute(floats('uv'),2));
  const indices=new Uint32Array(bytes.buffer,...D.layout.indices).slice();for(let i=0;i<indices.length;i+=3)[indices[i+1],indices[i+2]]=[indices[i+2],indices[i+1]];g.setIndex(new T.BufferAttribute(indices,1));
  g.morphTargetsRelative=true;g.morphAttributes.position=[];g.morphAttributes.normal=[];
  // Strengthen only the left/right wing deformation, including its normal deltas.
  const turnMorphGain=2;
  D.morphNames.forEach((name,i)=>{const gain=i===4||i===5?turnMorphGain:1;for(const key of ['position','normal']){const a=new T.BufferAttribute(vectors(floats(key+i),(key==='position'?scale:1)*gain),3);a.name=name;g.morphAttributes[key].push(a);}});
  const colors=new Float32Array(positions.length),normal=g.attributes.normal;
  for(let i=0;i<normal.count;i++){const shade=normal.getY(i)<-.5?'#747a87':positions[i*3]>0?'#fffdf0':'#ccd1d9';new T.Color(shade).toArray(colors,i*3);}g.setAttribute('color',new T.BufferAttribute(colors,3));
  // Neutral bounds are used for sizing and stable contact probes, not inflated morph bounds.
  const box=new T.Box3().setFromBufferAttribute(g.attributes.position),size=box.getSize(new T.Vector3());D.dimensions={length:size.z*.7,wingspan:size.x*.7};
  const p=g.attributes.position,extreme=(axis,sign)=>{let best=0;for(let i=1;i<p.count;i++)if(p.array[i*3+axis]*sign>p.array[best*3+axis]*sign)best=i;return best;};
  D.probeIndices=[extreme(2,-1),extreme(0,-1),extreme(0,1),extreme(1,-1),extreme(2,1)];
  g.computeBoundingBox();g.computeBoundingSphere();D.geometry=g;
 }
 const group=new T.Group(),material=new T.MeshStandardMaterial({color:color||'#ffffff',vertexColors:true,roughness:.92,metalness:0,side:T.DoubleSide,emissive:color||'#ffffff',emissiveIntensity:color?.12:.015}),mesh=new T.Mesh(D.geometry,material);mesh.castShadow=true;group.add(mesh);
 const probes=D.probeIndices.map(i=>new T.Vector3().fromBufferAttribute(mesh.geometry.attributes.position,i)),tips=[probes[1].clone(),probes[2].clone()],pose={climb:0,dive:0,bank:0,boost:0,slow:0,flutter:0},weights=mesh.morphTargetInfluences;let time=0;
 const clamp=T.MathUtils.clamp;
 function syncTips(){mesh.getVertexPosition(D.probeIndices[1],tips[0]);mesh.getVertexPosition(D.probeIndices[2],tips[1]);}
 function reset(){time=0;weights.fill(0);for(const k in pose)pose[k]=0;syncTips();}
 function update(dt,{pitch=0,bank=0,boost=0,slow=false,impact=0,active=false}={}){
  if(dt<=0)return;time+=dt;const turn=clamp(bank/.87,-1,1),up=clamp(pitch/.44,0,1),down=clamp((-pitch-.12)/.6,0,1),b=clamp(Number(boost)||0,0,1),f=1-Math.exp(-8*dt);
  const target=active?[clamp(impact,0,1),clamp(down*.5+b*.6,0,1),clamp(up*.5+(slow?.6:0),0,1),0,Math.max(0,turn),Math.max(0,-turn),up*.65,down*.65,(b>.1?.12:.06)*(1+Math.sin(time*(b>.1?19:11)))*.5]:Array(9).fill(0);
  for(let i=0;i<weights.length;i++)weights[i]+=(target[i]-weights[i])*f;
  Object.assign(pose,{climb:weights[6],dive:weights[7],bank:weights[4]-weights[5],boost:weights[1],slow:weights[2],flutter:weights[8]});syncTips();
 }
 reset();return {group,mesh,dimensions:{...D.dimensions},probes,tips,pose,update,reset,source:'PaperSky',morphNames:D.morphNames};
}
