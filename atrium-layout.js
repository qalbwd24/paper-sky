/* Seeded layout and traversal rules. No renderer dependency. Units: metres. */
(function(root){
  'use strict';
  const size=16,storey=5,hole=3,levels=3;
  const names=['午后旧车站','水墨庭院','霓虹实验室'];
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const smooth=v=>{v=clamp(v,0,1);return v*v*(3-2*v);};
  const random=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const specs=[
    [['bench',2.05,.78],['luggage',1.15,1.05],['crate',1.1,1.05]],
    [['rocks',1.5,1.25],['bamboo',1.15,1.15],['stoneSeat',1.65,.7]],
    [['console',1.6,.9],['pod',1.2,1.2],['cargo',1.2,.95]]
  ];
  function layout(seed){return names.map((name,level)=>{
    const rand=random((seed+level*7919)>>>0),items=[];
    for(let attempt=0;attempt<1200&&items.length<10;attempt++){
      const spec=specs[level][Math.floor(rand()*3)],yaw=rand()>.5?0:Math.PI/2;
      const w=yaw?spec[2]:spec[1],d=yaw?spec[1]:spec[2],x=(rand()-.5)*13,z=(rand()-.5)*13;
      // A wide cross, the atrium rim, and fixed landmarks always stay clear.
      if(Math.abs(x)-w/2<1.35||Math.abs(z)-d/2<1.35)continue;
      if(Math.abs(x)-w/2<3.3&&Math.abs(z)-d/2<3.3)continue;
      if(Math.abs(x)+w/2>7.05||Math.abs(z)+d/2>7.05)continue;
      if((x< -4.8&&z< -4.5)||(x>4.4&&z< -4.3))continue;
      if(items.some(p=>Math.abs(p.x-x)<(p.w+w)/2+.75&&Math.abs(p.z-z)<(p.d+d)/2+.75))continue;
      items.push({type:spec[0],x,z,w,d,yaw,variant:rand()});
    }
    const area=items.reduce((sum,p)=>sum+p.w*p.d,0)+12;
    return {name,level,items,openRatio:1-area/(size*size-(level?36:0))};
  });}
  const floorAt=y=>clamp(Math.floor((y+.002)/storey),0,levels-1);
  const inHole=(x,z)=>Math.abs(x)<hole&&Math.abs(z)<hole;
  const ground=(x,z,y=0)=>inHole(x,z)?0:floorAt(y)*storey;
  function draft(x,y,z){
    const r=Math.hypot(x+.65,z);
    return 2.15*smooth((2.65-r)/.8)*(1-smooth((x-1.05)/.8))*(1-smooth((y-13.3)/1.3));
  }
  const api={size,storey,hole,levels,names,layout,floorAt,inHole,ground,draft};
  if(typeof module!=='undefined')module.exports=api;else root.AtriumRules=api;
})(typeof window!=='undefined'?window:globalThis);
