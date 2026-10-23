const test=require('node:test'),assert=require('node:assert/strict'),{getWorld,THREE:T,P}=require('./world.cjs');
const w=getWorld(),posts=w.colliders.filter(c=>c.inverse&&c.kind==='门洞侧柱'&&c.bounds.min.y>1062&&c.bounds.max.y<1374);
const points=[[0,0,-.742],[-.454,.016,.6],[.454,.016,.6],[0,-.1,.25],[0,-.08,.65]].map(v=>new T.Vector3(...v));
const offsets=s=>{const q=new T.Quaternion().setFromEuler(new T.Euler(s.pitch||0,s.yaw||0,s.bank||0,'YXZ'));return points.map(p=>p.clone().applyQuaternion(q));};
function clear(s){const p=P.pos(s),v=offsets(s);return !w.sweepHull(p,p,v,v,.05);}
test('complete wing volume catches an obstacle between sparse probe paths',()=>{
 const c=posts[0],center=c.bounds.getCenter(new T.Vector3()),axes=[new T.Vector3(1,0,0),new T.Vector3(0,0,1)].map(v=>v.transformDirection(c.matrix));
 const a=center.clone().addScaledVector(axes[0],-5).addScaledVector(axes[1],8),b=a.clone().addScaledVector(axes[1],-16);
 const probes=[axes[0].clone().multiplyScalar(-10),axes[0].clone().multiplyScalar(10)];
 assert(w.sweepHull(a,b,probes,probes,.05),'solid wing span must hit the pillar');
});
test('high speed, glancing corners and rotation never finish inside city boxes',()=>{
 for(const c of posts.slice(0,12))for(const x of [-.65,0,.65]){
  const a=new T.Vector3(x,0,1.4).applyMatrix4(c.matrix),b=new T.Vector3(x,0,-1.4).applyMatrix4(c.matrix);
  const s={x:a.x,y:a.y,z:a.z,yaw:Math.atan2(c.matrix.elements[8],c.matrix.elements[10]),pitch:0,bank:0,speed:100,distance:0},old={...s};
  Object.assign(s,{x:b.x,y:b.y,z:b.z,bank:.4});
  new P.Contact().move(old,s,.1,{points,radius:.85,padding:.05,sweepHull:w.sweepHull,raycast:w.raycast,ground:w.ground});
  assert(clear(s),'hull clear after a swept corner collision');
 }
});
test('preexisting penetration escapes solids even when nearly stationary',()=>{
 for(const c of posts.slice(0,20)){
  const a=c.bounds.getCenter(new T.Vector3()),s={x:a.x,y:a.y,z:a.z,yaw:0,pitch:0,bank:0,speed:0,distance:0},body=new P.Contact();
  assert(!clear(s));body.move({...s},s,P.DT,{points,radius:.85,padding:.05,sweepHull:w.sweepHull,raycast:w.raycast,ground:w.ground});assert(clear(s),'escape from inside a building without reset');
 }
});
test('restored predicting client stays identical to server through repeated impacts',()=>{
 const c=posts[0],p=new T.Vector3(0,0,1.1).applyMatrix4(c.matrix),a={...P.spawn(w),x:p.x,y:p.y,z:p.z,age:4,yaw:Math.atan2(c.matrix.elements[8],c.matrix.elements[10]),pitch:0,speed:42},server=new P.Contact();
 for(let i=0;i<240;i++){
  const b={...a},client=new P.Contact();P.restore(client,P.pack(server));const input={boost:true,left:i>100?1:0,pitch:0};P.step(a,input,true,server,w);P.step(b,input,true,client,w);assert.deepEqual(a,b);assert(clear(a),'no penetration under sustained thrust and turning');
 }
});
