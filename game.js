/* ================================================================
   ลงกา · วิถีแห่งกรรม — 8-bit Roguelike (ออฟไลน์ 100%)
   ระบบ: ดันเจี้ยนสุ่ม / เทิร์นเบส / เลเวล / ของ / ร้านค้า / เควสต์
         อาคม / กรรม-ปุญ / บอส / มินิแมป / เซฟ-โหลด / เสียงชิปจูน
   ================================================================ */
'use strict';
/* ── พื้นฐาน ── */
const $=id=>document.getElementById(id);
const W=42,H=32,VW=20,VH=15,T=16,FINAL=20,SAVE_KEY='lanka_save_v1',HALL_KEY='lanka_hall_v1';
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);
  t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
let rng=Math.random, floorR=Math.random;
const R=n=>Math.floor(rng()*n), pick=a=>a[R(a.length)], clamp=(v,a,b)=>v<a?a:v>b?b:v;
function thaiNum(n){return String(n).replace(/\d/g,d=>'๐๑๒๓๔๕๖๗๘๙'[d])}
function frange(list,fn){for(let i=0;i<list.length;i++)fn(list[i])}

const cv=$('game'),ctx=cv.getContext('2d');ctx.imageSmoothingEnabled=false;
const mcv=$('minimap'),mctx=mcv.getContext('2d');
const stage=$('stage'),logEl=$('log');

/* ── เสียง (WebAudio) ── */
let AC=null,soundOn=true,droneNodes=null;
function initAudio(){
  if(AC){if(AC.state==='suspended')AC.resume();return;}
  AC=new (window.AudioContext||window.webkitAudioContext)();
  startDrone();
}
function startDrone(){ // เสียงพื้นแทนปูรา
  if(!AC||droneNodes)return;
  const g=AC.createGain();g.gain.value=.028;g.connect(AC.destination);
  const o1=AC.createOscillator(),o2=AC.createOscillator(),o3=AC.createOscillator();
  o1.type='sawtooth';o1.frequency.value=65.4;
  o2.type='sine';o2.frequency.value=98;
  o3.type='sine';o3.frequency.value=130.8;
  const lfo=AC.createOscillator(),lg=AC.createGain();
  lfo.frequency.value=.13;lg.gain.value=.013;lfo.connect(lg);lg.connect(g.gain);
  [o1,o2,o3,lfo].forEach(o=>o.start());
  droneNodes={g,os:[o1,o2,o3,lfo]};
}
function beep(f,d=.09,type='square',v=.13,slide=0){
  if(!AC||!soundOn)return;
  const o=AC.createOscillator(),g=AC.createGain();
  o.type=type;o.frequency.value=f;
  if(slide)o.frequency.linearRampToValueAtTime(Math.max(30,f+slide),AC.currentTime+d);
  g.gain.value=v;g.gain.exponentialRampToValueAtTime(.001,AC.currentTime+d);
  o.connect(g);g.connect(AC.destination);o.start();o.stop(AC.currentTime+d);
}
const sfx={
  hit:()=>beep(170,.07,'square',.15,-70),
  hurt:()=>beep(110,.2,'sawtooth',.18,-50),
  pick:()=>{beep(660,.06,'triangle',.12);setTimeout(()=>beep(880,.08,'triangle',.12),60)},
  gold:()=>{beep(988,.05,'triangle',.12);setTimeout(()=>beep(1319,.09,'triangle',.12),50)},
  level:()=>[523,659,784,1047].forEach((f,i)=>setTimeout(()=>beep(f,.12,'square',.13),i*90)),
  cast:()=>beep(392,.22,'triangle',.15,220),
  stairs:()=>beep(200,.35,'triangle',.15,-130),
  dead:()=>[220,185,147,110].forEach((f,i)=>setTimeout(()=>beep(f,.22,'sawtooth',.15),i*170)),
  boss:()=>beep(65,.6,'sawtooth',.25,-25),
  buy:()=>beep(784,.1,'triangle',.13),
};
function toggleSound(){
  soundOn=!soundOn;
  if(droneNodes)droneNodes.g.gain.value=soundOn?.028:0;
  $('btnSnd').textContent=soundOn?'♪':'✕';
}

/* ── สไปรต์ 8 บิต (วาดจากโค้ด) ── */
const PAL={k:'#14080f',w:'#f4ecdc',g:'#f5c542',o:'#ff8b1f',r:'#d43d2a',t:'#2ec4a6',
  b:'#3a6ea5',p:'#8d55c9',s:'#e8b06a',d:'#7a4a22',f:'#ffe9a3',e:'#43b05c',
  m:'#8f2438',E:'#7fae7a',c:'#c9a86a','0':'#000000'};
const SPRD={
warrior:["..gggg..","..ssss..","..skks..",".ggrrgg.",".g.rr.g.","..rrrr..","..ww.ww.","..d..d.."],
brahmin:["...ww...","..wwww..","..ssss..","..skks..",".wwwwww.",".wwooww.","..wwww..","..d..d.."],
vanara: [".w....w.",".wwwwww.",".wkwwkw.","..wssw..",".gggggg.",".g.ww.g.","..wwww..","..w..w.."],
rishi:  ["..kkkk..","..ssss..","..skks..",".wwwwww.",".oooooo.",".o.oo.o.","..oooo..","..d..d.."],
preta:  ["..EEEE..","..E00E..","...EE...","..E..E..","..E..E..","...EE...","..E..E..",".E....E."],
asura:  [".r....r.",".rrrrrr.",".rgrrgr.",".rrrrrr.",".mmmmmm.",".m.mm.m.","..mmmm..","..r..r.."],
naga:   [".tt..tt.","tttttttt","tgttttgt",".tttttt.","..tttt..","..t..t..","..t..t..","...tt..."],
rakshasa:[".p....p.",".pppppp.",".pgppgp.",".ppwwpp.",".pppppp.",".p.pp.p.","..pppp..","..p..p.."],
yaksha: ["..gggg..","..eeee..","..e00e..",".gggggg.",".g.rr.g.","..rrrr..","..e..e..","..d..d.."],
boss:   [".g.gg.g.",".gggggg.","..eeee..","..e00e..","..ewwe..",".rrrrrr.",".r.rr.r.","..r..r.."],
merchant:["..oooo..","..oooo..","..ssss..","..skks..",".gggggg.",".g.gg.g.","..oooo..","..d..d.."],
hermit: ["..kkkk..","..ssss..","..skks..",".wwwwww.",".oooooo.",".o.oo.o.","..oooo..","........"],
pot:    ["...ww...","...ww...","..rrrr..",".rrwwrr.",".rrrrrr.","..rrrr..","........","........"],
mana:   ["...ww...","...ww...","..tttt..",".ttwwtt.",".tttttt.","..tttt..","........","........"],
gold:   ["........","........","..gggg..",".gffffg.",".gffffg.","..gggg..","........","........"],
wpn:    ["....w...","....w...","....w...","....w...","...ggg..","....d...","....d...","........"],
arm:    ["........",".cc..cc.",".cccccc.",".cccccc.",".c.cc.c.","..cccc..","..cccc..","........"],
scr:    ["........",".wwwwww.",".wkkkkw.",".wwwwww.",".wkkkkw.",".wwwwww.","........","........"],
};
const SPR={};
for(const name in SPRD){
  const c=document.createElement('canvas');c.width=8;c.height=8;
  const g=c.getContext('2d');
  SPRD[name].forEach((row,y)=>{for(let x=0;x<8;x++){const ch=row[x];
    if(ch!=='.'&&PAL[ch]){g.fillStyle=PAL[ch];g.fillRect(x,y,1,1);}}});
  SPR[name]=c;
}
function drawSpr(s,dx,dy,w=16,h=16){ctx.drawImage(SPR[s],0,0,8,8,dx,dy,w,h)}

