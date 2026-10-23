/* Art-directed districts assembled from CC0 GLB components; deterministic scattering between landmarks. */
const PlanetDistricts=[
 {id:'village',name:'湖湾集镇',x:190,z:410,height:22,pad:155,start:[190,630,48],heading:0,color:'#b7714c'},
 {id:'forest',name:'松林遗迹',x:-310,z:100,height:65,pad:85,start:[-310,255,60],heading:0,color:'#638375'},
 {id:'canyon',name:'岩门峡谷',x:-225,z:-340,height:42,pad:110,start:[-225,-170,54],heading:0,color:'#94715f'},
 {id:'castle',name:'高台古堡',x:365,z:-335,height:125,pad:165,start:[365,-100,100],heading:0,color:'#737784'}
];
function createPlanetSceneryPlan(groundRadius,R){
 const T=THREE,items=[],roads=[],landmarks=[],N='kenney-nature/',K='kenney-castle/',V='kenney-town/';
 const random=i=>{const n=Math.sin(i*127.1+311.7)*43758.5453;return n-Math.floor(n);};
 const normal=(x,z)=>new T.Vector3(x/R,1,z/R).normalize();
 function approach(x,z){return PlanetDistricts.some(d=>{const dx=d.start[0]-d.x,dz=d.start[1]-d.z,t=THREE.MathUtils.clamp(((x-d.x)*dx+(z-d.z)*dz)/(dx*dx+dz*dz),0,1);return Math.hypot(x-d.x-t*dx,z-d.z-t*dz)<32;});}
 function rootAt(x,z,heading=0,height=null){const n=normal(x,z),q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),n);q.multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),heading));return new T.Matrix4().compose(n.multiplyScalar(height??groundRadius(n)),q,new T.Vector3(1,1,1));}
 function part(file,root,offset=[0,0,0],size=1,rotation=0,kind='建筑',tint=null){const scale=Array.isArray(size)?size:[size,size,size];const local=new T.Matrix4().compose(new T.Vector3(...offset),new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),rotation),new T.Vector3(...scale));items.push({file,transform:root.clone().multiply(local),kind,tint});}
 function place(file,x,z,size=1,angle=0,kind='建筑',tint=null){part(file,rootAt(x,z,angle),[0,-.3,0],size,0,kind,tint);}
 function house(x,z,width,floors,heading,index){
  const base=rootAt(x,z,heading),story=width*.66;
  // Use the same rigid foundation frame for every wall and roof. No gaps on a curved world.
  part(K+'tower-square-base.glb',base,[0,-2,0],[width,2.2,width],0,'石基');
  for(let floor=0;floor<floors;floor++)for(let side=0;side<4;side++){
   const file=floor===0&&side===0?'wall-door.glb':(side+floor)%2?'wall-window-shutters.glb':'wall-wood-detail-cross.glb';
   part(V+file,base,[0,floor*story,0],[width,story,width],side*Math.PI/2,'房屋');
  }
  part(V+(index%3===0?'roof-high-point.glb':'roof-gable.glb'),base,[0,floors*story,0],[width,width*.65,width],0,'屋顶');
  if(index%2===0)part(V+'chimney.glb',base,[0,floors*story+width*.1,0],width*.7,0,'烟囱');
 }
 // A lakeside square, loose lanes and arcades, rather than a carpet of identical houses.
 for(let i=0;i<16;i++){
  const angle=i/16*Math.PI*2,rad=i%3===0?112:86;
  if(Math.abs(Math.cos(angle))<.3)continue;
  house(190+Math.cos(angle)*rad,410+Math.sin(angle)*rad,14+random(i+7)*6,1+(i%3===0?1:0),-angle,i);
 }
 place(V+'fountain-round.glb',190,410,8,0,'喷泉');
 for(let i=0;i<8;i++){const a=i/8*Math.PI*2;place(V+(i%2?'stall-green.glb':'stall-red.glb'),190+Math.cos(a)*38,410+Math.sin(a)*38,7,-a,'集市');}
 for(let i=0;i<9;i++){place(V+'lantern.glb',160+(i%3)*30,350+Math.floor(i/3)*60,3.4,0,'灯柱');if(i%2===0)place(V+'cart.glb',240+(i%3)*12,370+Math.floor(i/3)*35,5,i,'推车');}
 // Nine real arches cross the shallow bay. The openings remain triangle-tested.
 for(let i=0;i<9;i++){const x=-115+i*18,base=rootAt(x,290,0,R+2);part(K+'tower-square-arch.glb',base,[0,0,0],[19.36,25,19.36],0,'湖上桥洞');part(K+'tower-square-top.glb',base,[0,25,0],[19.36,3,19.36],0,'桥面');}
 landmarks.push({name:'九孔湖桥',x:-40,z:290});
 // Forest ruins: broken towers with upper and lower routes and a spacious central clearing.
 for(let i=0;i<7;i++){
  const a=i/7*Math.PI*2,base=rootAt(-310+Math.cos(a)*63,100+Math.sin(a)*63,a);
  part(K+'tower-square-arch.glb',base,[0,0,0],20,0,'遗迹拱洞');
  if(i%2===0){part(K+'tower-square-mid-windows.glb',base,[0,20,0],20,0,'遗迹高塔');part(K+'tower-square-top.glb',base,[0,40,0],20,0,'遗迹顶台');}
 }
 // Staggered rock gates create a curved, flyable canyon passage; not a closed collision box.
 for(let i=0;i<5;i++){
  const x=-225+Math.sin(i*.9)*48,z=-245-i*48,base=rootAt(x,z,Math.sin(i*.9)*.25);
  part(N+'cliff_cave_rock.glb',base,[0,-1,0],[48,42,48],0,'岩门','#8c8b82');
  part(N+'rock_largeA.glb',base,[0,39,13],[56,24,28],0,'岩门顶岩','#8c8b82');
  for(const side of [-1,1])part(N+'rock_tallA.glb',base,[side*22,6,-2],[18,38,24],side*.4,'门侧岩壁','#8c8b82');
  place(N+'rock_tallA.glb',x-42,z,30+i*3,i*.5,'石柱','#8c8b82');place(N+'rock_tallA.glb',x+40,z-10,36,i,'石柱','#8c8b82');
 }
 // Castle courtyard: connected raised walkway, inhabited towers, and two open gates.
 const fortress=rootAt(365,-335);
 for(const x of [-66,66])for(const z of [-66,66]){
  part(K+'tower-hexagon-base.glb',fortress,[x,-1,z],27,0,'古堡塔楼');
  part(K+'tower-square-mid-windows.glb',fortress,[x,33,z],[21,22,21],0,'古堡塔楼');
  part(K+'tower-hexagon-roof.glb',fortress,[x,55,z],30,0,'古堡尖顶');
 }
 for(const side of [-1,1])for(let i=-2;i<=2;i++){
  part(K+'tower-square-arch.glb',fortress,[side*66,0,i*23],[24.73,32,24.73],0,'古堡回廊');
  part(K+'tower-square-top.glb',fortress,[side*66,32,i*23],[24.73,5,24.73],0,'回廊露台');
 }
 for(const z of [-66,66])part(K+'tower-square-arch.glb',fortress,[0,0,z],[38,38,28],0,'古堡大门');
 part(K+'tower-square-base.glb',fortress,[0,-2,-16],[31,33,27],0,'主塔');part(K+'tower-square-mid-windows.glb',fortress,[0,31,-16],[31,27,27],0,'主塔');part(K+'tower-square-roof.glb',fortress,[0,58,-16],[31,23,27],0,'主塔屋顶');
 // Native GLB colours keep bark, leaves, stone trim and roof tiles distinct.
 for(let i=0;i<400;i++){
  const angle=random(i+150)*Math.PI*2,range=Math.sqrt(random(i+351))*1050;
  const x=Math.cos(angle)*range,z=Math.sin(angle)*range,n=normal(x,z);
  if(approach(x,z))continue;
  if(groundRadius(n)<R+6)continue;
  if(PlanetDistricts.some(d=>Math.hypot(x-d.x,z-d.z)<d.pad*.85))continue;
  const autumn=x>180&&z>160,file=autumn?'tree_detailed_fall.glb':i%3===0?'tree_detailed.glb':i%2?'tree_pineRoundA.glb':'tree_pineDefaultA.glb';
  place(N+file,x,z,11+random(i+39)*13,random(i+14)*6.28,'树林');
  if(i%6===0)place(N+'rock_largeA.glb',x+12,z+7,12+random(i+11)*14,i,'岩石');
 }
 // Deliberate clusters frame landmarks, leaving the approach and courtyard clear.
 for(let i=0;i<90;i++){const a=i*.7,rad=95+random(i+902)*120,x=-310+Math.cos(a)*rad,z=100+Math.sin(a)*rad;if(!approach(x,z))place(N+(i%3?'tree_pineRoundA.glb':'tree_detailed.glb'),x,z,15+random(i+619)*12,i,'松林');}
 for(let i=0;i<20;i++){const a=i/20*Math.PI*2,x=190+Math.cos(a)*142,z=410+Math.sin(a)*142;if(!approach(x,z))place(N+'tree_detailed_fall.glb',x,z,13+random(i+600)*7,a,'秋林');}
 roads.push({points:[[190,630],[190,535],[190,460],[190,410],[190,340],[100,300]],width:9});
 roads.push({points:[[-150,290],[-245,235],[-310,170],[-310,100],[-290,-100],[-225,-240]],width:7});
 roads.push({points:[[260,340],[430,190],[475,0],[410,-170],[365,-260]],width:8});
 return {items,roads,landmarks,normal,districts:PlanetDistricts};
}
if(typeof module!=='undefined')module.exports={PlanetDistricts,createPlanetSceneryPlan};
