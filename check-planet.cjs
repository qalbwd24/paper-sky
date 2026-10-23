const assert=require('node:assert/strict');global.THREE=require('./vendor/three.min.js');const T=THREE,P=require('./planet-core.js'),{buildInkPlanet}=require('./planet-world.js');
const world=buildInkPlanet();let s=world.spawn(),origin={...s},radius=Math.hypot(s.x,s.y,s.z);
// A level great-circle circuit goes through both hemispheres without accumulating height drift.
for(let i=0;i<20000;i++){P.transport(s,2*Math.PI*radius/20000);const f=P.frame(s);assert(Math.abs(f.up.dot(f.forward))<1e-12);}
assert(new T.Vector3(s.x,s.y,s.z).distanceTo(new T.Vector3(origin.x,origin.y,origin.z))<1e-5);assert(Math.abs(Math.hypot(s.x,s.y,s.z)-radius)<1e-5);
for(const pole of [[0,2100,0],[0,-2100,0]]){s={...origin,x:pole[0],y:pole[1],z:pole[2],fx:0,fy:0,fz:-1};P.transport(s,1000);assert(Object.values(s).every(Number.isFinite));assert(Math.abs(Math.hypot(s.x,s.y,s.z)-2100)<1e-7);}
// Heading and visual orientation use the same moving frame.
const f=P.frame(s),direction=f.forward.multiplyScalar(Math.cos(s.pitch)).addScaledVector(f.up,Math.sin(s.pitch));assert(new T.Vector3(0,0,-1).applyQuaternion(P.quaternion(s)).distanceTo(direction)<1e-9);
// Collision uses the actual triangles, not a separate smooth height function.
world.group.updateMatrixWorld(true);const caster=new T.Raycaster();let checked=0;
for(let i=0;i<100;i++){const n=new T.Vector3(Math.sin(i*2.4),Math.cos(i*1.1),Math.sin(i*.71)).normalize();caster.set(n.clone().multiplyScalar(4000),n.clone().negate());const hits=caster.intersectObjects([...world.tiles,world.water],false);if(!hits.length)throw Error('Terrain hole '+i);const expected=hits[0].point.length();assert(Math.abs(world.groundRadius(n)-expected)<.005,'Rendered terrain / collision disagree');checked++;}
s={...origin,speed:60};for(let i=0;i<1200;i++)P.advance(s,{left:0,right:0,pitch:1,boost:true,slow:false},1/120);assert(s.speed>90&&s.pitch>.4);s={...origin,speed:60};for(let i=0;i<1200;i++)P.advance(s,{left:0,right:0,pitch:0,boost:false,slow:false},1/120);assert(s.speed>60&&s.speed<=68);assert(Math.hypot(s.x,s.y,s.z)<radius-90);
assert(P.openLaunch(world,origin),'Home launch has a clear arc');
const grounded=world.pose(new T.Vector3(origin.x,origin.y,origin.z).normalize(),.01);assert(!P.openLaunch(world,grounded),'Do not launch inside ground');
const recovered=P.recovery(world,grounded,[]);assert(P.openLaunch(world,recovered)&&world.clearance(new T.Vector3(recovered.x,recovered.y,recovered.z))>50);
const withWall={...world,cast:()=>({kind:'wall'})};assert(!P.openLaunch(withWall,origin),'Blocked launch arc must be rejected');
const fromHistory={...origin};P.transport(fromHistory,100);assert.deepEqual(P.recovery(world,grounded,[fromHistory]),fromHistory,'Prefer an earlier clear flight segment');
console.log('PASS: spherical circuit, both poles, tangent orientation, rendered terrain collision ('+checked+' samples), boost, gravity and safe recovery.');