/* ── แผ่นกระเบื้อง (วาดแบบสุ่มมีพื้นผิว) ── */
const TILEC=[];
(function(){
  for(const v of [0,1]){
    const c=document.createElement('canvas');c.width=T;c.height=T;const g=c.getContext('2d');
    g.fillStyle='#54372a';g.fillRect(0,0,T,T);
    g.fillStyle='#3d2418';
    g.fillRect(0,3,T,1);g.fillRect(0,11,T,1);
    for(let x=(v?6:2);x<T;x+=7)g.fillRect(x,0,1,3);
    for(let x=(v?2:9);x<T;x+=7)g.fillRect(x,4,1,7);
    for(let x=(v?8:4);x<T;x+=7)g.fillRect(x,12,1,4);
    g.fillStyle='#6b4634';g.fillRect(0,0,T,1);
    TILEC[0]=TILEC[0]||[];TILEC[0].push(c);
  }
  for(const v of [0,1]){
    const c=document.createElement('canvas');c.width=T;c.height=T;const g=c.getContext('2d');
    g.fillStyle='#241322';g.fillRect(0,0,T,T);
    g.fillStyle='#2e1a2c';
    for(let i=0;i<7;i++)g.fillRect((v*5+i*5)%15,(i*7+v*3)%15,1,1);
    if(v){g.fillStyle='#5c4a1e';g.fillRect(11,5,1,1);}
    TILEC[1]=TILEC[1]||[];TILEC[1].push(c);
  }
  {const c=document.createElement('canvas');c.width=T;c.height=T;const g=c.getContext('2d');
   g.fillStyle='#0b0512';g.fillRect(0,0,T,T);
   g.strokeStyle='#2ec4a6';g.beginPath();g.arc(8,8,5,0,5);g.stroke();
   g.strokeStyle='#f5c542';g.beginPath();g.arc(8,8,2.5,1,6);g.stroke();
   g.fillStyle='#f5c542';g.fillRect(7,7,2,2);TILEC[2]=[c];}
  {const c=document.createElement('canvas');c.width=T;c.height=T;const g=c.getContext('2d');
   g.fillStyle='#241322';g.fillRect(0,0,T,T);
   g.fillStyle='#6e1f2b';g.fillRect(2,9,12,6);
   g.fillStyle='#8f2438';g.fillRect(3,10,10,1);
   g.fillStyle='#f5c542';g.fillRect(3,8,10,1);g.fillRect(6,4,4,5);g.fillRect(7,2,2,2);
   TILEC[3]=[c];}
  {const c=document.createElement('canvas');c.width=T;c.height=T;const g=c.getContext('2d');
   g.fillStyle='#241322';g.fillRect(0,0,T,T);
   g.fillStyle='#4a1620';g.fillRect(2,9,12,6);g.fillStyle='#7a5a10';g.fillRect(6,4,4,5);
   TILEC[4]=[c];}
})();

/* ── ตารางข้อมูล ── */
const CLASSES={
  ksatriya:{name:'กษัตริย์',sprite:'warrior',hp:30,mp:8,atk:6,def:3,dodge:5,
    mantras:['vajra@3'],desc:'ทายาทกรุงอโยธยา — เลือดและโจมตีสูงสุด'},
  brahmin:{name:'พราหมณ์',sprite:'brahmin',hp:20,mp:20,atk:4,def:2,dodge:5,
    mantras:['agni','heal'],desc:'ผู้ถือมนตรา เริ่มด้วยอัคนีและอมฤต'},
  vanara:{name:'วานร',sprite:'vanara',hp:24,mp:10,atk:5,def:2,dodge:20,
    mantras:['vaju@3'],desc:'ทหารลิงผู้ว่องไว หลบหลีก ๒๐%'},
  rishi:{name:'ฤๅษี',sprite:'rishi',hp:22,mp:16,atk:3,def:2,dodge:8,
    mantras:['heal','agni@4'],desc:'นักพรตแห่งป่าทัณฑก สมดุลทุกด้าน'},
};
const MANTRAS={
  agni:{n:'อัคนี',mp:5,ic:'✹',d:'เพลิงสังหารศัตรูที่มองเห็น'},
  heal:{n:'อมฤต',mp:6,ic:'✚',d:'ฟื้นฟู ๑๐ + ๒×เลเวล'},
  vaju:{n:'วายุ',mp:8,ic:'❋',d:'พายุรอบตัว รัศมี ๒ ช่อง'},
  vajra:{n:'วัชระ',mp:12,ic:'⌁',d:'สายฟ้าพระอินทร์ โจมตีรุนแรง'},
};
const FOES=[
  {id:'preta',name:'เปรต',sprite:'preta',hp:8,atk:4,def:0,xp:6,g:3,min:1,max:7},
  {id:'asura',name:'อสุรกาย',sprite:'asura',hp:14,atk:6,def:1,xp:11,g:5,min:2,max:12},
  {id:'naga',name:'นาคพิษ',sprite:'naga',hp:12,atk:5,def:1,xp:13,g:6,min:3,max:13,ranged:true},
  {id:'rakshasa',name:'รากษส',sprite:'rakshasa',hp:22,atk:8,def:2,xp:19,g:9,min:6,max:16},
  {id:'yaksha',name:'ยักษ์ทวารบาล',sprite:'yaksha',hp:32,atk:10,def:3,xp:27,g:13,min:9,max:18},
];
const BOSSES={
  5:{name:'พญาขร',sprite:'rakshasa',hp:65,atk:9,def:2,xp:70},
  10:{name:'มารีศ',sprite:'asura',hp:110,atk:12,def:3,xp:120},
  15:{name:'กุมภกรรณ',sprite:'yaksha',hp:170,atk:15,def:5,xp:180},
  20:{name:'ทศกัณฐ์',sprite:'boss',hp:260,atk:19,def:6,xp:0},
};
const WEAPONS=[null,{n:'ขรรค์เหล็ก',a:2},{n:'ขรรค์อัคนี',a:4},{n:'ตรีศูล',a:7},
  {n:'วัชระ',a:10},{n:'จักรสุทรรศน์',a:14}];
const ARMORS=[null,{n:'ผ้ามัสลิน',d:1},{n:'เกราะโซ่',d:3},{n:'เกราะเกล็ดนาค',d:5},
  {n:'เกราะวัชรัง',d:8},{n:'เกราะเทพ',d:11}];
const FLOOR_TITLES=['ประตูวิหาร','โถงเทียน','ระเบียงอสูร','คุกเปรต','ลานรากษส','ห้องมนตรา','อุโมงค์นาค','ท้องพระโรง'];

