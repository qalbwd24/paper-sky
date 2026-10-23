/* Swept soft contacts shared by the player and AI. No camera or heading impulses. */
class FlightContact {
 constructor(){this.reset();}
 reset(){this.velocity=new THREE.Vector3();this.normals=[];this.recovery=0;this.hits=0;this.last=null;this.cooldown=0;}
 // Sweep actual nose/wing/body samples, including the arc from attitude changes.
 trace(a,b,radius,raycast,ground,offsets0,offsets1,padding=0,sweepHull){
  const points=offsets0||FlightContact.offsets.map(p=>p.clone().multiplyScalar(radius));
  let best=sweepHull?.(a,b,points,offsets1||points,padding)||null;
  if(sweepHull?.raycast)raycast=sweepHull.raycast;
  for(let k=0;k<points.length;k++){
   const start=a.clone().add(points[k]),end=b.clone().add(offsets1?.[k]||points[k]);
   const delta=end.clone().sub(start),length=delta.length();if(length<1e-9)continue;
   const direction=delta.clone().divideScalar(length),h=raycast(start,direction,length+padding);
   if(h){const fraction=Math.max(0,((h.distance??h.fraction*(length+padding))-padding)/length);if(fraction<=1&&(!best||fraction<best.fraction))best={...h,fraction,surface:start.clone().addScaledVector(direction,h.distance??h.fraction*(length+padding))};}
   const steps=Math.max(1,Math.ceil(length/Math.max(.04,radius*.4)));
   for(let i=0;i<=steps;i++){
    const t=i/steps,p=start.clone().lerp(end,t),height=ground(p.x,p.z,p.y)+padding;
    if(p.y<height){
     // Bisect the first ground crossing, including steep terrain changes.
     let lo=Math.max(0,(i-1)/steps),hi=t;
     for(let j=0;j<9;j++){const mid=(lo+hi)/2,q=start.clone().lerp(end,mid);if(q.y<ground(q.x,q.z,q.y)+padding)hi=mid;else lo=mid;}
     if(!best||hi<best.fraction){const surface=start.clone().lerp(end,hi);surface.y=ground(surface.x,surface.z,surface.y);best={fraction:hi,normal:new THREE.Vector3(0,1,0),kind:'地面',depth:i===0?height-p.y:0,surface};}break;
    }
   }
  }
  return best;
 }
 move(old,s,dt,{radius,raycast,ground,points,padding=0,sweepHull,tangentRetention=.78,wallBounce=.09,groundBounce=.12}){
  const origin=new THREE.Vector3(old.x,old.y,old.z),desired=new THREE.Vector3(s.x,s.y,s.z).sub(origin).divideScalar(dt);
  const quaternion=p=>new THREE.Quaternion().setFromEuler(new THREE.Euler(p.pitch||0,p.yaw||0,p.bank||0,'YXZ'));
  const q0=quaternion(old),q1=quaternion(s);let offsets0=points?.map(p=>p.clone().applyQuaternion(q0)),offsets1=points?.map(p=>p.clone().applyQuaternion(q1));
  const support=n=>points?Math.max(0,...offsets1.map(p=>-p.dot(n)))+padding:radius;
  const skin=Math.max(.001,points?padding*.3:radius*.025);this.cooldown=Math.max(0,this.cooldown-dt);
  this.normals=this.normals.filter(c=>{
   if(desired.dot(c.n)>.05)return false;
   // Remember the contacted plane across the rebound. Do not let thrust drive a
   // stationary nose back into the wall every few frames. Leaving its footprint
   // or steering outward releases the constraint immediately.
   const reach=Math.max(support(c.n)+skin*5,origin.clone().sub(c.point).dot(c.n)+skin*5);
   if(reach>c.reach)return false;
   const near=raycast(origin,c.n.clone().negate(),reach);
   return near&&near.normal.dot(c.n)>.8||c.n.y>.6&&origin.y-ground(origin.x,origin.z,origin.y)<reach;
  });
  for(const c of this.normals){const inward=desired.dot(c.n);if(inward<0)desired.addScaledVector(c.n,-inward);}
  if(this.normals.length)this.recovery=Math.max(this.recovery,.1);
  if(this.recovery>0){this.velocity.lerp(desired,1-Math.exp(-3*dt));this.recovery=Math.max(0,this.recovery-dt);}
  else this.velocity.copy(desired);
  for(const c of this.normals){const inward=this.velocity.dot(c.n);if(inward<0)this.velocity.addScaledVector(c.n,-inward);}
  const position=origin.clone();let remaining=dt,event=null;
  for(let iteration=0;iteration<10&&remaining>1e-7;iteration++){
   const end=position.clone().addScaledVector(this.velocity,remaining);let hit=null;
   const segments=points&&iteration===0?Math.max(1,Math.ceil(q0.angleTo(q1)/.025)):1;
   for(let j=0;j<segments;j++){
    const t0=j/segments,t1=(j+1)/segments;
    const a=segments===1?offsets0:points.map(p=>p.clone().applyQuaternion(q0.clone().slerp(q1,t0))),b=segments===1?offsets1:points.map(p=>p.clone().applyQuaternion(q0.clone().slerp(q1,t1)));
    hit=this.trace(position.clone().lerp(end,t0),position.clone().lerp(end,t1),radius,raycast,ground,a,b,padding,sweepHull);
    if(hit){hit.fraction=(j+hit.fraction)/segments;break;}
   }
   if(!hit){position.copy(end);break;}
   const n=hit.normal.clone().normalize(),t=Math.max(0,Math.min(1,hit.fraction)),inward=this.velocity.dot(n);
   position.lerp(end,t).addScaledVector(n,skin+(hit.depth||0));remaining*=1-t;
   if(points&&iteration===0){
    // Stop only the obstructed part of rotation; subsequent input can rotate away.
    const attitude=new THREE.Euler().setFromQuaternion(q0.clone().slerp(q1,t),'YXZ');
    s.yaw=FlightCore.angleLerp(old.yaw,attitude.y,1);s.pitch=attitude.x;s.bank=attitude.z;
    const q=quaternion(s);offsets0=offsets1=points.map(p=>p.clone().applyQuaternion(q));
   }
   if(inward<0){
    const impact=-inward,tangent=this.velocity.clone().addScaledVector(n,impact);
    // Low restitution and more paper friction: retain a glide, with only a small rebound.
    const bounce=n.y>.6?Math.max(impact*groundBounce,Math.min(.9,this.velocity.length()*.045)):impact*wallBounce;
    this.velocity.copy(tangent.multiplyScalar(tangentRetention)).addScaledVector(n,bounce);
    this.recovery=.85;
    if(!this.normals.some(c=>c.n.dot(n)>.98))this.normals.push({n,point:hit.surface||position.clone().addScaledVector(n,-radius),reach:radius+Math.max(radius*2,bounce/3)+skin*10});
    if(this.cooldown<=0&&impact>Math.max(.12,radius*.3)){event={kind:hit.kind,normal:n.clone(),speed:impact,position:hit.surface?.clone()||position.clone().addScaledVector(n,-radius)};this.hits++;this.cooldown=.16;this.last={kind:hit.kind,speed:impact};}
   }
   // All previous planes constrain the reflected velocity in a corner.
   for(const c of this.normals){const v=this.velocity.dot(c.n);if(v<0)this.velocity.addScaledVector(c.n,-v);}
  }
  // Intersecting solids can have opposing escape normals. Prefer the last free
  // pose, otherwise search a small local exit instead of leaving a trapped hull.
  if(sweepHull&&offsets1&&sweepHull(position,position,offsets1,offsets1,padding)?.depth>1e-5){
   const free=p=>!sweepHull(p,p,offsets1,offsets1,padding)&&offsets1.every(v=>p.y+v.y>=ground(p.x+v.x,p.z+v.z,p.y+v.y)+padding);
   let safe=free(origin)?origin:null;
   const directions=[new THREE.Vector3(0,1,0),...FlightContact.offsets.filter(v=>v.lengthSq()>.5)];
   for(const distance of [radius,2*radius,4*radius,8*radius,16*radius]){if(safe)break;for(const d of directions){const candidate=position.clone().addScaledVector(d,distance);if(free(candidate)){safe=candidate;break;}}}
   if(safe){position.copy(safe);this.velocity.multiplyScalar(.2);this.normals=[];this.recovery=.85;}
  }
  s.x=position.x;s.y=position.y;s.z=position.z;
  if(this.recovery>0){s.speed=Math.min(s.speed,this.velocity.length());s.acceleration=(s.speed-old.speed)/dt;}
  s.distance=(old.distance||0)+position.distanceTo(origin);
  return event;
 }
 static shape(player,opponent=false){
  const scale=player.scale.x,key=player.userData.skin+':'+scale,cache=opponent?'opponentShape':'contactShape';
  if(player.userData[cache]?.key===key)return player.userData[cache];
  const d=player.userData.dimensions,source=opponent&&!['original','papersky'].includes(player.userData.skin)?[[0,0,-.1325],[-.09,.002,.1325],[.09,.002,.1325],[0,-.018,.045],[0,-.014,.118]].map(p=>new THREE.Vector3(p[0]*d.wingspan/.126,p[1],p[2]*d.length/.1855)):player.userData.probes;
  const vertices=source.map(p=>p.clone().multiplyScalar(scale)),points=[new THREE.Vector3(),...vertices];
  // Edge and interior samples cover narrow posts as well as the extremities.
  for(const [a,b] of [[0,1],[0,2],[1,2]])for(const t of [.25,.5,.75])points.push(vertices[a].clone().lerp(vertices[b],t));
  points.push(vertices[0].clone().add(vertices[1]).add(vertices[2]).multiplyScalar(1/3));
  const shape={key,points,radius:Math.max(...points.map(p=>p.length())),padding:scale*.009};player.userData[cache]=shape;return shape;
 }
}
FlightContact.offsets=[new THREE.Vector3(),...['x','y','z'].flatMap(axis=>[-1,1].map(sign=>{const v=new THREE.Vector3();v[axis]=sign;return v;})),...[-1,1].flatMap(x=>[-1,1].flatMap(y=>[-1,1].map(z=>new THREE.Vector3(x,y,z).normalize())))];
