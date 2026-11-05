/* Local personal experience: no room, network seat or WebSocket is created. */
(()=>{'use strict';
 const B=window.paperBridge,P=window.ChaseNetPhysics,UI=window.paperFlightUI,M=window.FlightUIMath,$=id=>document.getElementById(id);if(!B||!P||!UI)return;
 const c=B.combat,race=c.race,pool=[...c.enemies],cuePool=[...c.cues],ownBody=new P.Contact();let active=false,count=0,timer=0,previous=null,mapBackground=null,ownGeneration=0;
 let scheme='speed',roleMode='swap';
 function selectScheme(value){scheme=value==='classic'?'classic':'speed';const cfg=scheme==='speed'?P:P.classic;race.hunterProfile=cfg.hunter;race.runnerProfile=cfg.runner;}
 const cues=pool.map(()=>{const cue=document.createElement('div');cue.className='netCue';cue.hidden=true;cue.innerHTML='<span class="netCueReticle"></span><span class="netCueArrow">➤</span><span class="netCueLabel"><span class="netCueName"></span><span class="netCueDistance"></span></span>';$('netCues').append(cue);return cue;});
 const originalFinish=race.finish.bind(race),originalCandidates=race.candidates.bind(race);
 race.candidates=hunter=>{const candidates=originalCandidates(hunter);return active&&hunter?.id!==-1?candidates.filter(target=>target.id===-1):candidates;};
 function clearMissiles(){race.lock={id:null,time:0};race.cooldown=1;race.respawnDelay=0;race.respawnRequested=false;for(const missile of race.missiles){missile.life=0;missile.mesh.visible=missile.trail.visible=false;}}
 function setHunter(id){race.hunterId=id;race.role=id===-1?'hunter':'runner';adapter.isHunter=id===-1;race.playerImmune=3;for(const e of c.enemies)e.raceImmune=3;clearMissiles();UI.clear(false);}
 function resetPlayer(){ownBody.reset();B.snap(P.spawn(B.world(),0),true);previous={...B.state};B.plane.userData.resetPose();race.playerGeneration=++ownGeneration;}
 function resetBot(e){Object.assign(e.s,P.spawn(B.world(),0));e.old.copy(P.pos(e.s));e.oldPose={...e.s};e.contact.reset();e.dead=0;e.hp=3;e.generation=(e.generation||0)+1;c.pilot.reset(e);race.spawned(e);}
 race.finish=(missile,target)=>{if(!active)return originalFinish(missile,target);const captured=target.id;originalFinish(missile,target);if(roleMode==='fixed')return;setHunter(captured);if(captured===-1)resetPlayer();else resetBot(c.enemies[captured]);race.message=captured===-1?'被捕获 · 你成为追击机':'捕获成功 · 你成为逃逸机';race.messageAge=2;};
 function configurePool(n,reset=false){const was=count;count=Math.max(0,Math.min(3,Math.round(Number(n)||0)));c.enemies=pool.slice(0,count);c.cues=cuePool.slice(0,count);for(let i=count;i<pool.length;i++){pool[i].mesh.visible=false;cuePool[i].hidden=true;cues[i].hidden=true;}c.enabled=count>0;c.mode='race';selectScheme(scheme);
  if(reset){race.hunterId=-1;race.role='hunter';c.reset(B.state);adapter.isHunter=true;}
  else{if(count===0||race.hunterId>=count)setHunter(-1);for(let i=was;i<count;i++)c.spawn(pool[i],B.state);clearMissiles();}
  document.body.dataset.soloBots=String(count);
 }
 function reset(){timer=0;UI.clear();resetPlayer();configurePool(count,true);race.playerState=B.state;race.playerImmune=3;for(const e of c.enemies)e.raceImmune=3;updateUI();}
 function updateUI(){UI.update({solo:true,scheme,roleMode,botCount:count,captures:race.captures,caught:race.caught,state:{running:true,waiting:false,frozen:null},me:{id:'self'},isHunter:adapter.isHunter,connected:true,rtt:0});}
 const adapter={active:true,isHunter:true,
  step(dt){if(!active||UI.localPaused)return;timer+=dt;while(timer+1e-9>=P.DT){timer-=P.DT;previous={...B.state};P.step(B.state,UI.input(B.input()),adapter.isHunter,ownBody,B.world(),scheme==='speed'?undefined:P.classic);if(count)c.update(P.DT,B.state,false,true);}},
  framePose(remainder){return active&&!UI.localPaused&&previous?FlightCore.interpolate(previous,B.state,Math.min(1,(timer+remainder)/P.DT)):{...B.state};},
  renderAlpha(remainder){return UI.localPaused?1:Math.min(1,(timer+remainder)/P.DT);},
  render(){if(!active)return;const placed=[];B.camera.updateMatrixWorld(true);for(let i=0;i<pool.length;i++){const e=pool[i],cue=cues[i];cue.hidden=i>=count||e.dead>0;if(cue.hidden)continue;const pos=e.mesh.position,p=pos.clone().project(B.camera),local=pos.clone().applyMatrix4(B.camera.matrixWorldInverse),span=Math.max(B.plane.userData.dimensions.length,B.plane.userData.dimensions.wingspan)*8,diameter=Math.min(M.visual(pos.distanceTo(B.camera.position),B.camera.fov,innerHeight,span).diameter,Math.min(innerWidth,innerHeight)*.7),layout=M.separate(M.cue(p,local,innerWidth,innerHeight,diameter/2),placed,innerWidth,innerHeight);cue.style.transform=`translate3d(${layout.x}px,${layout.y}px,0) translate(-50%,-50%)`;cue.style.width=cue.style.height=(layout.inside?diameter:28)+'px';cue.classList.toggle('offscreen',!layout.inside);cue.classList.toggle('hunter',race.isHunter(e.id));cue.classList.toggle('labelAbove',layout.y+diameter/2+32>innerHeight-16);cue.querySelector('.netCueArrow').style.transform=`rotate(${layout.angle}rad)`;cue.querySelector('.netCueDistance').textContent=Math.round(pos.distanceTo(B.plane.position))+'m';cue.setAttribute('aria-label','人机 '+(i+1)+' · '+(race.isHunter(e.id)?'追击':'逃逸'));}
   const progress=$('netProgress'),target=race.lock.id===-1?B.plane:c.enemies[race.lock.id]?.mesh;progress.hidden=!target||race.lock.time<=0;if(!progress.hidden){const p=target.position.clone().project(B.camera);progress.hidden=p.z>1||Math.abs(p.x)>1||Math.abs(p.y)>1;progress.style.left=(p.x*.5+.5)*100+'%';progress.style.top=(-p.y*.5+.5)*100+'%';progress.style.width=progress.style.height='62px';progress.style.setProperty('--progress',Math.min(1,race.lock.time/P.LOCK)*360+'deg');progress.querySelector('span').textContent=race.lock.id===-1?'被锁定':Math.round(race.lock.time/P.LOCK*100)+'%';}
   $('netMessage').textContent=race.messageAge>0?race.message:'';drawMap();updateUI();
  }
 };
 function drawMap(){const canvas=$('mapCanvas'),ctx=canvas.getContext('2d'),world=B.world(),scale=78/(world.width/2);if(!mapBackground){mapBackground=document.createElement('canvas');mapBackground.width=mapBackground.height=180;const bg=mapBackground.getContext('2d');bg.fillStyle='#ead7bb';bg.fillRect(0,0,180,180);bg.strokeStyle='#988b76';bg.strokeRect(12,12,156,156);for(const route of world.plan.layers[3].routes){bg.beginPath();for(const p of route.curve.getSpacedPoints(12))bg.lineTo(90+p.x*scale,90+p.z*scale);bg.stroke();}}
  ctx.drawImage(mapBackground,0,0);for(const e of c.enemies)if(e.dead<=0)ChaseMap.drawArrow(ctx,{x:90+e.mesh.position.x*scale,y:90+e.mesh.position.z*scale,yaw:e.mesh.rotation.y,self:false,online:true,color:race.isHunter(e.id)?'#eb3154':'#c38a16'});ChaseMap.drawArrow(ctx,{x:90+B.plane.position.x*scale,y:90+B.plane.position.z*scale,yaw:B.plane.rotation.y,self:true,online:true,color:adapter.isHunter?'#eb3154':'#c38a16'});
 }
 window.paperSolo={start(n=0,choice,mode){if(active)return;window.dispatchEvent(new Event('paper-solo-start'));B.prepare(adapter,P.SEED);c.soloExperience=true;c.overlay.hidden=true;active=true;roleMode=mode==='fixed'?'fixed':'swap';selectScheme(choice);count=Math.max(0,Math.min(3,Number(n)||0));reset();B.ensureAudio();$('world').focus();},setCount(n){if(!active)return;configurePool(n);updateUI();},setRoleMode(mode){
  if(!active)return;
  roleMode=mode==='fixed'?'fixed':'swap';
  if(roleMode==='fixed'&&race.hunterId!==-1)setHunter(-1);
  updateUI();
 },setScheme(choice){if(active){selectScheme(choice);updateUI();}},reset,get state(){return {active,count,scheme,roleMode,isHunter:adapter.isHunter,hunter:race.hunterId,captures:race.captures,caught:race.caught};}};
 $('flightSoloStart').disabled=false;
})();