/* ── สถานะเกม ── */
let state='title',map,seen,vis,player=null,enemies=[],npcs=[],items=[];
let floor=1,seed=0,stairs={x:0,y:0,locked:false},kills={},time=0;
let shake=0,flash=0,floats=[],logs=[];

/* ── สร้างดันเจี้ยน ── */
function genFloor(fl){
  floor=fl;floorR=mulberry32((seed^(fl*2654435761))>>>0);
  map=new Uint8Array(W*H);seen=new Uint8Array(W*H);vis=new Uint8Array(W*H);
  enemies=[];npcs=[];items=[];kills={};
  const rooms=[];
  for(let i=0;i<70&&rooms.length<10;i++){
    const w=4+Math.floor(floorR()*7),h=3+Math.floor(floorR()*5);
    const x=1+Math.floor(floorR()*(W-w-2)),y=1+Math.floor(floorR()*(H-h-2));
    if(rooms.some(r=>x<r.x+r.w+1&&x+w+1>r.x&&y<r.y+r.h+1&&y+h+1>r.y))continue;
    rooms.push({x,y,w,h,cx:x+(w>>1),cy:y+(h>>1)});
  }
  const carve=(x,y)=>{if(x>0&&y>0&&x<W-1&&y<H-1)map[y*W+x]=1;};
  rooms.forEach(r=>{for(let yy=r.y;yy<r.y+r.h;yy++)for(let xx=r.x;xx<r.x+r.w;xx++)map[yy*W+xx]=1;});
  for(let i=1;i<rooms.length;i++){
    const a=rooms[i-1],b=rooms[i];let x=a.cx,y=a.cy;
    while(x!==b.cx){carve(x,y);x+=Math.sign(b.cx-x);}
    while(y!==b.cy){carve(x,y);y+=Math.sign(b.cy-y);}
    carve(x,y);
  }
  const fr=rooms[0],lr=rooms[rooms.length-1];
  player.x=fr.cx;player.y=fr.cy;
  stairs={x:lr.cx,y:lr.cy,locked:!!BOSSES[fl]};
  map[stairs.y*W+stairs.x]=2;
  for(const r of rooms.slice(1,-1)){ // เทวาลัย
    if(floorR()<.2){map[(r.y+1)*W+r.x+1]=3;}
  }
  const nItems=5+Math.floor(floorR()*4);
  for(let i=0;i<nItems;i++){
    const r=rooms[1+Math.floor(floorR()*(rooms.length-1))];
    const x=r.x+Math.floor(floorR()*r.w),y=r.y+Math.floor(floorR()*r.h);
    if(map[y*W+x]!==1||(x===player.x&&y===player.y))continue;
    items.push({x,y,...genGroundItem()});
  }
  if(fl%3===0&&fl<FINAL){ // วาณิช + เควสต์
    const r=rooms[rooms.length-2]||rooms[0];
    const qfoes=FOES.filter(f=>fl>=f.min&&fl<=f.max);
    const qt=qfoes[Math.floor(floorR()*qfoes.length)];
    const stock=[
      {t:'pot',name:'อมฤต',heal:14+fl*2,price:18+fl},
      {t:'mana',name:'น้ำโสม',mana:12+fl*2,price:16+fl},
      genW(Math.min(5,1+((fl+1)>>2))),
      genA(Math.min(5,1+(fl>>2))),
      genScr(),
    ];
    npcs.push({type:'merchant',x:r.cx,y:r.cy,sprite:'merchant',stock,
      q:{id:qt.id,name:qt.name,need:3+Math.floor(floorR()*3),got:0,reward:0,claimed:true}});
    const q=npcs[npcs.length-1].q;
    q.reward=q.need*(10+fl*2);q.claimed=false;
  }
  if(fl%4===1&&fl>1&&fl<FINAL){ // พระดาบส
    const r=rooms[Math.floor(floorR()*rooms.length)];
    npcs.push({type:'hermit',x:r.cx,y:r.cy,sprite:'hermit',used:false});
  }
  const boss=BOSSES[fl];
  const n=boss?5:Math.min(12,4+Math.floor(fl*0.9));
  for(let i=0;i<n;i++){
    const r=rooms[1+Math.floor(floorR()*(rooms.length-1))];
    const x=r.x+Math.floor(floorR()*r.w),y=r.y+Math.floor(floorR()*r.h);
    if(map[y*W+x]!==1||(Math.abs(x-player.x)+Math.abs(y-player.y))<6)continue;
    const pool=FOES.filter(f=>fl>=f.min&&fl<=f.max);
    const b=pool[Math.floor(floorR()*pool.length)];
    enemies.push(spawnFoe(b,x,y));
  }
  if(boss){
    const b={...boss,id:'boss_'+fl,boss:true,ranged:false,awake:false};
    enemies.push(spawnFoe(b,lr.cx,Math.min(H-2,lr.cy+1)));
  }
  if(fl===1)msg('เจ้าก้าวเข้าสู่เงามืดของลงกา…');
  else msg('ชั้น '+thaiNum(fl)+' — '+FLOOR_TITLES[(fl-1)%FLOOR_TITLES.length]);
  if(boss){msg('☠ นายทัพ '+boss.name+' ครองชั้นนี้!','warn');sfx.boss();}
  computeFov();
}
function spawnFoe(base,x,y){
  return {...base,x,y,awake:false,maxhp:base.hp+floor,hp:base.hp+floor,
    atk:base.atk+(floor*0.35|0),g:base.g+(floor>>1)};
}
function genW(t){return{t:'wpn',name:WEAPONS[t].n,v:WEAPONS[t].a,tier:t,price:t*45}}
function genA(t){return{t:'arm',name:ARMORS[t].n,v:ARMORS[t].d,tier:t,price:t*40}}
function genScr(){
  const keys=['agni','heal','vaju','vajra'];
  const k=keys[Math.floor(floorR()*4)];
  return{t:'scr',key:k,name:'คัมภีร์'+MANTRAS[k].n,price:35};
}
function genGroundItem(){
  const r=floorR();
  if(r<.28)return{t:'pot',name:'อมฤต',heal:12+floor*2};
  if(r<.45)return{t:'mana',name:'น้ำโสม',mana:10+floor*2};
  if(r<.62)return{t:'gold',amt:6+Math.floor(floorR()*(6+floor*3))};
  if(r<.75){const t=Math.min(5,1+((floor-1)>>2)+(floorR()<.3?1:0));return genW(t);}
  if(r<.88){const t=Math.min(5,1+((floor-1)>>2));return genA(t);}
  return genScr();
}

/* ── FOV / LOS ── */
function los(x0,y0,x1,y1){
  let dx=Math.abs(x1-x0),dy=Math.abs(y1-y0),sx=x0<x1?1:-1,sy=y0<y1?1:-1,err=dx-dy;
  while(!(x0===x1&&y0===y1)){
    if(map[y0*W+x0]===0)return false;
    const e2=2*err;
    if(e2>-dy){err-=dy;x0+=sx;}
    if(e2<dx){err+=dx;y0+=sy;}
  }
  return true;
}
function computeFov(){
  vis.fill(0);const RAD=6;
  for(let y=Math.max(0,player.y-RAD);y<=Math.min(H-1,player.y+RAD);y++)
  for(let x=Math.max(0,player.x-RAD);x<=Math.min(W-1,player.x+RAD);x++){
    const d2=(x-player.x)**2+(y-player.y)**2;
    if(d2>RAD*RAD+2)continue;
    if(los(player.x,player.y,x,y)){vis[y*W+x]=1;seen[y*W+x]=1;}
  }
}

