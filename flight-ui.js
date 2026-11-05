/* Shared production flight shell; pointer input is sent through the existing server protocol. */
(()=>{'use strict';
 const $=id=>document.getElementById(id),B=window.paperBridge,M=FlightUIMath;if(!B)return;
 const mobile=matchMedia('(pointer:coarse)').matches;
 const settings={side:'left',autoFullscreen:true,quality:mobile?'balanced':$('quality').value,soloBots:0,soloScheme:"speed",soloRoleMode:"swap"};
 try{Object.assign(settings,JSON.parse(localStorage.getItem('paper-flight-ui-settings')||'{}'));}catch{}
 if(!['left','right'].includes(settings.side))settings.side='left';if(!['low','balanced','high','pixel'].includes(settings.quality))settings.quality='balanced';
 const save=()=>{try{localStorage.setItem('paper-flight-ui-settings',JSON.stringify(settings));}catch{}};
 let snapshot=null,menuOpen=false,phase='lobby',stickId=null,boostId=null,slowId=null,x=0,y=0,origin={x:0,y:0},entered=false,eventText='',eventAt=0,lastEvent=null,needsReload=false;const heldKeys=new Set();
 const shell=document.createElement('div');shell.id='flightShell';shell.innerHTML=`
 <div class="flight-toolbar"><button id="flightMenuButton" type="button" aria-label="打开游戏菜单">☰</button><div id="flightReadout"><b id="flightRole">联机追逐</b><span><strong id="flightSpeed">—</strong> m/s</span><small id="flightNetwork" hidden></small></div></div>
 <div id="flightSteerZone" aria-label="浮动方向摇杆触控区域"></div><div id="flightStick" hidden aria-hidden="true"><div id="flightKnob"></div></div>
 <div id="flightSpeedButtons"><button type="button" id="flightSlow" aria-pressed="false">减速</button><button type="button" id="flightBoost" aria-pressed="false">加速</button></div>
 <button type="button" id="flightEnter" hidden>进入飞行 · 全屏</button>
 <section id="flightMenu" role="dialog" aria-modal="true" aria-labelledby="flightMenuTitle" hidden><div class="flight-card"><div class="flight-card-head"><h2 id="flightMenuTitle">游戏菜单</h2><button type="button" id="flightClose" aria-label="关闭游戏菜单">×</button></div><div class="flight-tabs"><button type="button" id="flightRoomTab">房间</button><button type="button" id="flightSettingsTab">设置</button></div><div id="flightRoomPanel"></div><div id="flightSettingsPanel" hidden><div id="flightGameSettings"></div><label class="mobileOnly">摇杆位置<select id="flightSide"><option value="left">左手摇杆</option><option value="right">右手摇杆</option></select></label><label class="mobileOnly">进入飞行时全屏<input type="checkbox" id="flightAutoFullscreen"></label><details class="flight-help"><summary>操作与追逐规则</summary><p class="mobileOnly">按住选定半屏任意位置出现摇杆，滑动转向和俯仰，松手回中。另一侧按住加减速。</p><p class="desktopOnly">W/S 或方向键控制俯仰，A/D 转弯；Shift 加速，Ctrl 减速。Esc 打开菜单。</p><p>追击方在 50 米内、偏向不超过 25°、无遮挡时，持续锁定 2.3 秒自动发射导弹。捕获后双方换位。</p><p>红圈为追击机，金圈为逃逸机。飞机按原始大小显示，识别圈不改变碰撞与捕获范围。</p></details></div><div id="flightMenuNavigation"></div><p class="flight-note" id="flightMenuNote"></p><button type="button" id="flightResume">返回游戏</button></div></section>`;
 document.body.appendChild(shell);document.body.classList.add('flightUI');document.body.classList.toggle('flightMobile',mobile);
 const soloEntry=document.createElement('section');soloEntry.className='flight-solo-entry';soloEntry.innerHTML='<h3>个人体验</h3><div><label>人机<select id="flightSoloInitialCount"><option value="0">不加入 · 自己飞</option><option value="1">1 架</option><option value="2">2 架</option><option value="3">3 架</option></select></label><label>飞行参数<select id="flightSoloInitialScheme"><option value="speed">正式参数 · 随速度变化</option><option value="classic">原参数 · 低速对照</option></select></label><label>追逐方式<select id="flightSoloInitialRole"><option value="swap">捕获后互换</option><option value="fixed">始终由我追击</option></select></label><button type="button" id="flightSoloStart" disabled>开始体验</button></div><small>立即起飞，无需创建房间。</small><p id="flightSoloError" role="alert" hidden></p>';$('netLobby').querySelector('h2').after(soloEntry);
 const upgrade=document.createElement('section');upgrade.id='flightUpgrade';upgrade.hidden=true;upgrade.innerHTML='<div><h2>游戏已更新</h2><p>刷新页面后继续，避免客户端与服务器的飞行规则不一致。</p><button type="button">刷新游戏</button></div>';document.body.append(upgrade);upgrade.querySelector('button').onclick=()=>location.reload();
 try{if(!localStorage.getItem('paper-flight-name-cleanup-v5')){if($('netName').value==='界面验收'){$('netName').value='';localStorage.removeItem('paper-chase-name');}localStorage.setItem('paper-flight-name-cleanup-v5','1');}}catch{}
 const lobby=$('netLobby'),lobbyFrame=document.createElement('div');lobbyFrame.id='flightLobbyFrame';lobby.before(lobbyFrame);lobbyFrame.append(lobby);
 const card=$('flightMenu').querySelector('.flight-card'),cardScroll=document.createElement('div');cardScroll.className='flight-card-scroll';while(card.firstChild)cardScroll.append(card.firstChild);card.append(cardScroll);
 document.body.dataset.stickSide=settings.side;
 const zone=$('flightSteerZone'),stick=$('flightStick'),knob=$('flightKnob');
 $('flightRoomPanel').append($('netRoom'));$('flightMenuNavigation').append($('netNavigation'));
 const soloPanel=document.createElement('div');soloPanel.id='flightSoloPanel';soloPanel.hidden=true;soloPanel.innerHTML='<p id="flightSoloSummary"></p><label>人机数量<select id="flightSoloCount"><option value="0">不加入 · 自己飞</option><option value="1">1 架</option><option value="2">2 架</option><option value="3">3 架</option></select></label><label>飞行参数<select id="flightSoloScheme"><option value="speed">正式参数 · 随速度变化</option><option value="classic">原参数 · 低速对照</option></select></label><label>追逐方式<select id="flightSoloRole"><option value="swap">捕获后互换</option><option value="fixed">始终由我追击</option></select></label><div class="flight-extras"><button type="button" id="flightSoloReset">重新开始</button><button type="button" id="flightSoloExit">返回入口</button></div>';$('flightRoomPanel').append(soloPanel);
 $('flightRoomTab').disabled=true;
 for(const [id,title] of [['skin','飞机外观'],['quality','画质'],['motion','镜头动感']]){const label=document.createElement('label');label.append(document.createTextNode(title),$(id));$('flightGameSettings').append(label);}
 const extras=document.createElement('div');extras.className='flight-extras';extras.append($('sound'),$('fullscreen'));$('flightGameSettings').append(extras);
 const performanceLabel=document.createElement('p');performanceLabel.id='flightPerformance';performanceLabel.className='flight-note';$('flightGameSettings').append(performanceLabel);
 const fpsReadout=document.createElement('small');fpsReadout.id='flightFrameRate';$('flightReadout').append(fpsReadout);
 function release(el,id){try{if(id!==null&&el.hasPointerCapture?.(id))el.releasePointerCapture(id);}catch{}}
 function clear(clearKeyboard=true){const ids=[stickId,boostId,slowId];stickId=boostId=slowId=null;x=y=0;stick.hidden=true;knob.style.transform='translate(0px,0px)';$('flightBoost').setAttribute('aria-pressed','false');$('flightSlow').setAttribute('aria-pressed','false');release(zone,ids[0]);release($('flightBoost'),ids[1]);release($('flightSlow'),ids[2]);if(clearKeyboard){heldKeys.clear();B.clearKeys();}}
 function ready(){return mobile&&!menuOpen&&phase==='flying'&&!document.hidden;}
 function point(e){const radius=stick.getBoundingClientRect().width/2-25;let dx=(e.clientX-origin.x)/radius,dy=(e.clientY-origin.y)/radius,length=Math.hypot(dx,dy);if(length>1){dx/=length;dy/=length;}x=dx;y=dy;knob.style.transform=`translate(${dx*radius}px,${dy*radius}px)`;}
 zone.addEventListener('pointerdown',e=>{if(!ready()||stickId!==null||e.button>0)return;if((e.clientX<innerWidth/2)!==(settings.side==='left'))return;e.preventDefault();stickId=e.pointerId;origin={x:e.clientX,y:e.clientY};stick.style.left=e.clientX+'px';stick.style.top=e.clientY+'px';stick.hidden=false;zone.setPointerCapture(e.pointerId);point(e);});
 zone.addEventListener('pointermove',e=>{if(e.pointerId===stickId){e.preventDefault();point(e);}});
 const endStick=e=>{if(e.pointerId!==stickId)return;const id=stickId;stickId=null;x=y=0;stick.hidden=true;knob.style.transform='translate(0px,0px)';release(zone,id);};
 for(const t of ['pointerup','pointercancel','lostpointercapture'])zone.addEventListener(t,endStick);
 for(const [id,kind] of [['flightBoost','boost'],['flightSlow','slow']]){const b=$(id);b.addEventListener('pointerdown',e=>{if(!ready()||b.disabled||e.button>0||(kind==='boost'?boostId:slowId)!==null)return;e.preventDefault();b.setPointerCapture(e.pointerId);if(kind==='boost')boostId=e.pointerId;else slowId=e.pointerId;b.setAttribute('aria-pressed','true');});const end=e=>{if(kind==='boost'&&boostId===e.pointerId)boostId=null;else if(kind==='slow'&&slowId===e.pointerId)slowId=null;else return;b.setAttribute('aria-pressed','false');};for(const t of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(t,end);}
 function selectPanel(tab){$('flightRoomPanel').hidden=tab!=='room';$('flightSettingsPanel').hidden=tab!=='settings';$('flightRoomTab').setAttribute('aria-pressed',String(tab==='room'));$('flightSettingsTab').setAttribute('aria-pressed',String(tab==='settings'));}
 function open(tab=snapshot?'room':'settings'){clear();menuOpen=true;$('flightMenu').hidden=false;document.body.classList.add('flightMenuOpen');$('netRoom').open=true;selectPanel(tab);$('flightClose').focus();}
 function close(){clear();menuOpen=false;$('flightMenu').hidden=true;document.body.classList.remove('flightMenuOpen');$('world').focus();}
 async function fullscreen(){try{if(!document.fullscreenElement)await document.documentElement.requestFullscreen({navigationUI:'hide'});if(mobile)try{await screen.orientation?.lock?.('landscape');}catch{}}catch{} }
 function enter(){entered=true;if(mobile&&settings.autoFullscreen)void fullscreen();close();}
 $('flightMenuButton').onclick=()=>open();$('flightClose').onclick=close;$('flightResume').onclick=enter;$('flightEnter').onclick=enter;
 $('flightRoomTab').onclick=()=>selectPanel('room');$('flightSettingsTab').onclick=()=>selectPanel('settings');
 if(settings.soloRoleMode!=='fixed')settings.soloRoleMode='swap';
 $('flightSoloInitialRole').value=settings.soloRoleMode;
 const chooseRole=e=>{
  settings.soloRoleMode=e.target.value;save();
  $('flightSoloInitialRole').value=settings.soloRoleMode;
  window.paperSolo?.setRoleMode(settings.soloRoleMode);
 };
 $('flightSoloInitialRole').onchange=chooseRole;
 $('flightSoloRole').onchange=chooseRole;
 if(settings.soloScheme!=='classic')settings.soloScheme='speed';
 $('flightSoloInitialScheme').value=settings.soloScheme;
 const chooseScheme=e=>{settings.soloScheme=e.target.value;save();$('flightSoloInitialScheme').value=settings.soloScheme;window.paperSolo?.setScheme(settings.soloScheme);};
 $('flightSoloInitialScheme').onchange=chooseScheme;$('flightSoloScheme').onchange=chooseScheme;
 $('flightSoloInitialCount').value=String(Math.max(0,Math.min(3,Number(settings.soloBots)||0)));
 $('flightSoloStart').onclick=()=>{clear();entered=true;B.ensureAudio();if(mobile&&settings.autoFullscreen)void fullscreen();const button=$('flightSoloStart');button.disabled=true;button.textContent='准备中…';requestAnimationFrame(()=>{try{settings.soloBots=Number($('flightSoloInitialCount').value);save();window.paperSolo.start(settings.soloBots,settings.soloScheme,settings.soloRoleMode);$('flightSoloError').hidden=true;}catch(e){$('flightSoloError').hidden=false;$('flightSoloError').textContent='未能开始个人体验，请刷新重试。';console.error(e);}finally{button.disabled=false;button.textContent='开始体验';}});};
 $('flightSoloCount').onchange=e=>{settings.soloBots=Number(e.target.value);save();window.paperSolo?.setCount(settings.soloBots);};$('flightSoloReset').onclick=()=>window.paperSolo?.reset();$('flightSoloExit').onclick=()=>location.assign('/chase/');
 $('fullscreen').onclick=()=>{if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});else void fullscreen();};
 $('flightSide').value=settings.side;$('flightSide').onchange=e=>{clear();settings.side=e.target.value==='right'?'right':'left';document.body.dataset.stickSide=settings.side;save();};
 $('flightAutoFullscreen').checked=settings.autoFullscreen;$('flightAutoFullscreen').onchange=e=>{settings.autoFullscreen=e.target.checked;save();};
 $('quality').addEventListener('change',()=>{settings.quality=$('quality').value;save();});
 const applyDefaults=()=>{$('quality').value=settings.quality;$('quality').dispatchEvent(new Event('change'));$('motion').value='0';$('motion').dispatchEvent(new Event('change'));};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',applyDefaults,{once:true});else applyDefaults();
 document.addEventListener('click',e=>{if(e.target.closest?.('#netStart')&&!e.target.closest('#netStart').disabled&&!snapshot?.state.running){entered=true;if(mobile&&settings.autoFullscreen)void fullscreen();}},true);
 const keyCodes=new Set(['KeyW','KeyI','ArrowUp','KeyS','KeyK','ArrowDown','KeyA','KeyJ','ArrowLeft','KeyD','KeyL','ArrowRight','ShiftLeft','ShiftRight','ControlLeft','ControlRight']);
 const held=(...codes)=>codes.some(code=>heldKeys.has(code));
 const editing=e=>e.composedPath().some(n=>n?.nodeType===1&&(n.matches?.('input,select,textarea,[contenteditable="true"],dialog')||n.closest?.('dialog[open]')));
 document.addEventListener('keydown',e=>{if(editing(e))return;if(e.code==='Escape'){e.preventDefault();e.stopImmediatePropagation();if(menuOpen)close();else open();return;}if(menuOpen||needsReload){e.stopImmediatePropagation();return;}if(phase==='flying'&&keyCodes.has(e.code)){e.preventDefault();e.stopImmediatePropagation();heldKeys.add(e.code);}},true);
 document.addEventListener('keyup',e=>{heldKeys.delete(e.code);},true);
 window.addEventListener('blur',()=>{clear();if(snapshot?.solo)open('room');});document.addEventListener('visibilitychange',()=>clear());window.addEventListener('pagehide',()=>clear());window.addEventListener('resize',()=>clear(false));screen.orientation?.addEventListener?.('change',()=>clear());
 window.paperFlightUI={clear,open,get localPaused(){return menuOpen||document.hidden||needsReload;},requireReload(){needsReload=true;clear();upgrade.hidden=false;},input(base){if(needsReload||menuOpen||document.hidden||phase!=='flying')return {left:0,right:0,pitch:0,boost:false,slow:false};const turn=-M.axis(x),pitch=-M.axis(y),left=Number(held('KeyA','KeyJ','ArrowLeft')),right=Number(held('KeyD','KeyL','ArrowRight')),vertical=Number(held('KeyW','KeyI','ArrowUp'))-Number(held('KeyS','KeyK','ArrowDown'));return {left:Math.max(Number(base.left)||0,left,Math.max(0,turn)),right:Math.max(Number(base.right)||0,right,Math.max(0,-turn)),pitch:M.clamp((Number(base.pitch)||0)+pitch+vertical,-1,1),boost:!!snapshot?.isHunter&&(!!base.boost||boostId!==null||held('ShiftLeft','ShiftRight')),slow:!!base.slow||slowId!==null||held('ControlLeft','ControlRight')};},
 update(value){const prior=snapshot;snapshot=value;const {state,me,isHunter,connected,rtt}=value;const next=!connected||state.waiting||state.frozen?'frozen':state.running?'flying':'room';if(next!==phase){clear();phase=next;document.body.dataset.flightPhase=phase;if(phase==='room')open('room');else if(phase==='flying')close();}if(prior?.isHunter!==isHunter)clear(false);
  document.body.dataset.flightMode=value.solo?'solo':'online';$('flightSoloPanel').hidden=!value.solo;$('netRoom').hidden=!!value.solo;$('flightRoomTab').textContent=value.solo?'个人体验':'房间';if(value.solo){$('flightSoloRole').value=value.roleMode;$('flightSoloScheme').value=value.scheme;$('flightSoloCount').value=String(value.botCount);$('flightSoloSummary').textContent=value.botCount?`${value.botCount} 架人机 · 捕获 ${value.captures} / 被捕获 ${value.caught}`:'独自飞行';}
  $('flightRoomTab').disabled=false;$('flightBoost').disabled=!isHunter;$('flightRole').textContent=isHunter?'追击':'逃逸';$('flightRole').dataset.role=isHunter?'hunter':'runner';$('flightSpeed').textContent=B.state.speed.toFixed(0);$('flightNetwork').hidden=rtt<220;$('flightNetwork').textContent=rtt+' ms';$('flightEnter').hidden=!mobile||entered||phase!=='flying'||menuOpen;
  if(value.solo&&value.botCount===0){$('flightRole').textContent='自由飞行';$('flightRole').dataset.role='free';}
  const fps=$('fps')?.textContent?.match(/\d+\s*FPS/)?.[0]||'测量帧率中';if($('flightFrameRate').textContent!==fps)$('flightFrameRate').textContent=fps;$('flightPerformance').textContent=fps+(value.solo?' · 本地个人体验':` · 往返 ${rtt} ms`);
  $('flightMenuNote').textContent=value.solo?(menuOpen?'个人体验已暂停。':''):phase==='flying'?'联机比赛继续进行。':phase==='frozen'?$('netFreezeText').textContent:'';
  $('netMessage').classList.toggle('flightEventVisible',false);const text=$('netMessage').textContent;if(text!==eventText){eventText=text;eventAt=performance.now();}const warning=$('netMessage').classList.contains('error');$('netMessage').classList.toggle('flightEventVisible',!!text&&(warning||performance.now()-eventAt<3500)&&!menuOpen&&phase==='flying');
  $('netCaptureStatus').hidden=true;document.body.dataset.flightReady=String(phase==='flying');
 }};
 document.body.dataset.flightPhase='lobby';document.body.dataset.flightUiReady='true';
 if(location.hash==='#solo')requestAnimationFrame(()=>{$('flightSoloStart').scrollIntoView({block:'center'});$('flightSoloStart').focus();});
})();
