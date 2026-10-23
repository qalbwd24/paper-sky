/* Art-directed ink bird: curved feather surface plus a volumetric core. Forward = -Z. */
function createInkBird(){
  const root=new THREE.Group();root.name='水墨飞鸟 · 扇尾墨羽';
  const map=typeof document==='undefined'?new THREE.Texture():new THREE.TextureLoader().load('assets/ink-bird-fan-clean.png');
  map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=4;
  const ink=new THREE.MeshBasicMaterial({map,side:THREE.DoubleSide,transparent:true,alphaTest:.035,depthWrite:true});
  ink.forceSinglePass=true;
  // The source supplies opacity only. No white or grey pigment is rendered.
  ink.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
    float inkLight=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));
    diffuseColor.a*=1.0-smoothstep(.015,.55,inkLight);
    diffuseColor.rgb=vec3(0.0);
  `);};ink.customProgramCacheKey=()=> 'ink-black-alpha-2';
  const W=.32,L=.267,N=34,g=new THREE.PlaneGeometry(W,L,N,N);g.rotateX(-Math.PI/2);
  const a=g.attributes.position;
  for(let i=0;i<a.count;i++){const x=a.getX(i),z=a.getZ(i);a.setY(i,.016*Math.exp(-x*x/.00042)*Math.exp(-z*z/.003)+Math.abs(x)*.075);}
  g.computeVertexNormals();const rest=new Float32Array(a.array),mesh=new THREE.Mesh(g,ink);mesh.name='连续墨羽 · 双翼与扇尾';root.add(mesh);
  for(const [position,size] of [[[0,-.002,-.002],[.012,.014,.041]],[[0,.003,-.064],[.008,.011,.016]]]){
    const body=new THREE.SphereGeometry(1,16,10);body.scale(...size);body.translate(...position);
    const p=body.attributes.position,uv=body.attributes.uv;for(let i=0;i<p.count;i++)uv.setXY(i,p.getX(i)/W+.5,.5-p.getZ(i)/L);
    const core=new THREE.Mesh(body,ink);core.name='立体墨色躯干';root.add(core);
  }
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};let phase=0,envelope=0;
  const pose={climb:0,dive:0,bank:0,flap:0},tips=[new THREE.Vector3(),new THREE.Vector3()];
  function deform(x,y,z,out){
    const side=Math.sign(x),tail=smooth(.025,.105,z),wing=(1-tail)*smooth(.018,.08,Math.abs(x));
    // Continuous skin weights replace the former hard cut across z = .047.
    // Keep the shoulders rooted; fold back without spinning whole feather patches.
    const dx=x-side*.018,angle=side*(.035+pose.climb*.06+pose.flap+side*pose.bank*.035);
    const targetX=side*.018+dx*Math.cos(angle)-y*Math.sin(angle);
    const targetY=dx*Math.sin(angle)+y*Math.cos(angle);
    x+=(targetX-x)*wing;y+=(targetY-y)*wing;
    x*=1-.27*pose.dive*wing;z+=Math.abs(dx)*.29*pose.dive*wing;
    x*=1+tail*(pose.climb*.035-pose.dive*.12);
    y+=tail*(pose.climb*.004-pose.dive*.006);
    out.set(x,y,z);return out;
  }
  const temp=new THREE.Vector3();
  function apply(){for(let i=0;i<a.count;i++){deform(rest[i*3],rest[i*3+1],rest[i*3+2],temp);a.setXYZ(i,temp.x,temp.y,temp.z);}a.needsUpdate=true;
    deform(-.147,.011,-.10,tips[0]);deform(.147,.011,-.10,tips[1]);
  }
  g.boundingSphere=new THREE.Sphere(new THREE.Vector3(),.27);
  function update(dt,{pitch=0,bank=0,active=false}){if(dt<=0)return;
    const f=1-Math.exp(-7*dt),climb=active?clamp((pitch+.03)/.36,0,1):0,dive=active?clamp((-pitch-.18)/.55,0,1):0;
    pose.climb+=(climb-pose.climb)*f;pose.dive+=(dive-pose.dive)*f;pose.bank+=((active?clamp(bank/.9,-1,1):0)-pose.bank)*f;
    envelope+=((active?climb:0)-envelope)*(1-Math.exp(-3.5*dt));phase=(phase+dt*Math.PI*2*1.15)%(Math.PI*2);
    pose.flap=(Math.sin(phase)+.14*Math.sin(2*phase))*.25*envelope;apply();
  }
  function reset(){phase=envelope=0;pose.climb=pose.dive=pose.bank=pose.flap=0;apply();}
  reset();root.visible=false;
  return {group:root,update,reset,tips,pose,map,dimensions:{length:L*.7,wingspan:W*.7},
    probes:[[0,.003,-.09],[-.154,.012,-.07],[.154,.012,-.07],[0,-.017,-.01],[0,0,.132]]};
}
if(typeof module!=='undefined')module.exports={createInkBird};