/* ── การกระทำของผู้เล่น ── */
function canWalk(x,y){return x>=0&&y>=0&&x<W&&y<H&&map[y*W+x]!==0}
function enemyAt(x,y){return enemies.find(e=>e.x===x&&e.y===y&&e.hp>0)}
function npcAt(x,y){return npcs.find(n=>n.x===x&&n.y===y)}
function tryMove(dx,dy){
  if(state!=='play')return;
  const nx=player.x+dx,ny=player.y+dy;
  if(!canWalk(nx,ny))return;
  const e=enemyAt(nx,ny);
  if(e){attackFoe(e);endTurn();return;}
  const n=npcAt(nx,ny);
  if(n){interact(n);return;}
  player.x=nx;player.y=ny;
  const gi=items.findIndex(i=>i.x===nx&&i.y===ny);
  if(gi>=0)pickup(gi);
  if(map[ny*W+nx]===2){
    if(stairsLocked){msg('มนตร์ดำผนึกบันไดไว้ — ต้องสังหารนายทัพเสียก่อน!','warn');}
    else{
      if(floor>=FINAL){victory();return;}
      $('stairsInfo').textContent='เบื้องล่างคือชั้น '+thaiNum(floor+1)+(BOSSES[floor+1]?' …มีไอสังหารแรงกล้า':'');
      show($('stairsOv'));
    }
  }else if(map[ny*W+nx]===3){show($('altarOv'));}
  endTurn();
}
function waitTurn(){
  if(state!=='play')return;
  player.mp=Math.min(player.mmp,player.mp+2);
  player.hp=Math.min(player.mhp,player.hp+1);
  msg('เจ้าสำรวมลมปราณ…');
  endTurn();
}
function attackFoe(e){
  const crit=rng()<.12;
  let d=Math.max(1,player.atk+player.wpn.v+R(3)-(e.def>>1));
  if(crit)d<<=1;
  e.hp-=d;e.awake=true;
  floats.push({x:e.x,y:e.y,t:'-'+d,c:crit?'#f5c542':'#ffffff',life:1});
  shake=crit?7:4;sfx.hit();
  if(e.hp<=0)killFoe(e);else msg((crit?'✦ โจมตีวิกฤต! ':'')+'เจ้าฟัน'+e.name+' -'+d);
}
function killFoe(e){
  floats.push({x:e.x,y:e.y,t:'✝',c:'#ff8b1f',life:1});
  player.xp+=e.xp;player.killsTotal++;kills[e.id]=(kills[e.id]||0)+1;
  const g=e.g+R(e.g);player.gold+=g;
  msg(e.name+'แตกดับ! +'+e.xp+' ประสบการณ์ +'+g+' เหรียญ');
  const r=rng();
  if(r<.12)items.push({x:e.x,y:e.y,t:'pot',name:'อมฤต',heal:12+floor*2});
  else if(r<.2)items.push({x:e.x,y:e.y,t:'gold',amt:5+R(10)});
  else if(r<.27)items.push({x:e.x,y:e.y,...genGroundItem()});
  enemies=enemies.filter(o=>o!==e);
  if(e.boss){
    if(floor===FINAL){victory();return;}
    stairsLocked=false;sfx.stairs();
    msg('ผนึกบันไดสลายแล้ว! ทางลงเปิดออก…','good');
    items.push({x:e.x,y:e.y,...genGroundItem()});
    player.gold+=30+floor*2;
  }
  checkLevel();
}
function checkLevel(){
  let up=false;
  while(player.xp>=xpNeed(player.lvl)){
    player.xp-=xpNeed(player.lvl);player.lvl++;up=true;
    player.mhp+=7;player.mmp+=4;player.atk+=2;player.def+=1;
    player.hp=Math.min(player.mhp,player.hp+(player.mhp>>1));
    player.mp=player.mmp;
    for(const s of CLASSES[player.cls].mantras){
      const [k,l]=s.split('@');
      if(player.lvl>=+l&&!player.mantras.includes(k)){
        player.mantras.push(k);msg('แจ้งแจ้งอาคม «'+MANTRAS[k].n+'» แล้ว!','good');
      }
    }
  }
  if(up){
    msg('⟐ เลื่อนขั้นเป็นระดับ '+thaiNum(player.lvl)+'!','good');
    floats.push({x:player.x,y:player.y,t:'LEVEL UP',c:'#f5c542',life:1.4});
    sfx.level();
  }
}
const xpNeed=l=>l*25+(l-1)*(l-1)*5;
function hurtPlayer(d,src){
  if(rng()*100<player.dodge){msg('เจ้าพลิกตัวหลบ'+src+'ได้!');
    floats.push({x:player.x,y:player.y,t:'พลาด!',c:'#2ec4a6',life:1});return;}
  player.hp-=d;flash=.4;shake=5;sfx.hurt();
  floats.push({x:player.x,y:player.y,t:'-'+d,c:'#ff5a4d',life:1});
  msg(src+'ทำร้ายเจ้า -'+d,'warn');
  if(player.hp<=0)die();
}

/* ── เทิร์นศัตรู ── */
function enemiesAct(){
  for(const e of enemies){
    if(e.hp<=0)continue;
    const dx=player.x-e.x,dy=player.y-e.y,dist=Math.max(Math.abs(dx),Math.abs(dy));
    if(vis[e.y*W+e.x]&&dist<=9)e.awake=true;
    if(!e.awake){
      if(rng()<.15){const d=[[1,0],[-1,0],[0,1],[0,-1]][R(4)];
        if(canWalk(e.x+d[0],e.y+d[1])&&!enemyAt(e.x+d[0],e.y+d[1])&&!npcAt(e.x+d[0],e.y+d[1])
          &&!(player.x===e.x+d[0]&&player.y===e.y+d[1])){e.x+=d[0];e.y+=d[1];}}
      continue;
    }
    if(dist===1){
      let d=Math.max(1,e.atk+R(3)-(player.def+(player.arm?player.arm.v:0)>>1));
      if(rng()<.07){d<<=1;msg(e.name+'จู่โจมเข้าจุดตาย!','warn');}
      hurtPlayer(d,e.name);
      continue;
    }
    if(e.ranged&&dist<=5&&dist>1&&los(e.x,e.y,player.x,player.y)){
      hurtPlayer(Math.max(1,e.atk+R(2)-(player.def>>1)),e.name+' (พ่นพิษ)');
      floats.push({x:player.x,y:player.y,t:'☠',c:'#5ae05a',life:1});
      continue;
    }
    const sx=Math.sign(dx),sy=Math.sign(dy);
    const order=Math.abs(dx)>Math.abs(dy)?[[sx,0],[0,sy]]:[[0,sy],[sx,0]];
    for(const[mx,my]of order){
      if(!mx&&!my)continue;
      const nx=e.x+mx,ny=e.y+my;
      if(canWalk(nx,ny)&&!enemyAt(nx,ny)&&!npcAt(nx,ny)&&!(nx===player.x&&ny===player.y)){
        e.x=nx;e.y=ny;break;
      }
    }
  }
}
function endTurn(){
  if(state!=='play')return;
  enemiesAct();
  if(player.hp<=0)return;
  time++;
  if(time%6===0&&player.hp<player.mhp)player.hp++;
  computeFov();updateHud();saveGame();
}

