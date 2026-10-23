/* Metres. Transport a tangent frame along a sphere, including across both poles. */
(function(root){
 'use strict';
 const T=typeof THREE!=='undefined'?THREE:require('./vendor/three.min.js');
 const C=typeof FlightCore!=='undefined'?FlightCore:require('./flight-core.js');
 const profile={speedScale:1,cruiseSpeed:54,cruiseMaxSpeed:68,boostSpeed:125,maxSpeed:155,slowSpeed:12,pitchDrag:35,accelerationRate:.8,turnRate:.75,boostTurnRate:2.05,boostBankAngle:.9,boostClimbPitch:25*Math.PI/180,boostPitchResponse:3.2};
 function frame(s){
  const up=new T.Vector3(s.x,s.y,s.z).normalize(),forward=new T.Vector3(s.fx,s.fy,s.fz);
  forward.addScaledVector(up,-forward.dot(up));
  if(forward.lengthSq()<1e-12)forward.crossVectors(up,Math.abs(up.y)<.9?new T.Vector3(0,1,0):new T.Vector3(1,0,0));
  forward.normalize();return {up,forward,right:new T.Vector3().crossVectors(forward,up).normalize()};
 }
 function setFrame(s,up,forward){s.fx=forward.x;s.fy=forward.y;s.fz=forward.z;return s;}
 function transport(s,distance,radial=0,yaw=0){
  const {up,forward}=frame(s),r=Math.hypot(s.x,s.y,s.z);
  forward.applyAxisAngle(up,yaw);
  const angle=distance/(r+radial*.5),co=Math.cos(angle),si=Math.sin(angle);
  const n=up.clone().multiplyScalar(co).addScaledVector(forward,si);
  const f=forward.multiplyScalar(co).addScaledVector(up,-si).normalize();
  const p=n.multiplyScalar(r+radial);s.x=p.x;s.y=p.y;s.z=p.z;setFrame(s,null,f);return s;
 }
 function advance(s,input,dt,config=profile){
  const previousYaw=s.yaw,oldPosition={x:s.x,y:s.y,z:s.z};
  C.advance(s,input,dt,config);const turn=s.yaw-previousYaw;Object.assign(s,oldPosition);
  return transport(s,s.speed*Math.cos(s.pitch)*dt,s.speed*Math.sin(s.pitch)*dt,turn);
 }
 function quaternion(s){const {up,forward,right}=frame(s);return new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(right,up,forward.negate())).multiply(new T.Quaternion().setFromEuler(new T.Euler(s.pitch,0,s.bank,'YXZ')));}
 function interpolate(a,b,t){const out={...b,...C.interpolate(a,b,t)};for(const k of ['fx','fy','fz'])out[k]=a[k]+(b[k]-a[k])*t;const f=frame(out);setFrame(out,f.up,f.forward);const r=Math.hypot(a.x,a.y,a.z)*(1-t)+Math.hypot(b.x,b.y,b.z)*t;out.x=f.up.x*r;out.y=f.up.y*r;out.z=f.up.z*r;return out;}
 function openLaunch(world,p){
  const q={...p,pitch:.1,bank:0,speed:8,climbInput:0,boostControl:0};
  const vector=p=>new T.Vector3(p.x,p.y,p.z);
  if(world.clearance(vector(q))<4)return false;
  for(let i=0;i<40;i++){
   const old=vector(q);advance(q,{left:0,right:0,pitch:0,boost:false,slow:false},.075,{...profile,cruiseSpeed:15,trimPitch:0});
   const delta=vector(q).sub(old),len=delta.length();
   if(world.clearance(vector(q))<3||world.cast(old,delta.divideScalar(len),len+3))return false;
  }return true;
 }
 function recovery(world,s,history){
  const pos=new T.Vector3(s.x,s.y,s.z);
  for(let i=history.length-1;i>=0;i--)if(new T.Vector3(history[i].x,history[i].y,history[i].z).distanceTo(pos)>20&&openLaunch(world,history[i]))return {...history[i]};
  const nearby=world.pose(pos.normalize(),75);return openLaunch(world,nearby)?nearby:world.spawn();
 }
 const api={profile,frame,advance,transport,quaternion,interpolate,setFrame,openLaunch,recovery};
 if(typeof module!=='undefined')module.exports=api;else root.PlanetCore=api;
})(typeof window!=='undefined'?window:globalThis);
