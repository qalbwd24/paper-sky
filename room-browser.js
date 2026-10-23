/* Shared safe-metadata lobby, independent of administrator APIs and game state. */
(() => {
 'use strict';
 const assets=new URL('.',document.currentScript.src);
 const games={quoridor:{base:'/quoridor/',capacity:2,session:true},v1:{base:'/racer/v1/',api:'/racer/api/lobby?version=v1',capacity:2,key:'paper-race-online:v1'},v2:{base:'/racer/v2/',api:'/racer/api/lobby?version=v2',capacity:2,key:'paper-race-online:v2'},chase:{base:'/chase/',capacity:4,session:true},poker:{base:'/poker/',capacity:8,key:'river-seat'}};
 const element=(tag,text,className)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(className)n.className=className;return n;};
 class RoomBrowser extends HTMLElement {
  connectedCallback(){
   this.generation=(this.generation||0)+1;
   if(!this.shadowRoot){
    this.attachShadow({mode:'open'}).innerHTML=`<link rel="stylesheet" href="${new URL('room-browser.css',assets)}"><section aria-label="现有房间"><header><div><h2>现有房间</h2></div><button class="refresh" type="button">刷新房间</button></header><div class="toolbar"><label><input type="checkbox">只看可加入</label><span class="count"></span></div><p class="notice" role="status">正在读取房间…</p><div class="rooms"></div><p class="foot">每 5 秒更新 · 点击加入才会占座。邀请房间请使用朋友分享的链接或房间码。</p></section>`;
    this.shadowRoot.querySelector('.refresh').onclick=()=>this.load();this.shadowRoot.querySelector('input').onchange=()=>this.paint();
    if(this.hasAttribute('creatable')){const b=element('button','创建房间','create');b.type='button';b.onclick=()=>this.onCreate?.();this.shadowRoot.querySelector('header').append(b);}
   }
   this.load();clearInterval(this.timer);this.timer=setInterval(()=>{if(!document.hidden&&this.getClientRects().length)this.load();},5000);
  }
  disconnectedCallback(){clearInterval(this.timer);this.generation++;this.controller?.abort();this.busy=false;}
  async load(){
   if(this.busy||this.joining)return;const spec=games[this.getAttribute('game')];if(!spec)return;
   this.busy=true;const generation=this.generation,controller=this.controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000),fetchOptions={credentials:'same-origin',cache:'no-store',signal:controller.signal};
   try{
    if(spec.session){const r=await fetch(spec.base+'api/session',fetchOptions);if(!r.ok)throw Error('连接未建立，请登录游戏后刷新。');}
    const headers={};if(spec.key){try{const seat=JSON.parse(sessionStorage.getItem(spec.key));if(seat?.token)headers['X-Player-Token']=seat.token;}catch{}}
    const response=await fetch(spec.api||spec.base+'api/lobby',{...fetchOptions,headers});if(!response.ok)throw Error(response.status===401?'请先登录，再刷新房间。':'房间列表暂不可用，请刷新重试。');
    const data=await response.json();if(!Array.isArray(data.rooms))throw Error('房间响应格式错误。');if(generation!==this.generation)return;
    this.rooms=data.rooms;this.paint();this.notice(this.rooms.length?'':'还没有房间。创建一间，等朋友加入。');
   }catch(e){if(generation!==this.generation)return;this.rooms=[];this.paint();this.notice(e.name==='AbortError'?'读取超时，请刷新重试。':e.message);}
   finally{clearTimeout(timer);if(generation===this.generation)this.busy=false;}
  }
  notice(text){this.shadowRoot.querySelector('.notice').textContent=text;}
  paint(){
   const root=this.shadowRoot,list=root.querySelector('.rooms'),rooms=this.rooms||[],spec=games[this.getAttribute('game')];
   const signature=JSON.stringify([rooms,root.querySelector('input').checked,this.joining]);if(signature===this.painted)return;this.painted=signature;
   list.replaceChildren();root.querySelector('.count').textContent=`${rooms.length} 间房 · ${rooms.filter(r=>r.joinable).length} 间可加入`;
   const filtered=rooms.filter(r=>!root.querySelector('input').checked||r.joinable||r.mine);if(rooms.length&&!filtered.length)list.append(element('p','暂无可加入的房间，可以创建新房间。'));
   for(const room of filtered){
    const capacity=Math.min(8,Math.max(2,Number(room.capacity)||spec.capacity)),card=element('article',undefined,'room');card.dataset.room=room.id;
    const top=element('div',undefined,'room-top');top.append(element('h3',room.name||'朋友的房间'),element('span',({waiting:'等待加入',ready:'选择起点',playing:'进行中',ended:'已结束'})[room.phase]||'等待中','badge '+(room.phase==='waiting'?'waiting':room.phase==='ended'?'ended':'playing')));
    const code=element('p',`${room.public===false?'邀请房间':'房间 '+String(room.id).slice(0,8)} · ${room.count} / ${capacity} 人${room.mine?' · 你在这里':''}`,'code'),seats=element('div',undefined,'seats');
    for(let i=0;i<capacity;i++){const p=room.players?.[i],seat=element('div',undefined,'seat '+(p?'occupied':'empty'));seat.append(element('span',p?'●':'＋','pawn '+(i%2?'orange':'blue')),element('span',p?`${p.name} · ${p.online?'在线':'离线'}`:'空位'));seats.append(seat);}
    const join=element('button',room.mine?'返回房间':room.joinable?(room.phase==='playing'?'加入 · 本局进行中':'加入房间'):room.count>=capacity?'已满 · 席位保留':room.public===false?'仅限邀请':'暂不可加入','join');join.type='button';join.disabled=this.joining||(!room.joinable&&!room.mine);
    join.onclick=async()=>{if(this.joining)return;this.joining=true;this.paint();this.notice('正在加入…');try{if(this.onJoin)await this.onJoin(room);else location.assign(spec.base+'#room='+encodeURIComponent(room.id)+'&join=1');this.notice('');}catch(e){this.notice(e.message);}finally{this.joining=false;this.painted=null;this.paint();}};
    card.append(top,code,seats,join);list.append(card);
   }
  }
 }
 if(!customElements.get('room-browser'))customElements.define('room-browser',RoomBrowser);
})();