/* ── ของ / ร้านค้า / อาคม / เทวาลัย ── */
function pickup(gi){
  const it=items[gi];items.splice(gi,1);
  if(it.t==='gold'){player.gold+=it.amt;msg('เก็บเหรียญกษาปณ์ +'+it.amt);sfx.gold();return;}
  if(player.inv.length>=10){msg('ถุงผ้าเต็ม! ของถูกทิ้งไว้…','warn');items.push(it);return;}
  player.inv.push(it);sfx.pick();
  msg('เก็บ «'+it.name+'»'+statTxt(it));
}
function statTxt(it){
  if(it.t==='wpn')return ' โจมตี+'+it.v;
  if(it.t==='arm')return ' ป้องกัน+'+it.v;
  if(it.t==='pot')return ' ฟื้นเลือด+'+it.heal;
  if(it.t==='mana')return ' ฟื้นมนตร์+'+it.mana;
  return ' (อาคม)';
}
function useItem(i){
  const it=player.inv[i];if(!it)return;
  if(it.t==='pot'){player.hp=Math.min(player.mhp,player.hp+it.heal);
    msg('ดื่มอมฤต ฟื้นเลือด +'+it.heal,'good');sfx.pick();}
  else if(it.t==='mana'){player.mp=Math.min(player.mmp,player.mp+it.mana);
    msg('ดื่มน้ำโสม ฟื้นมนตร์ +'+it.mana,'good');sfx.pick();}
  else if(it.t==='wpn'){player.wpn=it;msg('ถือ «'+it.name+'» โจมตี+'+it.v);sfx.pick();}
  else if(it.t==='arm'){player.arm=it;msg('สวม «'+it.name+'» ป้องกัน+'+it.v);sfx.pick();}
  else if(it.t==='scr'){
    if(player.mantras.includes(it.key)){player.punya+=5;msg('แจ้งแจ้งอยู่แล้ว — กรานเป็นปุญ +๕','good');}
    else{player.mantras.push(it.key);msg('ศึกษา «'+MANTRAS[it.key].n+'» สำเร็จ!','good');sfx.cast();}
  }
  player.inv.splice(i,1);updateHud();
}
function castMantra(key){
  if(state!=='play')return;
  const m=MANTRAS[key];
  if(player.mp<m.mp){msg('พลังมนตร์ไม่พอ…','warn');return;}
  let used=true;
  if(key==='agni'||key==='vajra'){
    const visF=enemies.filter(e=>vis[e.y*W+e.x])
      .sort((a,b)=>(Math.abs(a.x-player.x)+Math.abs(a.y-player.y))-(Math.abs(b.x-player.x)+Math.abs(b.y-player.y)));
    if(!visF.length){msg('ไม่มีศัตรูในระยะมองเห็น','warn');return;}
    const t=visF[0];
    const d=key==='agni'?6+player.lvl*2:12+player.lvl*3;
    t.hp-=d;floats.push({x:t.x,y:t.y,t:'-'+d,c:key==='agni'?'#ff8b1f':'#f5c542',life:1});
    msg((key==='agni'?'✹ เปลวเพลิง':'⌁ สายฟ้าพระอินทร์')+'สังหาร'+t.name+' -'+d);
    if(t.hp<=0)killFoe(t);
  }else if(key==='heal'){
    const h=10+player.lvl*2;player.hp=Math.min(player.mhp,player.hp+h);
    msg('✚ อมฤตชำระกาย ฟื้นเลือด +'+h,'good');
    floats.push({x:player.x,y:player.y,t:'+'+h,c:'#2ec4a6',life:1});
  }else if(key==='vaju'){
    let hitAny=false;
    for(const e of enemies.slice()){
      if(Math.max(Math.abs(e.x-player.x),Math.abs(e.y-player.y))<=2){
        const d=5+player.lvl;e.hp-=d;hitAny=true;
        floats.push({x:e.x,y:e.y,t:'-'+d,c:'#2ec4a6',life:1});
        if(e.hp<=0)killFoe(e);
      }
    }
    msg('❋ พายุวายุพัดกระหน่ำ'+(hitAny?'!':' — แต่ไม่มีใครอยู่ในรัศมี'));
  }
  if(used){player.mp-=m.mp;sfx.cast();hide($('mantraOv'));endTurn();}
}
function interact(n){
  if(n.type==='merchant'){renderShop(n);show($('shopOv'));sfx.gold();}
  else if(n.type==='hermit'){
    if(!n.used){n.used=true;player.hp=player.mhp;player.mp=player.mmp;
      msg('พระดาบสประสาทพร — ร่างกายฟื้นเต็ม!','good');sfx.level();updateHud();}
    else msg('พระดาบสเข้าฌาน ไม่ตอบสนอง…');
  }
}
function renderShop(n){
  $('shopTalk').textContent='“ยินดีต้อนรับผู้กล้า จากชั้นบนข้าเจอของดีมาขาย…”';
  $('shopGold').textContent='◉ '+player.gold;
  const q=$('shopQuest');
  if(n.q&&!n.q.claimed){
    const done=kills[n.q.id]||0;
    q.innerHTML='<div class="row"><span>📜 เควสต์: ล่า '+n.q.name+' '+done+'/'+n.q.need+
      ' — รางวัล ◉'+n.q.reward+'</span><button class="mini-btn" id="qClaim"'+
      (done>=n.q.need?'':' disabled')+'>รับรางวัล</button></div>';
    const b=$('qClaim');
    if(b)b.onclick=()=>{
      player.gold+=n.q.reward;player.punya+=5;msg('เควสต์สำเร็จ! รับ ◉'+n.q.reward+' และปุญ +๕','good');
      const qf=FOES.filter(f=>floor>=f.min&&floor<=f.max);
      const qt=qf[Math.floor(rng()*qf.length)];
      n.q={id:qt.id,name:qt.name,need:3+R(3),got:0,reward:0,claimed:false};
      n.q.reward=n.q.need*(10+floor*2);
      sfx.buy();updateHud();renderShop(n);
    };
  }else q.innerHTML='<div class="row dim">— ไม่มีเควสต์ —</div>';
  const s=$('shopStock');s.innerHTML='';
  n.stock.forEach((it,si)=>{
    const r=document.createElement('div');r.className='row';
    r.innerHTML='<span>'+it.name+statTxt(it)+'</span>';
    const b=document.createElement('button');b.className='mini-btn';
    b.textContent='◉ '+it.price;b.disabled=player.gold<it.price;
    b.onclick=()=>{
      player.gold-=it.price;sfx.buy();
      if(it.t==='gold'){player.gold+=it.amt;}
      else if(player.inv.length>=10){msg('ถุงผ้าเต็ม!','warn');player.gold+=it.price;return;}
      else player.inv.push({...it});
      msg('ซื้อ «'+it.name+'»');updateHud();renderShop(n);
    };
    r.appendChild(b);s.appendChild(r);
  });
}
function pray(free){
  hide($('altarOv'));
  if(!free&&player.gold<20){msg('เหรียญไม่พอถวาย…','warn');return;}
  const idx=player.y*W+player.x;
  if(free)map[idx]=4;
  if(!free){player.gold-=20;player.punya+=10;msg('เจ้าถวายเครื่องสักการะ ปุญ +๑๐','good');}
  const luck=rng()+Math.min(.25,player.punya/200);
  if(luck>.8){const s=['atk','def','mhp'][R(3)];
    if(s==='atk')player.atk++;else if(s==='def')player.def++;else{player.mhp+=5;player.hp+=5;}
    msg('🛕 เทพประทานพร! '+(s==='atk'?'โจมตี':s==='def'?'ป้องกัน':'เลือดสูงสุด')+' +ถาวร','good');sfx.level();}
  else if(luck>.45){player.hp=player.mhp;player.mp=player.mmp;
    msg('🛕 แสงศักดิ์สิทธิ์ชำระกาย — ฟื้นเต็ม!','good');sfx.level();}
  else if(luck>.12){msg('🛕 เทพนิ่งเงียบ… ไม่มีสิ่งใดเกิดขึ้น');}
  else{player.hp-=6;msg('🛕 คำสาปจากวิหาร! -๖ เลือด','warn');sfx.hurt();
    if(player.hp<=0){die();return;}}
  updateHud();endTurn();
}
function descend(){
  hide($('stairsOv'));sfx.stairs();
  if(floor>=FINAL){victory();return;}
  genFloor(floor+1);updateHud();saveGame();
}

