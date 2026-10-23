/* Local PaperPlane resource conversion. Uses Three.js skinning and AnimationMixer. */
function createOriginalPlane(renderer,color=null){
 const data=OriginalPlaneData,group=new THREE.Group(),rig=new THREE.Group(),nodes=new Map(),paths=new Map();group.add(rig);
 const reflect=new THREE.Matrix4().makeScale(1,1,-1),convertMatrix=o=>new THREE.Matrix4().set(...Array.from({length:16},(_,i)=>o['e'+Math.floor(i/4)+(i%4)])).premultiply(reflect).multiply(reflect);
 for(const n of data.nodes){const bone=new THREE.Bone();bone.name='pp_'+n.id;bone.position.set(n.position[0],n.position[1],-n.position[2]);bone.quaternion.set(-n.rotation[0],-n.rotation[1],n.rotation[2],n.rotation[3]);bone.scale.fromArray(n.scale);nodes.set(n.id,bone);paths.set(n.path.replace(/^Plane\//,''),bone);}
 for(const n of data.nodes)(n.parent?nodes.get(n.parent):rig).add(nodes.get(n.id));
 const geometry=new THREE.BufferGeometry(),flat=a=>a.flat();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(flat(data.positions.map(p=>[p[0],p[1],-p[2]])),3));
 geometry.setAttribute('normal',new THREE.Float32BufferAttribute(flat(data.normals.map(p=>[p[0],p[1],-p[2]])),3));
 geometry.setAttribute('uv',new THREE.Float32BufferAttribute(flat(data.uv),2));
 geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(flat(data.skinIndices),4));geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute(flat(data.skinWeights),4));
 const indices=[];for(let i=0;i<data.indices.length;i+=3)indices.push(data.indices[i],data.indices[i+2],data.indices[i+1]);geometry.setIndex(indices);
 const loader=new THREE.TextureLoader(),texture=loader.load('assets/paperplane-original/_MainTex.png');texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
 const material=new THREE.MeshStandardMaterial({map:texture,color:color||'#ffffff',roughness:.94,metalness:0,side:THREE.DoubleSide,emissive:color||'#ffffff',emissiveIntensity:color?.12:0});
 const mesh=new THREE.SkinnedMesh(geometry,material);nodes.get(data.renderer).add(mesh);mesh.castShadow=true;mesh.frustumCulled=false;
 group.updateMatrixWorld(true);const bind=mesh.matrixWorld.clone(),inverseBind=bind.clone().invert();
 const skeleton=new THREE.Skeleton(data.bones.map(id=>nodes.get(id)),data.bindPoses.map(p=>convertMatrix(p).multiply(inverseBind)));mesh.bind(skeleton,bind);mesh.normalizeSkinWeights();
 // Keep original proportions, centering and orienting its nose along flight -Z.
 skeleton.update();const bounds=new THREE.Box3(),point=new THREE.Vector3();
 for(let i=0;i<data.positions.length;i++){mesh.getVertexPosition(i,point);bounds.expandByPoint(point.applyMatrix4(mesh.matrixWorld));}
 const size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3()),factor=.265/size.z;
 rig.scale.setScalar(factor);rig.position.copy(center).multiplyScalar(-factor);group.updateMatrixWorld(true);
 const mixer=new THREE.AnimationMixer(rig),clips=[];
 function sample(keys,time,axes){let a=keys[0],b=keys.at(-1);if(time<=a.time)return axes.map(k=>a.value[k]);if(time>=b.time)return axes.map(k=>b.value[k]);for(let i=1;i<keys.length;i++)if(keys[i].time>=time){a=keys[i-1];b=keys[i];break;}const span=b.time-a.time,t=(time-a.time)/span,t2=t*t,t3=t2*t;return axes.map(k=>(2*t3-3*t2+1)*a.value[k]+(t3-2*t2+t)*span*a.outSlope[k]+(-2*t3+3*t2)*b.value[k]+(t3-t2)*span*b.inSlope[k]);}
 for(const src of data.clips){const tracks=[],curves=[...src.m_RotationCurves,...src.m_PositionCurves,...src.m_ScaleCurves],duration=Math.max(...curves.flatMap(c=>c.curve.m_Curve.map(k=>k.time)));
  for(const [list,prop,axes,Type] of [[src.m_RotationCurves,'quaternion','xyzw',THREE.QuaternionKeyframeTrack],[src.m_PositionCurves,'position','xyz',THREE.VectorKeyframeTrack],[src.m_ScaleCurves,'scale','xyz',THREE.VectorKeyframeTrack]])for(const c of list){const node=paths.get(c.path);if(!node)throw Error('Missing aircraft bone '+c.path);const steps=Math.max(1,Math.ceil(duration*60)),times=[],values=[];for(let i=0;i<=steps;i++){const t=i/steps*duration,v=sample(c.curve.m_Curve,t,[...axes]);if(prop==='quaternion'){v[0]*=-1;v[1]*=-1;const q=new THREE.Quaternion(...v).normalize();q.toArray(values,values.length);}else{if(prop==='position')v[2]*=-1;values.push(...v);}times.push(t);}tracks.push(new Type(node.name+'.'+prop,times,values));}
  clips.push(new THREE.AnimationClip(src.m_Name,duration,tracks));
 }
 const idle=mixer.clipAction(clips[0]).play(),corner=mixer.clipAction(clips[1]).play();corner.setEffectiveWeight(0);
 const left=paths.get('Dummy_centre_Avion/Dummy_Aile_Left'),right=paths.get('Dummy_centre_Avion/Dummy_Aile_Right'),leftBase=left.quaternion.clone(),rightBase=right.quaternion.clone(),axis=new THREE.Vector3(0,1,0);
 const pose={left:0,right:0,corner:0},dimensions={length:.1855,wingspan:size.x*factor*.7};
 const probes=[new THREE.Vector3(),new THREE.Vector3(),new THREE.Vector3(),new THREE.Vector3(),new THREE.Vector3()],tips=[new THREE.Vector3(),new THREE.Vector3()];
 // Sample reference geometry once for stable collision bounds; actual tips follow bones for wakes.
 const vertices=[];skeleton.update();for(let i=0;i<data.positions.length;i++){mesh.getVertexPosition(i,point);vertices.push(point.clone().applyMatrix4(mesh.matrixWorld));}
 probes[0].copy(vertices.reduce((a,b)=>a.z<b.z?a:b));probes[1].copy(vertices.reduce((a,b)=>a.x<b.x?a:b));probes[2].copy(vertices.reduce((a,b)=>a.x>b.x?a:b));probes[3].copy(vertices.reduce((a,b)=>a.y<b.y?a:b));probes[4].copy(vertices.reduce((a,b)=>a.z>b.z?a:b));
 function syncTips(){group.updateMatrixWorld(true);const inv=group.matrixWorld.clone().invert();for(const [i,name] of ['LeftTrail_dummy','RightTrail_dummy'].entries()){const n=data.nodes.find(n=>n.name===name);tips[i].setFromMatrixPosition(nodes.get(n.id).matrixWorld).applyMatrix4(inv);}}
 function update(dt,{pitch=0,bank=0,active=false}={}){if(dt<=0)return;const f=1-Math.exp(-6.32*dt),roll=THREE.MathUtils.clamp(bank/.48,-1,1),lift=Math.sin(pitch),limit=20*Math.PI/180;
  pose.left+=((active?THREE.MathUtils.clamp(-lift-roll,-1,1)*limit:0)-pose.left)*f;pose.right+=((active?THREE.MathUtils.clamp(-lift+roll,-1,1)*limit:0)-pose.right)*f;
  pose.corner+=((active?Math.min(1,Math.abs(roll)*.8+Math.max(0,-pitch-.2)):0)-pose.corner)*f;idle.setEffectiveWeight(1-pose.corner);corner.setEffectiveWeight(pose.corner);mixer.update(dt);
  left.quaternion.copy(leftBase).multiply(new THREE.Quaternion().setFromAxisAngle(axis,pose.left));right.quaternion.copy(rightBase).multiply(new THREE.Quaternion().setFromAxisAngle(axis,-pose.right));syncTips();
 }
 function reset(){pose.left=pose.right=pose.corner=0;idle.setEffectiveWeight(1);corner.setEffectiveWeight(0);mixer.setTime(0);left.quaternion.copy(leftBase);right.quaternion.copy(rightBase);syncTips();}
 reset();return {group,mesh,dimensions,probes,tips,pose,update,reset,mixer,clips,skeleton,sourceBounds:bounds};
}
