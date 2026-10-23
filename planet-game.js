(()=>{'use strict';
 const $=id=>document.getElementById(id),T=THREE,C=FlightCore,P=PlanetCore,sceneOptions=globalThis.FlightSceneOptions||{},flightProfile={...P.profile,...sceneOptions.flightProfile};
 let renderer;try{renderer=new T.WebGLRenderer({canvas:$('world'),antialias:true,logarithmicDepthBuffer:true,powerPreference:'low-power'});}catch(e){$('error').hidden=false;$('error').textContent=e.message;return;}
 renderer.setPixelRatio(1);renderer.outputColorSpace=T.SRGBColorSpace;
 const scene=new T.Scene();scene.background=new T.Color('#eeede0');const flightFog=new T.Fog('#eeede0',1300,6500);scene.fog=flightFog;
 const camera=new T.PerspectiveCamera(58,innerWidth/innerHeight,.015,18000),world=buildInkPlanet();scene.add(world.group);
 sceneOptions.setupRendering?.({renderer,scene,world});
 const plane=createPaperPlane(renderer);plane.userData.setSkin(new URLSearchParams(location.search).get('skin')==='papersky'?'papersky':'inkbird');$('skin').value=plane.userData.skin;scene.add(plane);const effects=new FlightEffects(scene,renderer);
 let selectedDistrict=sceneOptions.districts?.[0].id||'village'; let s=world.spawn(selectedDistrict),previous={...s},visual={...s},mode='ready',pause=false,overview=false,pauseBeforeOverview=false,ready=false,quality='high',motion=.35,launchAge=0,time=0,last=0,accumulator=0,lastRender=0,renderDt=0,frameCount=0,frameTime=0,fps=0,hudTime=0;
 const keys=new Set(),wind={x:0,y:0,z:0,gust:0},history=[];
 let historyTimer=0,camPitch=0,fov=58,audio=null;
 const v3=s=>new T.Vector3(s.x,s.y,s.z),map=$('mapCanvas').getContext('2d');
 function ui(){const stopped=mode==='ready';$('welcome').hidden=!stopped||overview;$('landing').hidden=mode!=='landed'||overview;$('paused').hidden=!pause||overview||mode!=='flying';$('overviewLabel').hidden=!overview;$('overview').textContent=overview?'返回飞行':(sceneOptions.overviewTitle||'俯瞰星球');$('flightState').textContent=overview?(sceneOptions.overviewTitle||'俯瞰星球'):pause?'已暂停':mode==='flying'?'沿球面飞行':mode==='landed'?'停留看景':'等待出发';}
 function setPause(value){pause=value;keys.clear();accumulator=0;previous={...s};ui();}
 function reset(){s=world.spawn(selectedDistrict);previous={...s};visual={...s};mode='ready';pause=overview=false;time=launchAge=0;history.length=0;historyTimer=0;effects.reset();plane.userData.resetPose();cameraUpdate(0,true);ui();hud();}
 function openLaunch(p){
  return P.openLaunch(world,p);
 }
 function launch(){
  if(!ready||mode==='flying')return;
  if(mode==='landed'){
   s={...P.recovery(world,s,history),distance:s.distance};
  }
  s.pitch=.1;s.bank=0;s.speed=8;s.climbInput=s.boostControl=s.acceleration=0;launchAge=0;mode='flying';overview=false;setPause(false);effects.reset();previous={...s};visual={...s};cameraUpdate(0,true);$('world').focus();
 }
 function land(kind,normal){s.speed=s.acceleration=0;mode='landed';$('landingText').textContent='碰到了'+kind+'。空格会先检查净空，再从开阔航段低速起飞。';previous={...s};ui();}
 function sweep(old){
  const q0=P.quaternion(old),q1=P.quaternion(s),from=v3(old),to=v3(s);let best=null;
  for(const probe of [new T.Vector3(),...plane.userData.probes]){
   const a=probe.clone().multiply(plane.scale).applyQuaternion(q0).add(from),b=probe.clone().multiply(plane.scale).applyQuaternion(q1).add(to),delta=b.clone().sub(a),length=delta.length();
   if(length<1e-9)continue;const hit=world.cast(a,delta.divideScalar(length),length);if(hit&&(!best||hit.fraction<best.fraction))best=hit;
   if(world.clearance(b)<.008){let lo=0,hi=1;for(let i=0;i<12;i++){const t=(lo+hi)/2;if(world.clearance(a.clone().lerp(b,t))<.008)hi=t;else lo=t;}if(!best||hi<best.fraction){const n=b.clone().normalize();best={fraction:hi,normal:n,kind:world.groundRadius(n)<world.radius+.5?'湖面':'山坡'};}}
  }
  if(best){const pos=from.lerp(to,Math.max(0,best.fraction-.002)).addScaledVector(best.normal,.01);Object.assign(s,{x:pos.x,y:pos.y,z:pos.z});land(best.kind,best.normal);}
 }
 function physics(dt,input){
  if(mode!=='flying'||pause||overview)return;
  const old={...s};launchAge+=dt;time+=dt;const t=C.clamp(launchAge/3,0,1),ramp=t*t*(3-2*t);
  P.advance(s,input,dt,{...flightProfile,cruiseSpeed:8+(flightProfile.cruiseSpeed-8)*ramp,trimPitch:(flightProfile.trimPitch??C.trimPitch)*ramp});
  // Mild continuous wind transported in the current tangent frame.
  const f=P.frame(s),side=.22*Math.sin(time*.43),rise=.07*Math.sin(time*.57);const push=f.right.multiplyScalar(side).addScaledVector(f.up,rise);s.x+=push.x*dt;s.y+=push.y*dt;s.z+=push.z*dt;Object.assign(wind,{x:side,y:rise,z:0,gust:.5+.5*Math.sin(time*.71)});
  sweep(old);historyTimer+=dt;if(mode==='flying'&&historyTimer>.4){historyTimer=0;if(world.clearance(v3(s))>8)history.push({...s});if(history.length>50)history.shift();}
  // High flight remains possible; a soft downward trim starts far above the terrain.
  if(v3(s).length()>world.radius+1800)s.pitch=Math.min(s.pitch,0);
 }
 function input(){const held=(...c)=>c.some(k=>keys.has(k))?1:0;return {left:held('KeyA','KeyJ','ArrowLeft'),right:held('KeyD','KeyL','ArrowRight'),pitch:held('KeyW','KeyI','ArrowUp')-held('KeyS','KeyK','ArrowDown'),boost:held('ShiftLeft','ShiftRight'),slow:held('ControlLeft','ControlRight')};}
 function cameraUpdate(dt,snap=false){
  const pos=v3(visual),f=P.frame(visual);camera.up.copy(f.up);
  if(overview){const view=world.overview;camera.up.fromArray(view?.up||[0,0,-1]);camera.position.fromArray(view?.position||[1700,7700,2500]);camera.lookAt(new T.Vector3().fromArray(view?.target||[0,0,0]));camera.fov=43;camera.updateProjectionMatrix();return;}
  const blend=snap?1:1-Math.exp(-7*dt);camPitch+=(visual.pitch-camPitch)*blend;
  const energy=effects.strength*motion;fov+=(58+energy*15-fov)*(snap?1:1-Math.exp(-3*dt));const distance=.64*Math.max(1,.9/camera.aspect)+energy*.1;
  camera.position.copy(pos).addScaledVector(f.forward,-Math.cos(camPitch*.45)*distance).addScaledVector(f.up,.23-Math.sin(camPitch*.45)*distance);
  const altitude=world.clearance(camera.position);if(altitude<.04)camera.position.addScaledVector(f.up,.04-altitude);
  camera.lookAt(pos.clone().addScaledVector(f.forward,.38).addScaledVector(f.up,.01+camPitch*.24));camera.fov=fov;camera.updateProjectionMatrix();
 }
 function render(dt=0){
  scene.fog=overview?null:flightFog;
  plane.position.copy(v3(visual));plane.quaternion.copy(P.quaternion(visual));plane.userData.updatePose(dt,{pitch:visual.pitch,bank:visual.bank,boost:visual.boostControl||input().boost,slow:!!input().slow,active:mode==='flying'});plane.updateMatrixWorld(true);plane.visible=!overview;
  cameraUpdate(dt);world.update(v3(visual),overview,dt);effects.update(dt,{plane,camera,speed:s.speed/2.4,acceleration:s.acceleration/2.4,active:mode==='flying'&&!overview,wind,motion:overview?0:motion});effects.render(camera,quality);
 }
 function hud(){$('altitude').textContent=Math.max(0,world.clearance(v3(s))).toFixed(1);$('speed').textContent=s.speed.toFixed(1);$('distance').textContent=(s.distance/1000).toFixed(2);$('fps').textContent=fps+' FPS · '+({high:'清晰',balanced:'均衡',low:'省电',pixel:'像素'}[quality]);const n=v3(s).normalize();$('planetInfo').textContent=(sceneOptions.worldInfo||'半径 2 公里 · 球面重力')+' · '+world.regionAt(v3(s));world.drawMap(map,s);}
 function resize(){const sizes={high:[1920,1080],balanced:[1280,720],low:[960,540],pixel:[480,270]}[quality],scale=Math.min(1,sizes[0]/innerWidth,sizes[1]/innerHeight);const w=Math.floor(innerWidth*scale),h=Math.floor(innerHeight*scale);renderer.setSize(w,h,false);effects.target.samples=renderer.capabilities.isWebGL2?(quality==='high'?4:2):0;effects.resize(w,h);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();document.body.classList.toggle('pixel',quality==='pixel');$('planetInfo').style.top=(document.querySelector('header').getBoundingClientRect().bottom+12)+'px';}
 function sound(){const on=$('sound').getAttribute('aria-pressed')!=='true';$('sound').setAttribute('aria-pressed',String(on));$('sound').textContent='风声：'+(on?'开':'关');if(!on)return;
  try{if(!audio){const context=new AudioContext(),buffer=context.createBuffer(1,context.sampleRate*4,context.sampleRate),data=buffer.getChannelData(0);let v=0;for(let i=0;i<data.length;i++){const white=Math.random()*2-1;v=(v+white*.02)/1.02;data[i]=v*2.8+white*.18;}const src=context.createBufferSource(),gain=context.createGain(),filter=context.createBiquadFilter();src.buffer=buffer;src.loop=true;filter.type='lowpass';gain.gain.value=0;src.connect(filter).connect(gain).connect(context.destination);src.start();audio={context,gain,filter};}audio.context.resume();}catch(e){$('sound').textContent='风声不可用';$('sound').setAttribute('aria-pressed','false');}
 }
 $('district').onchange=e=>{selectedDistrict=e.target.value;reset();$('world').focus();};
 if($('artStyle'))$('artStyle').onchange=e=>{world.setStyle(e.target.value);$('world').focus();};
 $('start').onclick=$('launch').onclick=launch;$('reset').onclick=reset;$('resume').onclick=()=>setPause(false);$('sound').onclick=sound;
 $('overview').onclick=()=>{if(!overview){pauseBeforeOverview=pause;overview=true;setPause(true);}else{overview=false;setPause(pauseBeforeOverview);cameraUpdate(0,true);}effects.reset();ui();};
 $('skin').onchange=e=>{plane.userData.setSkin(e.target.value);effects.reset();$('world').focus();};$('quality').onchange=e=>{quality=e.target.value;resize();};$('motion').onchange=e=>motion=Number(e.target.value);
 addEventListener('resize',resize);addEventListener('blur',()=>{if(mode==='flying')setPause(true)});document.addEventListener('visibilitychange',()=>{if(document.hidden&&mode==='flying')setPause(true)});
 document.addEventListener('keydown',e=>{if(e.target.tagName==='SELECT')return;if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ControlLeft','ControlRight'].includes(e.code))e.preventDefault();keys.add(e.code);if(e.repeat)return;if(e.code==='Space')launch();if(e.code==='KeyR')reset();if((e.code==='KeyP'||e.code==='Escape')&&!overview)setPause(!pause);});document.addEventListener('keyup',e=>keys.delete(e.code));
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();setPause(true);$('error').hidden=false;$('error').textContent='画面暂时中断，请刷新并选择省电画质。';});
 window.planetDiagnostics=()=>({scene:sceneOptions.id||'planet',ready,mode,pause,overview,position:v3(s).toArray(),radius:v3(s).length(),altitude:world.clearance(v3(s)),speed:s.speed,pitch:s.pitch,frameDot:P.frame(s).up.dot(P.frame(s).forward),fps,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,scenery:world.stats,pose:{...plane.userData.pose}});
 if(new URLSearchParams(location.search).has('qa'))window.planetQA={place(values){s={...s,...values};mode='flying';overview=false;launchAge=10;previous={...s};visual={...s};setPause(true);cameraUpdate(0,true);render();},step(seconds,controls={}){pause=false;for(let i=0;i<Math.round(seconds*120);i++){previous={...s};physics(1/120,{left:0,right:0,pitch:0,boost:false,slow:false,...controls});}visual={...s};setPause(true);render(.1);hud();return planetDiagnostics();},spawn:()=>world.spawn(),reset,launch,openLaunch,world,render:()=>render(),state:()=>({...s})};
 function frame(now){requestAnimationFrame(frame);const elapsed=last?(now-last)/1000:1/60,dt=Math.min(.08,elapsed);last=now;renderDt+=dt;frameTime+=elapsed;hudTime+=elapsed;
  if(!pause&&!overview){accumulator+=dt;while(accumulator>=1/120){previous={...s};physics(1/120,input());accumulator-=1/120;}}
  if((quality==='low'||quality==='pixel')&&now-lastRender<1000/30-.5)return;lastRender=now;const displayDt=renderDt;renderDt=0;visual=mode==='flying'&&!pause&&!overview?P.interpolate(previous,s,accumulator*120):{...s};render(pause||overview?0:displayDt);frameCount++;
  if(audio){const active=$('sound').getAttribute('aria-pressed')==='true'&&mode==='flying'&&!pause&&!overview,energy=C.clamp((s.speed/2.4-6)/44,0,1);audio.gain.gain.setTargetAtTime(active?.008+energy*energy*.17:0,audio.context.currentTime,.18);audio.filter.frequency.setTargetAtTime(360+energy*energy*2000,audio.context.currentTime,.22);}
  if(frameTime>=1){fps=Math.round(frameCount/frameTime);frameCount=frameTime=0;}if(hudTime>.2){hudTime=0;hud();}
 }
 resize();reset();world.ready.then(()=>{ready=true;if(sceneOptions.createScenery)reset();$('start').disabled=false;$('start').textContent='出发  SPACE ↗';$('loadStatus').textContent=sceneOptions.credit||'Kenney CC0 开放模型 · 本地加载完成';}).catch(e=>{$('error').hidden=false;$('error').textContent='模型载入失败，请刷新重试：'+e.message;$('loadStatus').textContent='载入失败，尚未开始飞行';});requestAnimationFrame(frame);
})();