/* ── ตาย / ชนะ / คะแนน ── */
function score(){return floor*50+player.gold+player.lvl*30+player.punya*2+player.killsTotal*5}
function hallGet(){try{return JSON.parse(localStorage.getItem(HALL_KEY))||[]}catch(e){return[]}}
function hallAdd(sc){
  const h=hallGet();h.push({n:CLASSES[player.cls].name,f:floor,s:sc});
  h.sort((a,b)=>b.s-a.s);localStorage.setItem(HALL_KEY,JSON.stringify(h.slice(0,5)));
}
function hallInto(el){
  const h=hallGet();
  el.innerHTML=h.length?h.map(r=>'<li>'+r.n+' · ชั้น '+thaiNum(r.f)+' · กิตติยศ '+r.s+'</li>').join('')
    :'<li>ยังไม่มีผู้ใดจารึกนาม…</li>';
}
function die(){
  state='dead';sfx.dead();localStorage.removeItem(SAVE_KEY);
  const sc=score();hallAdd(sc);
  $('deadStats').innerHTML='เจ้าเดินทางถึง <b>ชั้น '+thaiNum(floor)+'</b> · ระดับ '+thaiNum(player.lvl)+
    ' · สังหาร '+player.killsTotal+' ตน<br>กิตติยศ <b class="gold">'+sc+'</b>';
  hallInto($('deadHall'));show($('deadOv'));
}
function victory(){
  state='win';sfx.level();localStorage.removeItem(SAVE_KEY);
  const sc=score()+500;hallAdd(sc);
  $('winStats').innerHTML='ทศกัณฐ์ล่มสลาย แสงธรรมสาดส่องลงกา<br>'+
    'เจ้าบรรลุ <b class="gold">โมกษะ</b> — หลุดพ้นจากสังสารวัฏ!<br>กิตติยศ <b class="gold">'+sc+'</b>';
  hallInto($('winHall'));show($('winOv'));
}

/* ── เซฟ / โหลด ── */
function saveGame(){
  if(state!=='play')return;
  try{
    localStorage.setItem(SAVE_KEY,JSON.stringify({
      seed,floor,stairs,
      map:Array.from(map).join(''),
      player:{...player},
      enemies:enemies.map(e=>({id:e.id,x:e.x,y:e.y,hp:e.hp,awake:e.awake})),
      npcs,items,kills,
    }));
  }catch(e){}
}
function loadGame(){
  try{
    const s=JSON.parse(localStorage.getItem(SAVE_KEY));
    if(!s||!s.player)return false;
    seed=s.seed;floor=s.floor;stairs=s.stairs;kills=s.kills||{};
    map=new Uint8Array(W*H);
    for(let i=0;i<W*H;i++)map[i]=+s.map[i];
    seen=new Uint8Array(W*H);vis=new Uint8Array(W*H);
    player=s.player;items=s.items||[];npcs=s.npcs||[];
    enemies=s.enemies.map(sav=>{
      const base=sav.id.startsWith('boss_')?BOSSES[+sav.id.split('_')[1]]
        :FOES.find(f=>f.id===sav.id);
      return{...base,id:sav.id,x:sav.x,y:sav.y,hp:sav.hp,maxhp:base.hp+floor,awake:sav.awake};
    }).filter(e=>e.id);
    state='play';computeFov();updateHud();setControlsHint();
    msg('จิตของเจ้ากลับสู่ร่างเดิม… เดินทางต่อ!');
    return true;
  }catch(e){return false;}
}

/* ── สร้างตัวละคร / เริ่มเกม ── */
function startRun(cls){
  seed=(Date.now()^(Math.random()*1e9))>>>0;
  rng=mulberry32(seed);
  const C=CLASSES[cls];
  player={x:0,y:0,cls,sprite:C.sprite,hp:C.hp,mhp:C.hp,mp:C.mp,mmp:C.mp,
    atk:C.atk,def:C.def,dodge:C.dodge,lvl:1,xp:0,gold:30,punya:0,killsTotal:0,
    wpn:{name:'อาวุธฝึก',v:1,tier:0},arm:{name:'ผ้าฝ้าย',v:0,tier:0},
    inv:[{t:'pot',name:'อมฤต',heal:14}],mantras:[],floor:1};
  for(const s of C.mantras){if(!s.includes('@'))player.mantras.push(s);}
  rng=Math.random;time=0;floats=[];logs=[];
  genFloor(1);state='play';
  hideAll();updateHud();setControlsHint();saveGame();
}

/* ── การแสดงผล ── */
function msg(t,cls){
  logs.unshift({t,cls});if(logs.length>4)logs.pop();
  logEl.innerHTML=logs.map(l=>'<p'+(l.cls?' class="'+l.cls+'"':'')+'>'+l.t+'</p>').join('');
}
function updateHud(){
  if(!player)return;
  $('hpFill').style.width=(100*player.hp/player.mhp)+'%';
  $('hpTxt').textContent=player.hp+'/'+player.mhp;
  $('mpFill').style.width=(100*player.mp/player.mmp)+'%';
  $('mpTxt').textContent=player.mp+'/'+player.mmp;
  $('lvChip').textContent='LV.'+player.lvl;
  $('floorChip').textContent='ชั้น '+thaiNum(floor);
  $('goldChip').textContent='◉ '+player.gold;
  $('punyaChip').textContent='✦ '+player.punya;
}
function drawTile(x,y){
  const t=map[y*W+x];
  if(t===0){const v=((x*7+y*13)&1);ctx.drawImage(TILEC[0][v],x*T,y*T);}
  else if(t===1){const v=((x*5+y*11)&1);ctx.drawImage(TILEC[1][v],x*T,y*T);}
  else if(t===2){ctx.drawImage(TILEC[1][0],x*T,y*T);
    ctx.drawImage(TILEC[2][0],x*T,y*T);
    if(!stairsLocked){ // แสงบันไดเต้นรำ
      ctx.fillStyle='rgba(46,196,166,'+(0.15+0.15*Math.sin(time*0.15+x)).toFixed(2)+')';
      ctx.fillRect(x*T,y*T,T,T);}
    else{ctx.fillStyle='rgba(120,10,20,.45)';ctx.fillRect(x*T,y*T,T,T);}
  }
  else if(t===3){ctx.drawImage(TILEC[3][0],x*T,y*T);
    const fl=Math.sin(time*0.3+x*3)>0; // เปลวเทียน
    ctx.fillStyle='#ff8b1f';ctx.fillRect(x*T+7,y*T+(fl?0:1),2,2);
    ctx.fillStyle='#ffe9a3';ctx.fillRect(x*T+7,y*T+1,1,1);}
  else if(t===4){ctx.drawImage(TILEC[4][0],x*T,y*T);}
}
function render(){
  if(state==='title'||state==='classSel'){drawMandala();return;}
  if(!player)return;
  ctx.setTransform(1,0,0,1,0,0);
  ctx.fillStyle='#0a030c';ctx.fillRect(0,0,cv.width,cv.height);
  let ox=0,oy=0;
  if(shake>0){shake*=.86;if(shake<.5)shake=0;ox=(Math.random()-.5)*shake;oy=(Math.random()-.5)*shake;}
  ctx.translate(ox|0,oy|0);
  const camX=clamp(player.x-(VW>>1),0,W-VW),camY=clamp(player.y-(VH>>1),0,H-VH);
  for(let vy=0;vy<VH;vy++)for(let vx=0;vx<VW;vx++){
    const x=camX+vx,y=camY+vy;
    if(!seen[y*W+x])continue;
    drawTile(x-camX,y-camY);
  }
  for(const it of items){ // ของบนพื้น
    if(!seen[it.y*W+it.x])continue;
    const sx=(it.x-camX)*T,sy=(it.y-camY)*T;
    if(sx<-T||sy<-T||sx>cv.width||sy>cv.height)continue;
    const ic={pot:'pot',mana:'mana',gold:'gold',wpn:'wpn',arm:'arm',scr:'scr'}[it.t];
    drawSpr(ic,sx,sy+1);
  }
  for(const n of npcs){
    if(!vis[n.y*W+n.x])continue;
    drawSpr(n.sprite,(n.x-camX)*T,(n.y-camY)*T);
  }
  for(const e of enemies){
    if(!vis[e.y*W+e.x])continue;
    const ex=(e.x-camX)*T,ey=(e.y-camY)*T;
    if(e.boss){ // รัศมีบอส
      ctx.fillStyle='rgba(212,61,42,'+(0.18+0.12*Math.sin(time*0.2)).toFixed(2)+')';
      ctx.fillRect(ex-2,ey-2,T+4,T+4);
    }
    drawSpr(e.sprite,ex,ey+(Math.sin(time*0.1+e.x)>0.6?-1:0));
    if(e.hp<e.maxhp){ // หลอดเลือดศัตรู
      ctx.fillStyle='#000';ctx.fillRect(ex,ey-3,T,2);
      ctx.fillStyle='#e5482e';ctx.fillRect(ex,ey-3,T*Math.max(0,e.hp/e.maxhp),2);
    }
  }
  if(player.hp>0)
    drawSpr(player.sprite,(player.x-camX)*T,(player.y-camY)*T+(Math.sin(time*0.12)>0?-1:0));
  for(let vy=0;vy<VH;vy++)for(let vx=0;vx<VW;vx++){ // หมอกสงคราม
    const x=camX+vx,y=camY+vy;
    if(!seen[y*W+x]){continue;}
    if(!vis[y*W+x]){ctx.fillStyle='rgba(5,1,8,.62)';ctx.fillRect(vx*T,vy*T,T,T);}
  }
  for(const f of floats){ // ตัวเลขลอย
    f.life-=.025;
    ctx.font='bold 7px monospace';ctx.textAlign='center';
    ctx.fillStyle=f.c;ctx.globalAlpha=Math.max(0,Math.min(1,f.life));
    ctx.fillText(f.t,(f.x-camX)*T+8,(f.y-camY)*T-6+(1-f.life)*-10);
    ctx.globalAlpha=1;
  }
  floats=floats.filter(f=>f.life>0);
  if(flash>0){ctx.fillStyle='rgba(212,42,32,'+(flash*.5).toFixed(2)+')';
    ctx.fillRect(0,0,cv.width,cv.height);flash-=.05;}
  ctx.setTransform(1,0,0,1,0,0);
  drawMinimap(camX,camY);
}
function drawMinimap(){
  if(state!=='play'){mcv.style.display='none';return;}
  mcv.style.display='block';
  mctx.fillStyle='#0d0412';mctx.fillRect(0,0,84,64);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    if(!seen[y*W+x])continue;
    const t=map[y*W+x];
    mctx.fillStyle=t===0?'#42252e':t===2?'#f5c542':t===3?'#ff8b1f':'#2a1626';
    mctx.fillRect(x*2,y*2,2,2);
  }
  for(const e of enemies){if(vis[e.y*W+e.x]){mctx.fillStyle='#ff3b2e';mctx.fillRect(e.x*2,e.y*2,2,2);}}
  mctx.fillStyle=(time&8)?'#ffffff':'#2ec4a6';
  mctx.fillRect(player.x*2-1,player.y*2-1,3,3);
}
function drawMandala(){ // ฉากหน้าเมนู
  ctx.fillStyle='#0d0412';ctx.fillRect(0,0,cv.width,cv.height);
  const cx=cv.width/2,cy=cv.height/2+8;
  for(let ring=0;ring<4;ring++){
    const rad=34+ring*32,pet=8+ring*4,rot=time*.002*(ring%2?1:-1);
    ctx.strokeStyle=['#f5c542','#2ec4a6','#ff8b1f','#8f2438'][ring];
    ctx.globalAlpha=.3+.08*Math.sin(time*.05+ring);
    ctx.beginPath();ctx.arc(cx,cy,rad,0,7);ctx.stroke();
    for(let i=0;i<pet;i++){
      const a=rot+i*2*Math.PI/pet;
      const px=cx+Math.cos(a)*rad,py=cy+Math.sin(a)*rad;
      ctx.beginPath();ctx.arc(px,py,3+ring,0,7);ctx.stroke();
    }
  }
  ctx.globalAlpha=1;
  const fh=6+2*Math.sin(time*.35)+Math.sin(time*.9); // ประทีปกลางมณฑล
  ctx.fillStyle='#7a4a22';ctx.fillRect(cx-6,cy+3,12,4);
  ctx.fillStyle='#ff8b1f';ctx.fillRect(cx-2,cy-fh,4,fh);
  ctx.fillStyle='#ffe9a3';ctx.fillRect(cx-1,cy-fh+2,2,fh-3);
}
let lastT=0;
function loop(t){time=Math.floor(t/50);render();requestAnimationFrame(loop)}

/* ── UI helpers ── */
function show(el){el.classList.remove('hidden')}
function hide(el){el.classList.add('hidden')}
function hideAll(){document.querySelectorAll('.ov').forEach(o=>o.classList.add('hidden'))}
let hintTimer=null;
function setControlsHint(){
  const h=$('controlsHint');if(!h)return;
  h.style.opacity=1;clearTimeout(hintTimer);
  hintTimer=setTimeout(()=>{h.style.opacity=0;},6000);
}
function renderInv(){
  $('equip').innerHTML='⚔ <b>'+player.wpn.name+'</b> +'+player.wpn.v+
    ' &nbsp;·&nbsp; 🛡 <b>'+player.arm.name+'</b> +'+player.arm.v;
  const list=$('invList');list.innerHTML='';
  if(!player.inv.length){list.innerHTML='<div class="row dim">ถุงผ้าว่างเปล่า…</div>';return;}
  player.inv.forEach((it,i)=>{
    const r=document.createElement('div');r.className='row';
    r.innerHTML='<span>'+it.name+statTxt(it)+'</span>';
    const b=document.createElement('button');b.className='mini-btn';b.textContent='ใช้';
    b.onclick=()=>{useItem(i);renderInv();};
    r.appendChild(b);list.appendChild(r);
  });
}
function renderMantras(){
  $('mpHint').textContent='พลังมนตร์ '+player.mp+'/'+player.mmp;
  const list=$('mantraList');list.innerHTML='';
  if(!player.mantras.length){list.innerHTML='<div class="row dim">ยังไม่รู้แจ้งอาคมใด ๆ</div>';return;}
  player.mantras.forEach(k=>{
    const m=MANTRAS[k];
    const r=document.createElement('div');r.className='row';
    r.innerHTML='<span>'+m.ic+' <b>'+m.n+'</b> <span class="teal">'+m.mp+' มนตร์</span><br>'+
      '<small class="dim">'+m.d+'</small></span>';
    const b=document.createElement('button');b.className='mini-btn';b.textContent='ร่าย';
    b.disabled=player.mp<m.mp;b.onclick=()=>castMantra(k);
    r.appendChild(b);list.appendChild(r);
  });
}
function renderRecords(){$('recordsList').innerHTML=hallGet().map(r=>
  '<li>'+r.n+' · ชั้น '+thaiNum(r.f)+' · กิตติยศ '+r.s+'</li>').join('')||'<li>ยังว่าง…</li>';}
function buildClassCards(){
  const box=$('classList');box.innerHTML='';
  for(const key in CLASSES){
    const C=CLASSES[key];
    const card=document.createElement('div');card.className='card';
    card.innerHTML='<canvas class="mini" width="32" height="32"></canvas><h3>'+C.name+'</h3>'+
      '<small>เลือด '+C.hp+' · มนตร์ '+C.mp+' · โจมตี '+C.atk+' · ป้อง '+C.def+'</small>'+
      '<p>'+C.desc+'</p>';
    const g=card.querySelector('canvas').getContext('2d');
    g.imageSmoothingEnabled=false;g.drawImage(SPR[C.sprite],0,0,8,8,0,0,32,32);
    card.onclick=()=>{initAudio();startRun(key);};
    box.appendChild(card);
  }
}

/* ── อินพุต ── */
function bindHold(btn,fn){
  let timer=null;
  const start=e=>{e.preventDefault();initAudio();fn();
    clearInterval(timer);timer=setInterval(fn,195);};
  const end=e=>{e.preventDefault();clearInterval(timer);timer=null;};
  btn.addEventListener('pointerdown',start);
  ['pointerup','pointercancel','pointerleave'].forEach(ev=>btn.addEventListener(ev,end));
}
function setupInput(){
  bindHold($('btnU'),()=>tryMove(0,-1));
  bindHold($('btnD'),()=>tryMove(0,1));
  bindHold($('btnL'),()=>tryMove(-1,0));
  bindHold($('btnR'),()=>tryMove(1,0));
  $('btnWait').addEventListener('pointerdown',e=>{e.preventDefault();initAudio();waitTurn();});
  $('btnMantra').onclick=()=>{if(state==='play'){renderMantras();show($('mantraOv'));}};
  $('btnInv').onclick=()=>{if(state==='play'){renderInv();show($('invOv'));}};
  $('btnHelp').onclick=()=>show($('helpOv'));
  $('btnHelpT').onclick=()=>show($('helpOv'));
  $('btnHelpClose').onclick=()=>hide($('helpOv'));
  $('btnSnd').onclick=()=>{initAudio();toggleSound();};
  $('controls').addEventListener('contextmenu',e=>e.preventDefault());
  window.addEventListener('keydown',e=>{
    if(e.repeat)return;
    initAudio();
    if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key))e.preventDefault();
    if(e.key==='ArrowUp'||e.key==='w')tryMove(0,-1);
    else if(e.key==='ArrowDown'||e.key==='s')tryMove(0,1);
    else if(e.key==='ArrowLeft'||e.key==='a')tryMove(-1,0);
    else if(e.key==='ArrowRight'||e.key==='d')tryMove(1,0);
    else if(e.key===' ')waitTurn();
    else if(e.key==='m'){if(state==='play'){renderMantras();show($('mantraOv'));}}
    else if(e.key==='i'){if(state==='play'){renderInv();show($('invOv'));}}
    else if(e.key==='h')show($('helpOv'));
    else if(e.key==='Escape')hideAll();
  });
  /* ปุ่มเมนู / โอเวอร์เลย์ */
  $('btnNew').onclick=()=>{initAudio();hide($('title'));show($('classSel'));};
  $('btnContinue').onclick=()=>{initAudio();if(!loadGame()){msg('เซฟเสียหาย เริ่มใหม่แทน');hideAll();show($('classSel'));}};
  $('btnRecords').onclick=()=>{renderRecords();hide($('titleMenu'));show($('recordsBox'));};
  $('btnRecordsBack').onclick=()=>{hide($('recordsBox'));show($('titleMenu'));};
  $('btnBackTitle').onclick=()=>{hide($('classSel'));show($('title'));};
  $('btnInvClose').onclick=()=>hide($('invOv'));
  $('btnMantraClose').onclick=()=>hide($('mantraOv'));
  $('btnShopClose').onclick=()=>{hide($('shopOv'));endTurn();};
  $('altarPray').onclick=()=>pray(true);
  $('altarOffer').onclick=()=>pray(false);
  $('altarGo').onclick=()=>hide($('altarOv'));
  $('btnDescend').onclick=descend;
  $('btnStay').onclick=()=>hide($('stairsOv'));
  $('btnRebirth').onclick=()=>{hideAll();show($('title'));state='title';refreshTitle();};
  $('btnRebirth2').onclick=()=>{hideAll();show($('title'));state='title';refreshTitle();};
}
function refreshTitle(){
  if(localStorage.getItem(SAVE_KEY))show($('btnContinue'));else hide($('btnContinue'));
}
function fitCanvas(){
  const r=stage.getBoundingClientRect();
  const s=Math.max(1,Math.floor(Math.min((r.width-12)/320,(r.height-12)/240)));
  cv.style.width=320*s+'px';cv.style.height=240*s+'px';
}
window.addEventListener('resize',fitCanvas);

/* ── เริ่มระบบ ── */
if('serviceWorker' in navigator){
  navigator.serviceWorker.register('sw.js').catch(()=>{});
}
buildClassCards();setupInput();refreshTitle();fitCanvas();
requestAnimationFrame(loop);