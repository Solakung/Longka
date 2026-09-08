/* ================================================================
ลงกา · วิถีแห่งกรรม — 8-bit Roguelike (ออฟไลน์ 100%)
ระบบ: ดันเจี้ยนสุ่ม / เทิร์นเบส / เลเวล / ของ / ร้านค้า / เควสต์
อาคม / กรรม-ปุญ / บอส / มินิแมป / เซฟ-โหลด / เสียงชิปจูน
[อัปเกรด]: เอฟเฟกต์ต่อสู้ (พุ่งชน/ฟันดาบ/สะเก็ดไฟ/ศัตรูกระพริบ)
มอนสเตอร์บึกบึน / สลับของไม่หาย / จำหมอกแผนที่
================================================================ */
&#39;use strict&#39;;
/* ── พื้นฐาน ── */
const $=id=&gt;document.getElementById(id);
const W=42,H=32,VW=20,VH=15,T=16,FINAL=20,SAVE_KEY=&#39;lanka_save_v1&#39;,HALL_KEY=&#39;lanka_hall_v1&#39;;
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let
t=Math.imul(a^a&gt;&gt;&gt;15,1|a);
t=t+Math.imul(t^t&gt;&gt;&gt;7,61|t)^t;return((t^t&gt;&gt;&gt;14)&gt;&gt;&gt;0)/4294967296}}
let rng=Math.random, floorR=Math.random;
const R=n=&gt;Math.floor(rng()*n), pick=a=&gt;a[R(a.length)], clamp=(v,a,b)=&gt;v&lt;a?a:v&gt;b?b:v;
function thaiNum(n){return String(n).replace(/\d/g,d=&gt;&#39;๐๑๒๓๔๕๖๗๘๙&#39;[d])}
const cv=$(&#39;game&#39;),ctx=cv.getContext(&#39;2d&#39;);ctx.imageSmoothingEnabled=false;
const mcv=$(&#39;minimap&#39;),mctx=mcv.getContext(&#39;2d&#39;);
const stage=$(&#39;stage&#39;),logEl=$(&#39;log&#39;);
/* ── เสียง (WebAudio) ── */
let AC=null,soundOn=true,droneNodes=null;
function initAudio(){
if(AC){if(AC.state===&#39;suspended&#39;)AC.resume();return;}
AC=new (window.AudioContext||window.webkitAudioContext)();
startDrone();
}
function startDrone(){ // เสียงพื้นแทนปูรา
if(!AC||droneNodes)return;
const g=AC.createGain();g.gain.value=.028;g.connect(AC.destination);
const o1=AC.createOscillator(),o2=AC.createOscillator(),o3=AC.createOscillator();
o1.type=&#39;sawtooth&#39;;o1.frequency.value=65.4;
o2.type=&#39;sine&#39;;o2.frequency.value=98;
o3.type=&#39;sine&#39;;o3.frequency.value=130.8;
const lfo=AC.createOscillator(),lg=AC.createGain();
lfo.frequency.value=.13;lg.gain.value=.013;lfo.connect(lg);lg.connect(g.gain);
[o1,o2,o3,lfo].forEach(o=&gt;o.start());
droneNodes={g,os:[o1,o2,o3,lfo]};

}
function beep(f,d=.09,type=&#39;square&#39;,v=.13,slide=0){
if(!AC||!soundOn)return;
const o=AC.createOscillator(),g=AC.createGain();
o.type=type;o.frequency.value=f;
if(slide)o.frequency.linearRampToValueAtTime(Math.max(30,f+slide),AC.currentTime+d);
g.gain.value=v;g.gain.exponentialRampToValueAtTime(.001,AC.currentTime+d);
o.connect(g);g.connect(AC.destination);o.start();o.stop(AC.currentTime+d);
}
const sfx={
hit:()=&gt;beep(170,.07,&#39;square&#39;,.15,-70),
hurt:()=&gt;beep(110,.2,&#39;sawtooth&#39;,.18,-50),
pick:()=&gt;{beep(660,.06,&#39;triangle&#39;,.12);setTimeout(()=&gt;beep(880,.08,&#39;triangle&#39;,.12),60)},
gold:()=&gt;{beep(988,.05,&#39;triangle&#39;,.12);setTimeout(()=&gt;beep(1319,.09,&#39;triangle&#39;,.12),50)},
level:()=&gt;[523,659,784,1047].forEach((f,i)=&gt;setTimeout(()=&gt;beep(f,.12,&#39;square&#39;,.13),i*90)),
cast:()=&gt;beep(392,.22,&#39;triangle&#39;,.15,220),
stairs:()=&gt;beep(200,.35,&#39;triangle&#39;,.15,-130),
dead:()=&gt;[220,185,147,110].forEach((f,i)=&gt;setTimeout(()=&gt;beep(f,.22,&#39;sawtooth&#39;,.15),i*170)),
boss:()=&gt;beep(65,.6,&#39;sawtooth&#39;,.25,-25),
buy:()=&gt;beep(784,.1,&#39;triangle&#39;,.13),
slash:()=&gt;beep(440,.06,&#39;sawtooth&#39;,.12,300),
};
function toggleSound(){
soundOn=!soundOn;
if(droneNodes)droneNodes.g.gain.value=soundOn?.028:0;
$(&#39;btnSnd&#39;).textContent=soundOn?&#39;♪&#39;:&#39;✕&#39;;
}
/* ── สไปรต์ 8 บิต (ปรับสัดส่วนให้หนาแน่น ทรงพลัง ไม่ก้าง) ── */
const PAL={k:&#39;#14080f&#39;,w:&#39;#f4ecdc&#39;,g:&#39;#f5c542&#39;,o:&#39;#ff8b1f&#39;,r:&#39;#d43d2a&#39;,t:&#39;#2ec4a6&#39;,
b:&#39;#3a6ea5&#39;,p:&#39;#8d55c9&#39;,s:&#39;#e8b06a&#39;,d:&#39;#7a4a22&#39;,f:&#39;#ffe9a3&#39;,e:&#39;#43b05c&#39;,
m:&#39;#8f2438&#39;,E:&#39;#7fae7a&#39;,c:&#39;#c9a86a&#39;,&#39;0&#39;:&#39;#000000&#39;};
const SPRD={
warrior:[
&quot;..gggg..&quot;,
&quot;.gssssg.&quot;,
&quot;.gskksg.&quot;,
&quot;ggrrrrgg&quot;,
&quot;ggrrrrgg&quot;,
&quot;.rrrrrr.&quot;,
&quot;.dww.wwd&quot;,
&quot;.dd...dd&quot;
],
brahmin:[
&quot;..wwww..&quot;,
&quot;.wwwwww.&quot;,
&quot;.wskksw.&quot;,
&quot;.wwwwww.&quot;,
&quot;wwwoowww&quot;,
&quot;.wwwwww.&quot;,
&quot;.dwwwwd.&quot;,
&quot;.dd..dd.&quot;

],
vanara:[
&quot;ww....ww&quot;,
&quot;wwwwwwww&quot;,
&quot;wwkwwkww&quot;,
&quot;.wwssww.&quot;,
&quot;gggggggg&quot;,
&quot;ggwwwwgg&quot;,
&quot;.wwwwww.&quot;,
&quot;.ww..ww.&quot;
],
rishi:[
&quot;..kkkk..&quot;,
&quot;.kssssk.&quot;,
&quot;.kskksk.&quot;,
&quot;wwwwwwww&quot;,
&quot;woooooww&quot;,
&quot;.oooooo.&quot;,
&quot;.doooood&quot;,
&quot;.dd..dd.&quot;
],
// มอนสเตอร์ใหม่: หนา บึกบึน ตัน ไม่ก้างปลา
preta:[
&quot;..EEEE..&quot;,
&quot;.EEEEEE.&quot;,
&quot;.EE00EE.&quot;,
&quot;.EEEEEE.&quot;,
&quot;..EEEE..&quot;,
&quot;.EEEEEE.&quot;,
&quot;EEEEEEEE&quot;,
&quot;.EE..EE.&quot;
],
asura:[
&quot;rr....rr&quot;,
&quot;rrrrrrrr&quot;,
&quot;rrgrrgrr&quot;,
&quot;rrrrrrrr&quot;,
&quot;mmmmmmmm&quot;,
&quot;mmmmmmmm&quot;,
&quot;.mmmmmm.&quot;,
&quot;.rr..rr.&quot;
],
naga:[
&quot;.tttttt.&quot;,
&quot;tttttttt&quot;,
&quot;ttgttgtt&quot;,
&quot;tttttttt&quot;,
&quot;.tttttt.&quot;,
&quot;tttttttt&quot;,
&quot;.tttttt.&quot;,
&quot;..tttt..&quot;
],

rakshasa:[
&quot;pp....pp&quot;,
&quot;pppppppp&quot;,
&quot;ppgppgpp&quot;,
&quot;ppwwppww&quot;,
&quot;pppppppp&quot;,
&quot;pppppppp&quot;,
&quot;.pppppp.&quot;,
&quot;.pp..pp.&quot;
],
yaksha:[
&quot;.dggggd.&quot;,
&quot;deeeeeed&quot;,
&quot;de00e0ed&quot;,
&quot;gggggggg&quot;,
&quot;ggrrrrgg&quot;,
&quot;.rrrrrr.&quot;,
&quot;.eeeeee.&quot;,
&quot;.dd..dd.&quot;
],
boss:[
&quot;f.gggg.f&quot;,
&quot;fggggggf&quot;,
&quot;geeeeeeg&quot;,
&quot;ge00e0eg&quot;,
&quot;gewwweeg&quot;,
&quot;rrrrrrrr&quot;,
&quot;rrrrrrrr&quot;,
&quot;.rr..rr.&quot;
],
merchant:[
&quot;..oooo..&quot;,
&quot;.oooooo.&quot;,
&quot;.oskkso.&quot;,
&quot;.gggggg.&quot;,
&quot;gggggggg&quot;,
&quot;.gggggg.&quot;,
&quot;.oooooo.&quot;,
&quot;.dd..dd.&quot;
],
hermit:[
&quot;..kkkk..&quot;,
&quot;.kssssk.&quot;,
&quot;.kskksk.&quot;,
&quot;wwwwwwww&quot;,
&quot;.oooooo.&quot;,
&quot;oooooooo&quot;,
&quot;.oooooo.&quot;,
&quot;.dd..dd.&quot;
],
pot:[
&quot;...ww...&quot;,
&quot;..wwww..&quot;,

&quot;.rrrrrr.&quot;,
&quot;.rrwwrr.&quot;,
&quot;.rrrrrr.&quot;,
&quot;.rrrrrr.&quot;,
&quot;..rrrr..&quot;,
&quot;........&quot;
],
mana:[
&quot;...ww...&quot;,
&quot;..wwww..&quot;,
&quot;.tttttt.&quot;,
&quot;.ttwwtt.&quot;,
&quot;.tttttt.&quot;,
&quot;.tttttt.&quot;,
&quot;..tttt..&quot;,
&quot;........&quot;
],
gold:[
&quot;........&quot;,
&quot;..gggg..&quot;,
&quot;.gffffg.&quot;,
&quot;.gffffg.&quot;,
&quot;.gffffg.&quot;,
&quot;.gffffg.&quot;,
&quot;..gggg..&quot;,
&quot;........&quot;
],
wpn:[
&quot;....ww..&quot;,
&quot;....ww..&quot;,
&quot;....ww..&quot;,
&quot;....ww..&quot;,
&quot;...gggg.&quot;,
&quot;....dd..&quot;,
&quot;....dd..&quot;,
&quot;........&quot;
],
arm:[
&quot;.cc..cc.&quot;,
&quot;.cccccc.&quot;,
&quot;cccccccc&quot;,
&quot;cccccccc&quot;,
&quot;cccccccc&quot;,
&quot;.cccccc.&quot;,
&quot;..cccc..&quot;,
&quot;........&quot;
],
scr:[
&quot;.wwwwww.&quot;,
&quot;wwwwwwww&quot;,
&quot;wwkkkkww&quot;,
&quot;wwwwwwww&quot;,

&quot;wwkkkkww&quot;,
&quot;wwwwwwww&quot;,
&quot;.wwwwww.&quot;,
&quot;........&quot;
],
};
const SPR={};
for(const name in SPRD){
const rows=SPRD[name];
const sw=rows[0].length,sh=rows.length;
const c=document.createElement(&#39;canvas&#39;);c.width=sw;c.height=sh;
const g=c.getContext(&#39;2d&#39;);
rows.forEach((row,y)=&gt;{for(let x=0;x&lt;sw;x++){const ch=row[x];
if(ch!==&#39;.&#39;&amp;&amp;PAL[ch]){g.fillStyle=PAL[ch];g.fillRect(x,y,1,1);}}});
SPR[name]=c;
}
function drawSpr(s,dx,dy,w=16,h=16){
const img=SPR[s];
if(img)ctx.drawImage(img,0,0,img.width,img.height,dx,dy,w,h);
}
/* ── แผ่นกระเบื้อง (วาดแบบสุ่มมีพื้นผิว) ── */
const TILEC=[];
(function(){
for(const v of [0,1]){
const c=document.createElement(&#39;canvas&#39;);c.width=T;c.height=T;const
g=c.getContext(&#39;2d&#39;);
g.fillStyle=&#39;#54372a&#39;;g.fillRect(0,0,T,T);
g.fillStyle=&#39;#3d2418&#39;;
g.fillRect(0,3,T,1);g.fillRect(0,11,T,1);
for(let x=(v?6:2);x&lt;T;x+=7)g.fillRect(x,0,1,3);
for(let x=(v?2:9);x&lt;T;x+=7)g.fillRect(x,4,1,7);
for(let x=(v?8:4);x&lt;T;x+=7)g.fillRect(x,12,1,4);
g.fillStyle=&#39;#6b4634&#39;;g.fillRect(0,0,T,1);
TILEC[0]=TILEC[0]||[];TILEC[0].push(c);
}
for(const v of [0,1]){
const c=document.createElement(&#39;canvas&#39;);c.width=T;c.height=T;const
g=c.getContext(&#39;2d&#39;);
g.fillStyle=&#39;#241322&#39;;g.fillRect(0,0,T,T);
g.fillStyle=&#39;#2e1a2c&#39;;
for(let i=0;i&lt;7;i++)g.fillRect((v*5+i*5)%15,(i*7+v*3)%15,1,1);
if(v){g.fillStyle=&#39;#5c4a1e&#39;;g.fillRect(11,5,1,1);}
TILEC[1]=TILEC[1]||[];TILEC[1].push(c);
}
{const c=document.createElement(&#39;canvas&#39;);c.width=T;c.height=T;const g=c.getContext(&#39;2d&#39;);
g.fillStyle=&#39;#0b0512&#39;;g.fillRect(0,0,T,T);
g.strokeStyle=&#39;#2ec4a6&#39;;g.beginPath();g.arc(8,8,5,0,5);g.stroke();
g.strokeStyle=&#39;#f5c542&#39;;g.beginPath();g.arc(8,8,2.5,1,6);g.stroke();
g.fillStyle=&#39;#f5c542&#39;;g.fillRect(7,7,2,2);TILEC[2]=[c];}
{const c=document.createElement(&#39;canvas&#39;);c.width=T;c.height=T;const g=c.getContext(&#39;2d&#39;);
g.fillStyle=&#39;#241322&#39;;g.fillRect(0,0,T,T);

g.fillStyle=&#39;#6e1f2b&#39;;g.fillRect(2,9,12,6);
g.fillStyle=&#39;#8f2438&#39;;g.fillRect(3,10,10,1);
g.fillStyle=&#39;#f5c542&#39;;g.fillRect(3,8,10,1);g.fillRect(6,4,4,5);g.fillRect(7,2,2,2);
TILEC[3]=[c];}
{const c=document.createElement(&#39;canvas&#39;);c.width=T;c.height=T;const g=c.getContext(&#39;2d&#39;);
g.fillStyle=&#39;#241322&#39;;g.fillRect(0,0,T,T);
g.fillStyle=&#39;#4a1620&#39;;g.fillRect(2,9,12,6);g.fillStyle=&#39;#7a5a10&#39;;g.fillRect(6,4,4,5);
TILEC[4]=[c];}
})();
/* ── ตารางข้อมูล ── */
const CLASSES={
ksatriya:{name:&#39;กษัตริย์&#39;,sprite:&#39;warrior&#39;,hp:30,mp:8,atk:6,def:3,dodge:5,
mantras:[&#39;vajra@3&#39;],desc:&#39;ทายาทกรุงอโยธยา — เลือดและโจมตีสูงสุด&#39;},
brahmin:{name:&#39;พราหมณ์&#39;,sprite:&#39;brahmin&#39;,hp:20,mp:20,atk:4,def:2,dodge:5,
mantras:[&#39;agni&#39;,&#39;heal&#39;],desc:&#39;ผู้ถือมนตรา เริ่มด้วยอัคนีและอมฤต&#39;},
vanara:{name:&#39;วานร&#39;,sprite:&#39;vanara&#39;,hp:24,mp:10,atk:5,def:2,dodge:20,
mantras:[&#39;vaju@3&#39;],desc:&#39;ทหารลิงผู้ว่องไว หลบหลีก ๒๐%&#39;},
rishi:{name:&#39;ฤๅษี&#39;,sprite:&#39;rishi&#39;,hp:22,mp:16,atk:3,def:2,dodge:8,
mantras:[&#39;heal&#39;,&#39;agni@4&#39;],desc:&#39;นักพรตแห่งป่าทัณฑก สมดุลทุกด้าน&#39;},
};
const MANTRAS={
agni:{n:&#39;อัคนี&#39;,mp:5,ic:&#39;✹&#39;,d:&#39;เพลิงสังหารศัตรูที่มองเห็น&#39;},
heal:{n:&#39;อมฤต&#39;,mp:6,ic:&#39;✚&#39;,d:&#39;ฟื้นฟู ๑๐ + ๒×เลเวล&#39;},
vaju:{n:&#39;วายุ&#39;,mp:8,ic:&#39;❋&#39;,d:&#39;พายุรอบตัว รัศมี ๒ ช่อง&#39;},
vajra:{n:&#39;วัชระ&#39;,mp:12,ic:&#39;⌁&#39;,d:&#39;สายฟ้าพระอินทร์ โจมตีรุนแรง&#39;},
};
const FOES=[
{id:&#39;preta&#39;,name:&#39;เปรต&#39;,sprite:&#39;preta&#39;,hp:8,atk:4,def:0,xp:6,g:3,min:1,max:7},
{id:&#39;asura&#39;,name:&#39;อสุรกาย&#39;,sprite:&#39;asura&#39;,hp:14,atk:6,def:1,xp:11,g:5,min:2,max:12},
{id:&#39;naga&#39;,name:&#39;นาคพิษ&#39;,sprite:&#39;naga&#39;,hp:12,atk:5,def:1,xp:13,g:6,min:3,max:13,ranged:true},
{id:&#39;rakshasa&#39;,name:&#39;รากษส&#39;,sprite:&#39;rakshasa&#39;,hp:22,atk:8,def:2,xp:19,g:9,min:6,max:16},
{id:&#39;yaksha&#39;,name:&#39;ยักษ์ทวารบาล&#39;,sprite:&#39;yaksha&#39;,hp:32,atk:10,def:3,xp:27,g:13,min:9,max:18},
];
const BOSSES={
5:{name:&#39;พญาขร&#39;,sprite:&#39;rakshasa&#39;,hp:65,atk:9,def:2,xp:70},
10:{name:&#39;มารีศ&#39;,sprite:&#39;asura&#39;,hp:110,atk:12,def:3,xp:120},
15:{name:&#39;กุมภกรรณ&#39;,sprite:&#39;yaksha&#39;,hp:170,atk:15,def:5,xp:180},
20:{name:&#39;ทศกัณฐ์&#39;,sprite:&#39;boss&#39;,hp:260,atk:19,def:6,xp:0},
};
const WEAPONS=[null,{n:&#39;ขรรค์เหล็ก&#39;,a:2},{n:&#39;ขรรค์อัคนี&#39;,a:4},{n:&#39;ตรีศูล&#39;,a:7},
{n:&#39;วัชระ&#39;,a:10},{n:&#39;จักรสุทรรศน์&#39;,a:14}];
const ARMORS=[null,{n:&#39;ผ้ามัสลิน&#39;,d:1},{n:&#39;เกราะโซ่&#39;,d:3},{n:&#39;เกราะเกล็ดนาค&#39;,d:5},
{n:&#39;เกราะวัชรัง&#39;,d:8},{n:&#39;เกราะเทพ&#39;,d:11}];

const
FLOOR_TITLES=[&#39;ประตูวิหาร&#39;,&#39;โถงเทียน&#39;,&#39;ระเบียงอสูร&#39;,&#39;คุกเปรต&#39;,&#39;ลานรากษส&#39;,&#39;ห้องมนตรา&#39;,&#39;อุโมงค์นาค&#39;,&#39;ท้องพร
ะโรง&#39;];
const
ABYSS_TITLES=[&#39;ห้วงอเวจี&#39;,&#39;วังวนกรรม&#39;,&#39;เพลิงกัลป์&#39;,&#39;ลานวิญญาณ&#39;,&#39;ทะเลมาร&#39;,&#39;วิหารร้าง&#39;,&#39;มิติมายา&#39;,&#39;สังสารวัฏ&#39;];
function getFoePool(fl){
const pool = FOES.filter(f =&gt; fl &gt;= f.min &amp;&amp; fl &lt;= f.max);
return pool.length ? pool : FOES.slice(2); // ถ้าเกินชั้น 18 ให้ใช้ศัตรูระดับสูง (นาค, รากษส,
ยักษ์)
}
function getBoss(fl){
if(BOSSES[fl])return BOSSES[fl];
if(fl%5===0 &amp;&amp; fl&gt;20){
const cycle = Math.floor(fl/5) - 4;
const btype = (Math.floor(fl/5)-1)%4;
const names = [&#39;พญาขร อเวจี&#39;, &#39;มารีศ อวตาร&#39;, &#39;กุมภกรรณ มารคลั่ง&#39;, &#39;ทศกัณฐ์ จุติใหม่&#39;];
const sprites = [&#39;rakshasa&#39;, &#39;asura&#39;, &#39;yaksha&#39;, &#39;boss&#39;];
const baseHps = [85, 140, 210, 310];
const baseAtks = [12, 15, 18, 23];
return {
name: names[btype] + &#39; (วัฏฏะ &#39; + thaiNum(cycle) + &#39;)&#39;,
sprite: sprites[btype],
hp: baseHps[btype] + fl * 4,
atk: baseAtks[btype] + Math.floor(fl * 0.4),
def: 3 + Math.floor(fl * 0.2),
xp: 160 + fl * 10
};
}
return null;
}

/* ── สถานะเกม &amp; เอฟเฟกต์ ── */
let state=&#39;title&#39;,map,seen,vis,player=null,enemies=[],npcs=[],items=[];
let floor=1,seed=0,stairs={x:0,y:0,locked:false},kills={},time=0,endless=false;
let shake=0,flash=0,floats=[],logs=[];
let slashes=[],sparks=[]; // เอฟเฟกต์คมดาบและประกายไฟ
let playerBump={x:0,y:0,time:0}; // อนิเมชันพุ่งกระแทก
/* ── สร้างดันเจี้ยน ── */
function genFloor(fl){
floor=fl;floorR=mulberry32((seed^(fl*2654435761))&gt;&gt;&gt;0);
map=new Uint8Array(W*H);seen=new Uint8Array(W*H);vis=new Uint8Array(W*H);
enemies=[];npcs=[];items=[];kills={};slashes=[];sparks=[];
const rooms=[];
for(let i=0;i&lt;70&amp;&amp;rooms.length&lt;10;i++){
const w=4+Math.floor(floorR()*7),h=3+Math.floor(floorR()*5);

const x=1+Math.floor(floorR()*(W-w-2)),y=1+Math.floor(floorR()*(H-h-2));
if(rooms.some(r=&gt;x&lt;r.x+r.w+1&amp;&amp;x+w+1&gt;r.x&amp;&amp;y&lt;r.y+r.h+1&amp;&amp;y+h+1&gt;r.y))continue;
rooms.push({x,y,w,h,cx:x+(w&gt;&gt;1),cy:y+(h&gt;&gt;1)});
}
const carve=(x,y)=&gt;{if(x&gt;0&amp;&amp;y&gt;0&amp;&amp;x&lt;W-1&amp;&amp;y&lt;H-1)map[y*W+x]=1;};
rooms.forEach(r=&gt;{for(let yy=r.y;yy&lt;r.y+r.h;yy++)for(let
xx=r.x;xx&lt;r.x+r.w;xx++)map[yy*W+xx]=1;});
for(let i=1;i&lt;rooms.length;i++){
const a=rooms[i-1],b=rooms[i];let x=a.cx,y=a.cy;
while(x!==b.cx){carve(x,y);x+=Math.sign(b.cx-x);}
while(y!==b.cy){carve(x,y);y+=Math.sign(b.cy-y);}
carve(x,y);
}
const fr=rooms[0],lr=rooms[rooms.length-1];
player.x=fr.cx;player.y=fr.cy;
stairs={x:lr.cx,y:lr.cy,locked:!!getBoss(fl)};
map[stairs.y*W+stairs.x]=2;
for(const r of rooms.slice(1,-1)){ // เทวาลัย
if(floorR()&lt;.2){map[(r.y+1)*W+r.x+1]=3;}
}
const nItems=5+Math.floor(floorR()*4);
for(let i=0;i&lt;nItems;i++){
const r=rooms[1+Math.floor(floorR()*(rooms.length-1))];
const x=r.x+Math.floor(floorR()*r.w),y=r.y+Math.floor(floorR()*r.h);
if(map[y*W+x]!==1||(x===player.x&amp;&amp;y===player.y))continue;
if(items.some(it=&gt;it.x===x&amp;&amp;it.y===y))continue;
items.push({x,y,...genGroundItem()});
}
if(fl%3===0){ // วาณิช + เควสต์
const r=rooms[rooms.length-2]||rooms[0];
const qfoes=getFoePool(fl);
const qt=qfoes[Math.floor(floorR()*qfoes.length)];
const stock=[
{t:&#39;pot&#39;,name:&#39;อมฤต&#39;,heal:14+fl*2,price:18+fl},
{t:&#39;mana&#39;,name:&#39;น้ำโสม&#39;,mana:12+fl*2,price:16+fl},
genW(Math.min(5,1+((fl+1)&gt;&gt;2))),
genA(Math.min(5,1+(fl&gt;&gt;2))),
genScr(),
];
npcs.push({type:&#39;merchant&#39;,x:r.cx,y:r.cy,sprite:&#39;merchant&#39;,stock,
q:{id:qt.id,name:qt.name,need:3+Math.floor(floorR()*3),got:0,reward:0,claimed:true}});
const q=npcs[npcs.length-1].q;
q.reward=q.need*(10+fl*2);q.claimed=false;
}
if(fl%4===1&amp;&amp;fl&gt;1){ // พระดาบส
const r=rooms[Math.floor(floorR()*rooms.length)];
npcs.push({type:&#39;hermit&#39;,x:r.cx,y:r.cy,sprite:&#39;hermit&#39;,used:false});
}
const boss=getBoss(fl);
const n=boss?5:Math.min(12,4+Math.floor(fl*0.9));
for(let i=0;i&lt;n;i++){

const r=rooms[1+Math.floor(floorR()*(rooms.length-1))];
const x=r.x+Math.floor(floorR()*r.w),y=r.y+Math.floor(floorR()*r.h);
if(map[y*W+x]!==1||(Math.abs(x-player.x)+Math.abs(y-player.y))&lt;6)continue;
if(enemies.some(e=&gt;e.x===x&amp;&amp;e.y===y))continue;
const pool=getFoePool(fl);
const b=pool[Math.floor(floorR()*pool.length)];
enemies.push(spawnFoe(b,x,y));
}
if(boss){
const b={...boss,id:&#39;boss_&#39;+fl,boss:true,ranged:false,awake:false};
enemies.push(spawnFoe(b,lr.cx,Math.min(H-2,lr.cy+1)));
}
if(fl===1)msg(&#39;เจ้าก้าวเข้าสู่เงามืดของลงกา…&#39;);
else {
const tList = fl &gt; 20 ? ABYSS_TITLES : FLOOR_TITLES;
msg(&#39;ชั้น &#39;+thaiNum(fl)+&#39; — &#39;+tList[(fl-1)%tList.length]+(fl&gt;20?&#39; (อเวจี)&#39;:&#39;&#39;));
}
if(boss){msg(&#39;☠ นายทัพ &#39;+boss.name+&#39; ครองชั้นนี้!&#39;,&#39;warn&#39;);sfx.boss();}
computeFov();
}
function spawnFoe(base,x,y){
const hpBonus = Math.floor(floor * 1.3);
const atkBonus = Math.floor(floor * 0.4);
return {...base,x,y,awake:false,maxhp:base.hp+hpBonus,hp:base.hp+hpBonus,
atk:base.atk+atkBonus,g:base.g+(floor&gt;&gt;1),flash:0,bumpX:0,bumpY:0};
}
function genW(t){
const plus = floor &gt; 20 ? Math.floor((floor - 20) / 4) + 1 : 0;
const pName = plus ? &#39; +&#39; + thaiNum(plus) : &#39;&#39;;
return{t:&#39;wpn&#39;,name:WEAPONS[t].n+pName,v:WEAPONS[t].a+plus*2,tier:t,price:t*45+plus*30};
}
function genA(t){
const plus = floor &gt; 20 ? Math.floor((floor - 20) / 4) + 1 : 0;
const pName = plus ? &#39; +&#39; + thaiNum(plus) : &#39;&#39;;
return{t:&#39;arm&#39;,name:ARMORS[t].n+pName,v:ARMORS[t].d+plus*2,tier:t,price:t*40+plus*25};
}
function genScr(){
const keys=[&#39;agni&#39;,&#39;heal&#39;,&#39;vaju&#39;,&#39;vajra&#39;];
const k=keys[Math.floor(floorR()*4)];
return{t:&#39;scr&#39;,key:k,name:&#39;คัมภีร์&#39;+MANTRAS[k].n,price:35};
}
function genGroundItem(){
const r=floorR();
if(r&lt;.28)return{t:&#39;pot&#39;,name:&#39;อมฤต&#39;,heal:12+floor*2};
if(r&lt;.45)return{t:&#39;mana&#39;,name:&#39;น้ำโสม&#39;,mana:10+floor*2};
if(r&lt;.62)return{t:&#39;gold&#39;,amt:6+Math.floor(floorR()*(6+floor*3))};
if(r&lt;.75){const t=Math.min(5,1+((floor-1)&gt;&gt;2)+(floorR()&lt;.3?1:0));return genW(t);}
if(r&lt;.88){const t=Math.min(5,1+((floor-1)&gt;&gt;2));return genA(t);}
return genScr();
}

/* ── FOV / LOS ── */
function los(x0,y0,x1,y1){
let dx=Math.abs(x1-x0),dy=Math.abs(y1-y0),sx=x0&lt;x1?1:-1,sy=y0&lt;y1?1:-1,err=dx-dy;
while(!(x0===x1&amp;&amp;y0===y1)){
if(map[y0*W+x0]===0)return false;
const e2=2*err;
if(e2&gt;-dy){err-=dy;x0+=sx;}
if(e2&lt;dx){err+=dx;y0+=sy;}
}
return true;
}
function computeFov(){
vis.fill(0);const RAD=6;
for(let y=Math.max(0,player.y-RAD);y&lt;=Math.min(H-1,player.y+RAD);y++)
for(let x=Math.max(0,player.x-RAD);x&lt;=Math.min(W-1,player.x+RAD);x++){
const d2=(x-player.x)**2+(y-player.y)**2;
if(d2&gt;RAD*RAD+2)continue;
if(los(player.x,player.y,x,y)){vis[y*W+x]=1;seen[y*W+x]=1;}
}
}
/* ── เอฟเฟกต์ต่อสู้ ── */
function triggerSlash(x,y,color=&#39;#ffffff&#39;){
slashes.push({x,y,color,life:1});
sfx.slash();
// สร้างสะเก็ดไฟกระจาย
for(let i=0;i&lt;6;i++){
const ang=Math.random()*Math.PI*2,spd=1+Math.random()*2.5;
sparks.push({
x:x*T+8,y:y*T+8,
vx:Math.cos(ang)*spd,vy:Math.sin(ang)*spd,
c:color,life:1
});
}
}
/* ── การกระทำของผู้เล่น ── */
function canWalk(x,y){return x&gt;=0&amp;&amp;y&gt;=0&amp;&amp;x&lt;W&amp;&amp;y&lt;H&amp;&amp;map[y*W+x]!==0}
function enemyAt(x,y){return enemies.find(e=&gt;e.x===x&amp;&amp;e.y===y&amp;&amp;e.hp&gt;0)}
function npcAt(x,y){return npcs.find(n=&gt;n.x===x&amp;&amp;n.y===y)}
function tryMove(dx,dy){
if(state!==&#39;play&#39;)return;
const nx=player.x+dx,ny=player.y+dy;
if(!canWalk(nx,ny))return;
const e=enemyAt(nx,ny);
if(e){
// พุ่งกระแทกเข้าหาศัตรู
playerBump={x:dx*8,y:dy*8,time:4};
attackFoe(e);endTurn();return;
}
const n=npcAt(nx,ny);

if(n){interact(n);return;}
player.x=nx;player.y=ny;
const gi=items.findIndex(i=&gt;i.x===nx&amp;&amp;i.y===ny);
if(gi&gt;=0)pickup(gi);
if(map[ny*W+nx]===2){
if(stairs.locked){msg(&#39;มนตร์ดำผนึกบันไดไว้ — ต้องสังหารนายทัพเสียก่อน!&#39;,&#39;warn&#39;);}
else{
if(floor&gt;=FINAL &amp;&amp; !endless){victory();return;}
const nextB=getBoss(floor+1); $(&#39;stairsInfo&#39;).textContent=&#39;เบื้องล่างคือชั้น
&#39;+thaiNum(floor+1)+(nextB?&#39; …มีไอสังหารแรงกล้า (&#39;+nextB.name+&#39;)&#39;:&#39;&#39;);
show($(&#39;stairsOv&#39;));
}
}else if(map[ny*W+nx]===3){show($(&#39;altarOv&#39;));}
endTurn();
}
function waitTurn(){
if(state!==&#39;play&#39;)return;
player.mp=Math.min(player.mmp,player.mp+1);
msg(&#39;เจ้าสำรวมลมปราณ…&#39;);
endTurn();
}
function attackFoe(e){
const crit=rng()&lt;.15;
let d=Math.max(1,player.atk+player.wpn.v+R(3)-(e.def&gt;&gt;1));
if(crit)d&lt;&lt;=1;
e.hp-=d;e.awake=true;e.flash=5; // ศัตรูกระพริบขาวเมื่อโดนฟัน
triggerSlash(e.x,e.y,crit?&#39;#f5c542&#39;:&#39;#f4ecdc&#39;);
floats.push({x:e.x,y:e.y,t:&#39;-&#39;+d,c:crit?&#39;#f5c542&#39;:&#39;#ffffff&#39;,life:1});
shake=crit?8:4;sfx.hit();
if(e.hp&lt;=0)killFoe(e);else msg((crit?&#39;✦ คมขรรค์ฟันจุดตาย! &#39;:&#39;&#39;)+&#39;เจ้าฟัน&#39;+e.name+&#39; -&#39;+d);
}
function killFoe(e){
floats.push({x:e.x,y:e.y,t:&#39;✝&#39;,c:&#39;#ff8b1f&#39;,life:1});
player.xp+=e.xp;player.killsTotal++;kills[e.id]=(kills[e.id]||0)+1;
const g=e.g+R(e.g);player.gold+=g;
msg(e.name+&#39;แตกดับ! +&#39;+e.xp+&#39; ประสบการณ์ +&#39;+g+&#39; เหรียญ&#39;);
const r=rng();
if(r&lt;.12)items.push({x:e.x,y:e.y,t:&#39;pot&#39;,name:&#39;อมฤต&#39;,heal:12+floor*2});
else if(r&lt;.2)items.push({x:e.x,y:e.y,t:&#39;gold&#39;,amt:5+R(10)});
else if(r&lt;.27)items.push({x:e.x,y:e.y,...genGroundItem()});
enemies=enemies.filter(o=&gt;o!==e);
if(e.boss){
if(floor===FINAL &amp;&amp; !endless){victory();return;}
stairs.locked=false;sfx.stairs();
msg(&#39;ผนึกบันไดสลายแล้ว! ทางลงเปิดออก…&#39;,&#39;good&#39;);
items.push({x:e.x,y:e.y,...genGroundItem()});
player.gold+=30+floor*2;
}
checkLevel();
}

function checkLevel(){
let up=false;
while(player.xp&gt;=xpNeed(player.lvl)){
player.xp-=xpNeed(player.lvl);player.lvl++;up=true;
player.mhp+=7;player.mmp+=4;player.atk+=2;player.def+=1;
player.hp=Math.min(player.mhp,player.hp+(player.mhp&gt;&gt;1));
player.mp=player.mmp;
for(const s of CLASSES[player.cls].mantras){
if(!s.includes(&#39;@&#39;))continue;
const [k,l]=s.split(&#39;@&#39;);
if(player.lvl&gt;=+l&amp;&amp;!player.mantras.includes(k)){
player.mantras.push(k);msg(&#39;แจ้งแจ้งอาคม «&#39;+MANTRAS[k].n+&#39;» แล้ว!&#39;,&#39;good&#39;);
}
}
}
if(up){
msg(&#39;⟐ เลื่อนขั้นเป็นระดับ &#39;+thaiNum(player.lvl)+&#39;!&#39;,&#39;good&#39;);
floats.push({x:player.x,y:player.y,t:&#39;LEVEL UP&#39;,c:&#39;#f5c542&#39;,life:1.4});
sfx.level();
}
}
const xpNeed=l=&gt;l*25+(l-1)*(l-1)*5;
function hurtPlayer(d,src){
if(rng()*100&lt;player.dodge){msg(&#39;เจ้าพลิกตัวหลบ&#39;+src+&#39;ได้!&#39;);
floats.push({x:player.x,y:player.y,t:&#39;พลาด!&#39;,c:&#39;#2ec4a6&#39;,life:1});return;}
player.hp-=d;flash=.4;shake=6;sfx.hurt();
triggerSlash(player.x,player.y,&#39;#e5482e&#39;);
floats.push({x:player.x,y:player.y,t:&#39;-&#39;+d,c:&#39;#ff5a4d&#39;,life:1});
msg(src+&#39;ทำร้ายเจ้า -&#39;+d,&#39;warn&#39;);
if(player.hp&lt;=0)die();
}
/* ── เทิร์นศัตรู ── */
function enemiesAct(){
for(const e of enemies){
if(e.hp&lt;=0)continue;
const dx=player.x-e.x,dy=player.y-e.y,dist=Math.max(Math.abs(dx),Math.abs(dy));
if(vis[e.y*W+e.x]&amp;&amp;dist&lt;=9)e.awake=true;
if(!e.awake){
if(rng()&lt;.15){const d=[[1,0],[-1,0],[0,1],[0,-1]][R(4)];
if(canWalk(e.x+d[0],e.y+d[1])&amp;&amp;!enemyAt(e.x+d[0],e.y+d[1])&amp;&amp;!npcAt(e.x+d[0],e.y+d[1])
&amp;&amp;!(player.x===e.x+d[0]&amp;&amp;player.y===e.y+d[1])){e.x+=d[0];e.y+=d[1];}}
continue;
}
const playerArmDef = player.arm ? player.arm.v : 0;
if(dist===1){
// ศัตรูพุ่งกระแทกเข้าหาผู้เล่น
e.bumpX = Math.sign(dx)*6; e.bumpY = Math.sign(dy)*6;
let d=Math.max(1,e.atk+R(3)-((player.def+playerArmDef)&gt;&gt;1));
if(rng()&lt;.08){d&lt;&lt;=1;msg(e.name+&#39;จู่โจมเข้าจุดตาย!&#39;,&#39;warn&#39;);}

hurtPlayer(d,e.name);
continue;
}
if(e.ranged&amp;&amp;dist&lt;=5&amp;&amp;dist&gt;1&amp;&amp;los(e.x,e.y,player.x,player.y)){
// พ่นพิษคิดเกราะป้องกันด้วย
const d=Math.max(1,e.atk+R(2)-((player.def+playerArmDef)&gt;&gt;1));
hurtPlayer(d,e.name+&#39; (พ่นพิษ)&#39;);
triggerSlash(player.x,player.y,&#39;#43b05c&#39;);
continue;
}
const sx=Math.sign(dx),sy=Math.sign(dy);
const order=Math.abs(dx)&gt;Math.abs(dy)?[[sx,0],[0,sy]]:[[0,sy],[sx,0]];
for(const[mx,my]of order){
if(!mx&amp;&amp;!my)continue;
const nx=e.x+mx,ny=e.y+my;
if(canWalk(nx,ny)&amp;&amp;!enemyAt(nx,ny)&amp;&amp;!npcAt(nx,ny)&amp;&amp;!(nx===player.x&amp;&amp;ny===player.y)){
e.x=nx;e.y=ny;break;
}
}
}
}
function endTurn(){
if(state!==&#39;play&#39;)return;
enemiesAct();
if(player.hp&lt;=0)return;
time++;
// ฟื้นเลือดอัตโนมัติช้าๆ (1 HP ทุก 8 เทิร์น)
if(time%8===0&amp;&amp;player.hp&lt;player.mhp)player.hp++;
computeFov();updateHud();saveGame();
}
/* ── ของ / ร้านค้า / อาคม / เทวาลัย ── */
function pickup(gi){
const it=items[gi];items.splice(gi,1);
if(it.t===&#39;gold&#39;){player.gold+=it.amt;msg(&#39;เก็บเหรียญกษาปณ์ +&#39;+it.amt);sfx.gold();return;}
if(player.inv.length&gt;=10){msg(&#39;ถุงผ้าเต็ม! ของถูกทิ้งไว้…&#39;,&#39;warn&#39;);items.push(it);return;}
player.inv.push(it);sfx.pick();
msg(&#39;เก็บ «&#39;+it.name+&#39;»&#39;+statTxt(it));
}
function statTxt(it){
if(it.t===&#39;wpn&#39;)return &#39; โจมตี+&#39;+it.v;
if(it.t===&#39;arm&#39;)return &#39; ป้องกัน+&#39;+it.v;
if(it.t===&#39;pot&#39;)return &#39; ฟื้นเลือด+&#39;+it.heal;
if(it.t===&#39;mana&#39;)return &#39; ฟื้นมนตร์+&#39;+it.mana;
return &#39; (อาคม)&#39;;
}
function useItem(i){
const it=player.inv[i];if(!it)return;
if(it.t===&#39;pot&#39;){player.hp=Math.min(player.mhp,player.hp+it.heal);

msg(&#39;ดื่มอมฤต ฟื้นเลือด +&#39;+it.heal,&#39;good&#39;);sfx.pick();
player.inv.splice(i,1);}
else if(it.t===&#39;mana&#39;){player.mp=Math.min(player.mmp,player.mp+it.mana);
msg(&#39;ดื่มน้ำโสม ฟื้นมนตร์ +&#39;+it.mana,&#39;good&#39;);sfx.pick();
player.inv.splice(i,1);}
else if(it.t===&#39;wpn&#39;){
// สลับอาวุธเดิมกลับเข้ากระเป๋า ไม่สูญหาย
const oldWpn=player.wpn;
player.wpn=it;
player.inv.splice(i,1);
if(oldWpn&amp;&amp;oldWpn.tier&gt;0)player.inv.push(oldWpn);
msg(&#39;ถือ «&#39;+it.name+&#39;» โจมตี+&#39;+it.v);sfx.pick();
}
else if(it.t===&#39;arm&#39;){
// สลับเกราะเดิมกลับเข้ากระเป๋า ไม่สูญหาย
const oldArm=player.arm;
player.arm=it;
player.inv.splice(i,1);
if(oldArm&amp;&amp;oldArm.tier&gt;0)player.inv.push(oldArm);
msg(&#39;สวม «&#39;+it.name+&#39;» ป้องกัน+&#39;+it.v);sfx.pick();
}
else if(it.t===&#39;scr&#39;){
if(player.mantras.includes(it.key)){player.punya+=5;msg(&#39;แจ้งแจ้งอยู่แล้ว — กรานเป็นปุญ
+๕&#39;,&#39;good&#39;);}
else{player.mantras.push(it.key);msg(&#39;ศึกษา «&#39;+MANTRAS[it.key].n+&#39;»
สำเร็จ!&#39;,&#39;good&#39;);sfx.cast();}
player.inv.splice(i,1);
}
updateHud();
}
function castMantra(key){
if(state!==&#39;play&#39;)return;
const m=MANTRAS[key];
if(player.mp&lt;m.mp){msg(&#39;พลังมนตร์ไม่พอ…&#39;,&#39;warn&#39;);return;}
let used=true;
if(key===&#39;agni&#39;||key===&#39;vajra&#39;){
const visF=enemies.filter(e=&gt;vis[e.y*W+e.x])
.sort((a,b)=&gt;(Math.abs(a.x-player.x)+Math.abs(a.y-player.y))-(Math.abs(b.x-
player.x)+Math.abs(b.y-player.y)));
if(!visF.length){msg(&#39;ไม่มีศัตรูในระยะมองเห็น&#39;,&#39;warn&#39;);return;}
const t=visF[0];
const d=key===&#39;agni&#39;?6+player.lvl*2:12+player.lvl*3;
t.hp-=d;t.flash=6;
triggerSlash(t.x,t.y,key===&#39;agni&#39;?&#39;#ff8b1f&#39;:&#39;#f5c542&#39;);
floats.push({x:t.x,y:t.y,t:&#39;-&#39;+d,c:key===&#39;agni&#39;?&#39;#ff8b1f&#39;:&#39;#f5c542&#39;,life:1});
msg((key===&#39;agni&#39;?&#39;✹ เปลวเพลิง&#39;:&#39;⌁ สายฟ้าพระอินทร์&#39;)+&#39;สังหาร&#39;+t.name+&#39; -&#39;+d);
if(t.hp&lt;=0)killFoe(t);
}else if(key===&#39;heal&#39;){

const h=10+player.lvl*2;player.hp=Math.min(player.mhp,player.hp+h);
msg(&#39;✚ อมฤตชำระกาย ฟื้นเลือด +&#39;+h,&#39;good&#39;);
floats.push({x:player.x,y:player.y,t:&#39;+&#39;+h,c:&#39;#2ec4a6&#39;,life:1});
for(let i=0;i&lt;8;i++){
sparks.push({x:player.x*T+8,y:player.y*T+8,vx:(Math.random()-.5)*3,vy:-
Math.random()*3,c:&#39;#2ec4a6&#39;,life:1});
}
}else if(key===&#39;vaju&#39;){
let hitAny=false;
for(const e of enemies.slice()){
if(Math.max(Math.abs(e.x-player.x),Math.abs(e.y-player.y))&lt;=2){
const d=5+player.lvl;e.hp-=d;e.flash=5;hitAny=true;
triggerSlash(e.x,e.y,&#39;#2ec4a6&#39;);
floats.push({x:e.x,y:e.y,t:&#39;-&#39;+d,c:&#39;#2ec4a6&#39;,life:1});
if(e.hp&lt;=0)killFoe(e);
}
}
msg(&#39;❋ พายุวายุพัดกระหน่ำ&#39;+(hitAny?&#39;!&#39;:&#39; — แต่ไม่มีใครอยู่ในรัศมี&#39;));
}
if(used){player.mp-=m.mp;sfx.cast();hide($(&#39;mantraOv&#39;));endTurn();}
}
function interact(n){
if(n.type===&#39;merchant&#39;){renderShop(n);show($(&#39;shopOv&#39;));sfx.gold();}
else if(n.type===&#39;hermit&#39;){
if(!n.used){n.used=true;player.hp=player.mhp;player.mp=player.mmp;
msg(&#39;พระดาบสประสาทพร — ร่างกายฟื้นเต็ม!&#39;,&#39;good&#39;);sfx.level();updateHud();}
else msg(&#39;พระดาบสเข้าฌาน ไม่ตอบสนอง…&#39;);
}
}
function renderShop(n){
$(&#39;shopTalk&#39;).textContent=&#39;“ยินดีต้อนรับผู้กล้า จากชั้นบนข้าเจอของดีมาขาย…”&#39;;
$(&#39;shopGold&#39;).textContent=&#39;◉ &#39;+player.gold;
const q=$(&#39;shopQuest&#39;);
if(n.q&amp;&amp;!n.q.claimed){
const done=kills[n.q.id]||0;
q.innerHTML=&#39;&lt;div class=&quot;row&quot;&gt;&lt;span&gt;� เควสต์: ล่า &#39;+n.q.name+&#39; &#39;+done+&#39;/&#39;+n.q.need+
&#39; — รางวัล ◉&#39;+n.q.reward+&#39;&lt;/span&gt;&lt;button class=&quot;mini-btn&quot; id=&quot;qClaim&quot;&#39;+
(done&gt;=n.q.need?&#39;&#39;:&#39; disabled&#39;)+&#39;&gt;รับรางวัล&lt;/button&gt;&lt;/div&gt;&#39;;
const b=$(&#39;qClaim&#39;);
if(b)b.onclick=()=&gt;{
player.gold+=n.q.reward;player.punya+=5;msg(&#39;เควสต์สำเร็จ! รับ ◉&#39;+n.q.reward+&#39; และปุญ
+๕&#39;,&#39;good&#39;);
const qf=FOES.filter(f=&gt;floor&gt;=f.min&amp;&amp;floor&lt;=f.max);
const qt=qf[Math.floor(rng()*qf.length)];
n.q={id:qt.id,name:qt.name,need:3+R(3),got:0,reward:0,claimed:false};
n.q.reward=n.q.need*(10+floor*2);
sfx.buy();updateHud();renderShop(n);
};
}else q.innerHTML=&#39;&lt;div class=&quot;row dim&quot;&gt;— ไม่มีเควสต์ —&lt;/div&gt;&#39;;

const s=$(&#39;shopStock&#39;);s.innerHTML=&#39;&#39;;
n.stock.forEach((it,si)=&gt;{
const r=document.createElement(&#39;div&#39;);r.className=&#39;row&#39;;
r.innerHTML=&#39;&lt;span&gt;&#39;+it.name+statTxt(it)+&#39;&lt;/span&gt;&#39;;
const b=document.createElement(&#39;button&#39;);b.className=&#39;mini-btn&#39;;
b.textContent=&#39;◉ &#39;+it.price;b.disabled=player.gold&lt;it.price;
b.onclick=()=&gt;{
player.gold-=it.price;sfx.buy();
if(it.t===&#39;gold&#39;){player.gold+=it.amt;}
else if(player.inv.length&gt;=10){msg(&#39;ถุงผ้าเต็ม!&#39;,&#39;warn&#39;);player.gold+=it.price;return;}
else player.inv.push({...it});
msg(&#39;ซื้อ «&#39;+it.name+&#39;»&#39;);updateHud();renderShop(n);
};
r.appendChild(b);s.appendChild(r);
});
}
function pray(free){
hide($(&#39;altarOv&#39;));
if(!free&amp;&amp;player.gold&lt;20){msg(&#39;เหรียญไม่พอถวาย…&#39;,&#39;warn&#39;);return;}
const idx=player.y*W+player.x;
if(free)map[idx]=4;
if(!free){player.gold-=20;player.punya+=10;msg(&#39;เจ้าถวายเครื่องสักการะ ปุญ +๑๐&#39;,&#39;good&#39;);}
const luck=rng()+Math.min(.25,player.punya/200);
if(luck&gt;.8){const s=[&#39;atk&#39;,&#39;def&#39;,&#39;mhp&#39;][R(3)];
if(s===&#39;atk&#39;)player.atk++;else
if(s===&#39;def&#39;)player.def++;else{player.mhp+=5;player.hp+=5;}
msg(&#39;� เทพประทานพร! &#39;+(s===&#39;atk&#39;?&#39;โจมตี&#39;:s===&#39;def&#39;?&#39;ป้องกัน&#39;:&#39;เลือดสูงสุด&#39;)+&#39;
+ถาวร&#39;,&#39;good&#39;);sfx.level();}
else if(luck&gt;.45){player.hp=player.mhp;player.mp=player.mmp;
msg(&#39;� แสงศักดิ์สิทธิ์ชำระกาย — ฟื้นเต็ม!&#39;,&#39;good&#39;);sfx.level();}
else if(luck&gt;.12){msg(&#39;� เทพนิ่งเงียบ… ไม่มีสิ่งใดเกิดขึ้น&#39;);}
else{player.hp-=6;msg(&#39;� คำสาปจากวิหาร! -๖ เลือด&#39;,&#39;warn&#39;);sfx.hurt();
if(player.hp&lt;=0){die();return;}}
updateHud();endTurn();
}
function descend(){
hide($(&#39;stairsOv&#39;));sfx.stairs();
if(floor&gt;=FINAL &amp;&amp; !endless){victory();return;}
genFloor(floor+1);updateHud();saveGame();
}
/* ── ตาย / ชนะ / คะแนน ── */
function score(){return
floor*50+player.gold+player.lvl*30+player.punya*2+player.killsTotal*5}
function hallGet(){try{return
JSON.parse(localStorage.getItem(HALL_KEY))||[]}catch(e){return[]}}
function hallAdd(sc, win=false){
const h=hallGet();
const modeTag = (endless || floor &gt; 20) ? &#39; [อเวจี]&#39; : (win ? &#39; [โมกษะ]&#39; : &#39;&#39;);

h.push({n:CLASSES[player.cls].name + modeTag, f:floor, s:sc});
h.sort((a,b)=&gt;b.s-a.s);localStorage.setItem(HALL_KEY,JSON.stringify(h.slice(0,5)));
}
function hallInto(el){
const h=hallGet();
el.innerHTML=h.length?h.map(r=&gt;&#39;&lt;li&gt;&#39;+r.n+&#39; · ชั้น &#39;+thaiNum(r.f)+&#39; · กิตติยศ
&#39;+r.s+&#39;&lt;/li&gt;&#39;).join(&#39;&#39;)
:&#39;&lt;li&gt;ยังไม่มีผู้ใดจารึกนาม…&lt;/li&gt;&#39;;
}
function die(){
state=&#39;dead&#39;;sfx.dead();localStorage.removeItem(SAVE_KEY);
const sc=score();hallAdd(sc);
$(&#39;deadStats&#39;).innerHTML=&#39;เจ้าเดินทางถึง &lt;b&gt;ชั้น &#39;+thaiNum(floor)+&#39;&lt;/b&gt; · ระดับ
&#39;+thaiNum(player.lvl)+
&#39; · สังหาร &#39;+player.killsTotal+&#39; ตน&lt;br&gt;กิตติยศ &lt;b class=&quot;gold&quot;&gt;&#39;+sc+&#39;&lt;/b&gt;&#39;;
hallInto($(&#39;deadHall&#39;));show($(&#39;deadOv&#39;));
}
function enterEndless(){
hideAll();
endless=true;
msg(&#39;เจ้าปฏิเสธโมกษะ… ก้าวลงสู่ห้วงอเวจีอันไร้ที่สิ้นสุด!&#39;,&#39;warn&#39;);
sfx.boss();
state=&#39;play&#39;;
player.hp=player.mhp; player.mp=player.mmp; // ฟื้นพลังก่อนลงอเวจี
genFloor(21);
updateHud();
saveGame();
}
function victory(){
state=&#39;win&#39;;sfx.level();localStorage.removeItem(SAVE_KEY);
const sc=score()+500;hallAdd(sc,true);
$(&#39;winStats&#39;).innerHTML=&#39;ทศกัณฐ์ล่มสลาย แสงธรรมสาดส่องลงกา&lt;br&gt;&#39;+
&#39;เจ้าบรรลุ &lt;b class=&quot;gold&quot;&gt;โมกษะ&lt;/b&gt; — หลุดพ้นจากสังสารวัฏ!&lt;br&gt;กิตติยศ &lt;b
class=&quot;gold&quot;&gt;&#39;+sc+&#39;&lt;/b&gt;&#39;;
hallInto($(&#39;winHall&#39;));
// เพิ่มปุ่มทางเลือกดำดิ่งสู่อเวจี
let btnBox=$(&#39;winActs&#39;);
if(!btnBox){
btnBox=document.createElement(&#39;div&#39;);
btnBox.id=&#39;winActs&#39;;
btnBox.style.display=&#39;flex&#39;;btnBox.style.flexDirection=&#39;column&#39;;btnBox.style.gap=&#39;8px&#39;;btnBo
x.style.marginTop=&#39;10px&#39;;
const rBtn=$(&#39;btnRebirth2&#39;);
rBtn.parentNode.insertBefore(btnBox, rBtn);
}
btnBox.innerHTML=&#39;&lt;button class=&quot;btn&quot; id=&quot;btnEndless&quot;
style=&quot;background:#8f2438;color:#fff;border-color:#d43d2a;box-shadow:0 5px 0 #5c1422&quot;&gt;☠

ดำดิ่งสู่อเวจี (ลงต่อไม่สิ้นสุด)&lt;/button&gt;&#39;;
$(&#39;btnEndless&#39;).onclick=enterEndless;
show($(&#39;winOv&#39;));
}
/* ── เซฟ / โหลด (จำหมอกแผนที่ seen ด้วย) ── */
function saveGame(){
if(state!==&#39;play&#39;)return;
try{
localStorage.setItem(SAVE_KEY,JSON.stringify({
seed,floor,stairs,endless,
map:Array.from(map).join(&#39;&#39;),
seen:Array.from(seen).join(&#39;&#39;), // บันทึกช่องที่เคยเดิน
player:{...player},
enemies:enemies.map(e=&gt;({id:e.id,x:e.x,y:e.y,hp:e.hp,awake:e.awake})),
npcs,items,kills,
}));
}catch(e){}
}
function loadGame(){
try{
const s=JSON.parse(localStorage.getItem(SAVE_KEY));
if(!s||!s.player)return false;
seed=s.seed;floor=s.floor;stairs=s.stairs;endless=!!s.endless;kills=s.kills||{};
map=new Uint8Array(W*H);seen=new Uint8Array(W*H);vis=new Uint8Array(W*H);
for(let i=0;i&lt;W*H;i++)map[i]=+s.map[i];
if(s.seen){for(let i=0;i&lt;W*H;i++)seen[i]=+s.seen[i];}
player=s.player;items=s.items||[];npcs=s.npcs||[];
enemies=s.enemies.map(sav=&gt;{
const base=sav.id.startsWith(&#39;boss_&#39;)?getBoss(+sav.id.split(&#39;_&#39;)[1])
:FOES.find(f=&gt;f.id===sav.id);
return{...base,id:sav.id,x:sav.x,y:sav.y,hp:sav.hp,maxhp:base.hp+floor,awake:sav.awake,flash
:0,bumpX:0,bumpY:0};
}).filter(e=&gt;e.id);
state=&#39;play&#39;;computeFov();updateHud();setControlsHint();
msg(&#39;จิตของเจ้ากลับสู่ร่างเดิม… เดินทางต่อ!&#39;);
return true;
}catch(e){return false;}
}
/* ── สร้างตัวละคร / เริ่มเกม ── */
function startRun(cls){
seed=(Date.now()^(Math.random()*1e9))&gt;&gt;&gt;0;
rng=mulberry32(seed);
const C=CLASSES[cls];
player={x:0,y:0,cls,sprite:C.sprite,hp:C.hp,mhp:C.hp,mp:C.mp,mmp:C.mp,
atk:C.atk,def:C.def,dodge:C.dodge,lvl:1,xp:0,gold:30,punya:0,killsTotal:0,
wpn:{name:&#39;อาวุธฝึก&#39;,v:1,tier:0},arm:{name:&#39;ผ้าฝ้าย&#39;,v:0,tier:0},
inv:[{t:&#39;pot&#39;,name:&#39;อมฤต&#39;,heal:14}],mantras:[],floor:1};

for(const s of C.mantras){if(!s.includes(&#39;@&#39;))player.mantras.push(s);}
rng=Math.random;time=0;endless=false;floats=[];logs=[];slashes=[];sparks=[];
genFloor(1);state=&#39;play&#39;;
hideAll();updateHud();setControlsHint();saveGame();
}
/* ── การแสดงผล ── */
function msg(t,cls){
logs.unshift({t,cls});if(logs.length&gt;4)logs.pop();
logEl.innerHTML=logs.map(l=&gt;&#39;&lt;p&#39;+(l.cls?&#39; class=&quot;&#39;+l.cls+&#39;&quot;&#39;:&#39;&#39;)+&#39;&gt;&#39;+l.t+&#39;&lt;/p&gt;&#39;).join(&#39;&#39;);
}
function updateHud(){
if(!player)return;
$(&#39;hpFill&#39;).style.width=(100*player.hp/player.mhp)+&#39;%&#39;;
$(&#39;hpTxt&#39;).textContent=player.hp+&#39;/&#39;+player.mhp;
$(&#39;mpFill&#39;).style.width=(100*player.mp/player.mmp)+&#39;%&#39;;
$(&#39;mpTxt&#39;).textContent=player.mp+&#39;/&#39;+player.mmp;
$(&#39;lvChip&#39;).textContent=&#39;LV.&#39;+player.lvl;
$(&#39;floorChip&#39;).textContent=&#39;ชั้น &#39;+thaiNum(floor);
$(&#39;goldChip&#39;).textContent=&#39;◉ &#39;+player.gold;
$(&#39;punyaChip&#39;).textContent=&#39;✦ &#39;+player.punya;
}
function drawTile(mx, my, sx, sy){
const t = map[my * W + mx];
const px = sx * T, py = sy * T;
if(t === 0){
const v = ((mx * 7 + my * 13) &amp; 1);
ctx.drawImage(TILEC[0][v], px, py);
}
else if(t === 1){
const v = ((mx * 5 + my * 11) &amp; 1);
ctx.drawImage(TILEC[1][v], px, py);
}
else if(t === 2){
ctx.drawImage(TILEC[1][0], px, py);
ctx.drawImage(TILEC[2][0], px, py);
if(!stairs.locked){
ctx.fillStyle = &#39;rgba(46,196,166,&#39; + (0.15 + 0.15 * Math.sin(time * 0.15 +
mx)).toFixed(2) + &#39;)&#39;;
ctx.fillRect(px, py, T, T);
} else {
ctx.fillStyle = &#39;rgba(120,10,20,.45)&#39;;
ctx.fillRect(px, py, T, T);
}
}
else if(t === 3){
ctx.drawImage(TILEC[3][0], px, py);
const fl = Math.sin(time * 0.3 + mx * 3) &gt; 0;
ctx.fillStyle = &#39;#ff8b1f&#39;; ctx.fillRect(px + 7, py + (fl ? 0 : 1), 2, 2);
ctx.fillStyle = &#39;#ffe9a3&#39;; ctx.fillRect(px + 7, py + 1, 1, 1);
}

else if(t === 4){
ctx.drawImage(TILEC[4][0], px, py);
}
}
function render(){
if(state===&#39;title&#39;||state===&#39;classSel&#39;){drawMandala();return;}
if(!player)return;
ctx.setTransform(1,0,0,1,0,0);
ctx.fillStyle=&#39;#0a030c&#39;;ctx.fillRect(0,0,cv.width,cv.height);
let ox=0,oy=0;
if(shake&gt;0){shake*=.85;if(shake&lt;.4)shake=0;ox=(Math.random()-.5)*shake;oy=(Math.random()-
.5)*shake;}
ctx.translate(ox|0,oy|0);
const camX = clamp(player.x - (VW &gt;&gt; 1), 0, W - VW), camY = clamp(player.y - (VH &gt;&gt; 1), 0,
H - VH);
for(let vy = 0; vy &lt; VH; vy++) for(let vx = 0; vx &lt; VW; vx++){
const x = camX + vx, y = camY + vy;
if(!seen[y * W + x]) continue;
drawTile(x, y, vx, vy);
}
for(const it of items){ // ของบนพื้น
if(!seen[it.y*W+it.x])continue;
const sx=(it.x-camX)*T,sy=(it.y-camY)*T;
if(sx&lt;-T||sy&lt;-T||sx&gt;cv.width||sy&gt;cv.height)continue;
const ic={pot:&#39;pot&#39;,mana:&#39;mana&#39;,gold:&#39;gold&#39;,wpn:&#39;wpn&#39;,arm:&#39;arm&#39;,scr:&#39;scr&#39;}[it.t];
drawSpr(ic,sx,sy+1);
}
for(const n of npcs){
if(!vis[n.y*W+n.x])continue;
drawSpr(n.sprite,(n.x-camX)*T,(n.y-camY)*T);
}
for(const e of enemies){
if(!vis[e.y*W+e.x])continue;
let ex=(e.x-camX)*T,ey=(e.y-camY)*T;
if(e.bumpX){ex+=e.bumpX;e.bumpX*=0.5;if(Math.abs(e.bumpX)&lt;0.5)e.bumpX=0;}
if(e.bumpY){ey+=e.bumpY;e.bumpY*=0.5;if(Math.abs(e.bumpY)&lt;0.5)e.bumpY=0;}
if(e.boss){ // รัศมีบอส
ctx.fillStyle=&#39;rgba(212,61,42,&#39;+(0.18+0.12*Math.sin(time*0.2)).toFixed(2)+&#39;)&#39;;
ctx.fillRect(ex-2,ey-2,T+4,T+4);
}
if(e.flash&gt;0){ // กระพริบขาวเมื่อโดนตี
e.flash--;
ctx.fillStyle=&#39;#ffffff&#39;;
ctx.fillRect(ex+1,ey+1,T-2,T-2);
} else {

drawSpr(e.sprite,ex,ey+(Math.sin(time*0.1+e.x)&gt;0.6?-1:0));
}
if(e.hp&lt;e.maxhp){ // หลอดเลือดศัตรู
ctx.fillStyle=&#39;#000&#39;;ctx.fillRect(ex,ey-3,T,2);
ctx.fillStyle=&#39;#e5482e&#39;;ctx.fillRect(ex,ey-3,T*Math.max(0,e.hp/e.maxhp),2);
}
}
if(player.hp&gt;0){
let px=(player.x-camX)*T,py=(player.y-camY)*T+(Math.sin(time*0.12)&gt;0?-1:0);
if(playerBump.time&gt;0){
playerBump.time--;
px+=playerBump.x; py+=playerBump.y;
playerBump.x*=0.6; playerBump.y*=0.6;
}
drawSpr(player.sprite,px,py);
}
for(let vy=0;vy&lt;VH;vy++)for(let vx=0;vx&lt;VW;vx++){ // หมอกสงคราม
const x=camX+vx,y=camY+vy;
if(!seen[y*W+x]){continue;}
if(!vis[y*W+x]){ctx.fillStyle=&#39;rgba(5,1,8,.62)&#39;;ctx.fillRect(vx*T,vy*T,T,T);}
}
// วาดเอฟเฟกต์ฟันดาบ (Slash Arc)
for(const s of slashes){
s.life-=.15;
ctx.strokeStyle=s.color;
ctx.lineWidth=2.5;
ctx.beginPath();
const sx=(s.x-camX)*T+8,sy=(s.y-camY)*T+8;
ctx.arc(sx,sy,9+((1-s.life)*6),Math.PI*0.8,Math.PI*2.1);
ctx.stroke();
}
slashes=slashes.filter(s=&gt;s.life&gt;0);
// วาดสะเก็ดไฟ (Sparks)
for(const sp of sparks){
sp.x+=sp.vx; sp.y+=sp.vy; sp.life-=.08;
ctx.fillStyle=sp.c;
ctx.fillRect(sp.x-camX*T,sp.y-camY*T,2,2);
}
sparks=sparks.filter(s=&gt;s.life&gt;0);
// ตัวเลขลอย
for(const f of floats){
f.life-=.025;
ctx.font=&#39;bold 7px monospace&#39;;ctx.textAlign=&#39;center&#39;;
ctx.fillStyle=f.c;ctx.globalAlpha=Math.max(0,Math.min(1,f.life));
ctx.fillText(f.t,(f.x-camX)*T+8,(f.y-camY)*T-6+(1-f.life)*-10);

ctx.globalAlpha=1;
}
floats=floats.filter(f=&gt;f.life&gt;0);
if(flash&gt;0){ctx.fillStyle=&#39;rgba(212,42,32,&#39;+(flash*.5).toFixed(2)+&#39;)&#39;;
ctx.fillRect(0,0,cv.width,cv.height);flash-=.05;}
ctx.setTransform(1,0,0,1,0,0);
drawMinimap(camX,camY);
}
function drawMinimap(){
if(state!==&#39;play&#39;){mcv.style.display=&#39;none&#39;;return;}
mcv.style.display=&#39;block&#39;;
mctx.fillStyle=&#39;#0d0412&#39;;mctx.fillRect(0,0,84,64);
for(let y=0;y&lt;H;y++)for(let x=0;x&lt;W;x++){
if(!seen[y*W+x])continue;
const t=map[y*W+x];
mctx.fillStyle=t===0?&#39;#42252e&#39;:t===2?&#39;#f5c542&#39;:t===3?&#39;#ff8b1f&#39;:&#39;#2a1626&#39;;
mctx.fillRect(x*2,y*2,2,2);
}
for(const e of
enemies){if(vis[e.y*W+e.x]){mctx.fillStyle=&#39;#ff3b2e&#39;;mctx.fillRect(e.x*2,e.y*2,2,2);}}
mctx.fillStyle=(time&amp;8)?&#39;#ffffff&#39;:&#39;#2ec4a6&#39;;
mctx.fillRect(player.x*2-1,player.y*2-1,3,3);
}
function drawMandala(){ // ฉากหน้าเมนู
ctx.fillStyle=&#39;#0d0412&#39;;ctx.fillRect(0,0,cv.width,cv.height);
const cx=cv.width/2,cy=cv.height/2+8;
for(let ring=0;ring&lt;4;ring++){
const rad=34+ring*32,pet=8+ring*4,rot=time*.002*(ring%2?1:-1);
ctx.strokeStyle=[&#39;#f5c542&#39;,&#39;#2ec4a6&#39;,&#39;#ff8b1f&#39;,&#39;#8f2438&#39;][ring];
ctx.globalAlpha=.3+.08*Math.sin(time*.05+ring);
ctx.beginPath();ctx.arc(cx,cy,rad,0,7);ctx.stroke();
for(let i=0;i&lt;pet;i++){
const a=rot+i*2*Math.PI/pet;
const px=cx+Math.cos(a)*rad,py=cy+Math.sin(a)*rad;
ctx.beginPath();ctx.arc(px,py,3+ring,0,7);ctx.stroke();
}
}
ctx.globalAlpha=1;
const fh=6+2*Math.sin(time*.35)+Math.sin(time*.9); // ประทีปกลางมณฑล
ctx.fillStyle=&#39;#7a4a22&#39;;ctx.fillRect(cx-6,cy+3,12,4);
ctx.fillStyle=&#39;#ff8b1f&#39;;ctx.fillRect(cx-2,cy-fh,4,fh);
ctx.fillStyle=&#39;#ffe9a3&#39;;ctx.fillRect(cx-1,cy-fh+2,2,fh-3);
}
let lastT=0;
function loop(t){time=Math.floor(t/50);render();requestAnimationFrame(loop)}
/* ── UI helpers ── */
function show(el){el.classList.remove(&#39;hidden&#39;)}
function hide(el){el.classList.add(&#39;hidden&#39;)}

function hideAll(){document.querySelectorAll(&#39;.ov&#39;).forEach(o=&gt;o.classList.add(&#39;hidden&#39;))}
let hintTimer=null;
function setControlsHint(){
const h=$(&#39;controlsHint&#39;);if(!h)return;
h.style.opacity=1;clearTimeout(hintTimer);
hintTimer=setTimeout(()=&gt;{h.style.opacity=0;},6000);
}
function dropItem(i){
const it=player.inv.splice(i,1)[0];
if(!it)return;
items.push({x:player.x,y:player.y,...it});
msg(&#39;เจ้าทิ้ง «&#39;+it.name+&#39;» ลงบนพื้น&#39;);
sfx.pick();
updateHud();
}
function renderInv(){
$(&#39;equip&#39;).innerHTML=&#39;⚔ &lt;b&gt;&#39;+player.wpn.name+&#39;&lt;/b&gt; +&#39;+player.wpn.v+
&#39; &amp;nbsp;·&amp;nbsp; �� &lt;b&gt;&#39;+player.arm.name+&#39;&lt;/b&gt; +&#39;+player.arm.v;
const list=$(&#39;invList&#39;);list.innerHTML=&#39;&#39;;
if(!player.inv.length){list.innerHTML=&#39;&lt;div class=&quot;row dim&quot;&gt;ถุงผ้าว่างเปล่า…&lt;/div&gt;&#39;;return;}
player.inv.forEach((it,i)=&gt;{
const r=document.createElement(&#39;div&#39;);r.className=&#39;row&#39;;
r.innerHTML=&#39;&lt;span&gt;&#39;+it.name+statTxt(it)+&#39;&lt;/span&gt;&#39;;
const btnBox=document.createElement(&#39;div&#39;);
btnBox.style.display=&#39;flex&#39;;btnBox.style.gap=&#39;6px&#39;;
const bUse=document.createElement(&#39;button&#39;);bUse.className=&#39;mini-
btn&#39;;bUse.textContent=&#39;ใช้&#39;;
bUse.onclick=()=&gt;{useItem(i);renderInv();};
const bDrop=document.createElement(&#39;button&#39;);bDrop.className=&#39;mini-
btn&#39;;bDrop.textContent=&#39;ทิ้ง&#39;;
bDrop.style.background=&#39;#5c2a3a&#39;;bDrop.style.color=&#39;#f4ecdc&#39;;bDrop.style.borderColor=&#39;#8a3d5
2&#39;;
bDrop.style.boxShadow=&#39;0 3px 0 #2a0d16&#39;;
bDrop.onclick=()=&gt;{dropItem(i);renderInv();};
btnBox.appendChild(bUse);btnBox.appendChild(bDrop);
r.appendChild(btnBox);list.appendChild(r);
});
}
function renderMantras(){
$(&#39;mpHint&#39;).textContent=&#39;พลังมนตร์ &#39;+player.mp+&#39;/&#39;+player.mmp;
const list=$(&#39;mantraList&#39;);list.innerHTML=&#39;&#39;;
if(!player.mantras.length){list.innerHTML=&#39;&lt;div class=&quot;row dim&quot;&gt;ยังไม่รู้แจ้งอาคมใด
ๆ&lt;/div&gt;&#39;;return;}
player.mantras.forEach(k=&gt;{
const m=MANTRAS[k];
const r=document.createElement(&#39;div&#39;);r.className=&#39;row&#39;;

r.innerHTML=&#39;&lt;span&gt;&#39;+m.ic+&#39; &lt;b&gt;&#39;+m.n+&#39;&lt;/b&gt; &lt;span class=&quot;teal&quot;&gt;&#39;+m.mp+&#39; มนตร์&lt;/span&gt;&lt;br&gt;&#39;+
&#39;&lt;small class=&quot;dim&quot;&gt;&#39;+m.d+&#39;&lt;/small&gt;&lt;/span&gt;&#39;;
const b=document.createElement(&#39;button&#39;);b.className=&#39;mini-btn&#39;;b.textContent=&#39;ร่าย&#39;;
b.disabled=player.mp&lt;m.mp;b.onclick=()=&gt;castMantra(k);
r.appendChild(b);list.appendChild(r);
});
}
function renderRecords(){$(&#39;recordsList&#39;).innerHTML=hallGet().map(r=&gt;
&#39;&lt;li&gt;&#39;+r.n+&#39; · ชั้น &#39;+thaiNum(r.f)+&#39; · กิตติยศ &#39;+r.s+&#39;&lt;/li&gt;&#39;).join(&#39;&#39;)||&#39;&lt;li&gt;ยังว่าง…&lt;/li&gt;&#39;;}
function buildClassCards(){
const box=$(&#39;classList&#39;);box.innerHTML=&#39;&#39;;
for(const key in CLASSES){
const C=CLASSES[key];
const card=document.createElement(&#39;div&#39;);card.className=&#39;card&#39;;
card.innerHTML=&#39;&lt;canvas class=&quot;mini&quot; width=&quot;32&quot;
height=&quot;32&quot;&gt;&lt;/canvas&gt;&lt;h3&gt;&#39;+C.name+&#39;&lt;/h3&gt;&#39;+
&#39;&lt;small&gt;เลือด &#39;+C.hp+&#39; · มนตร์ &#39;+C.mp+&#39; · โจมตี &#39;+C.atk+&#39; · ป้อง &#39;+C.def+&#39;&lt;/small&gt;&#39;+
&#39;&lt;p&gt;&#39;+C.desc+&#39;&lt;/p&gt;&#39;;
const g=card.querySelector(&#39;canvas&#39;).getContext(&#39;2d&#39;);
g.imageSmoothingEnabled=false;
const img=SPR[C.sprite];
if(img)g.drawImage(img,0,0,img.width,img.height,0,0,32,32);
card.onclick=()=&gt;{initAudio();startRun(key);};
box.appendChild(card);
}
}
/* ── อินพุต ── */
function bindHold(btn,fn){
let timer=null;
const start=e=&gt;{e.preventDefault();initAudio();fn();
clearInterval(timer);timer=setInterval(fn,195);};
const end=e=&gt;{e.preventDefault();clearInterval(timer);timer=null;};
btn.addEventListener(&#39;pointerdown&#39;,start);
[&#39;pointerup&#39;,&#39;pointercancel&#39;,&#39;pointerleave&#39;].forEach(ev=&gt;btn.addEventListener(ev,end));
}
function setupInput(){
bindHold($(&#39;btnU&#39;),()=&gt;tryMove(0,-1));
bindHold($(&#39;btnD&#39;),()=&gt;tryMove(0,1));
bindHold($(&#39;btnL&#39;),()=&gt;tryMove(-1,0));
bindHold($(&#39;btnR&#39;),()=&gt;tryMove(1,0));
$(&#39;btnWait&#39;).addEventListener(&#39;pointerdown&#39;,e=&gt;{e.preventDefault();initAudio();waitTurn();})
;
$(&#39;btnMantra&#39;).onclick=()=&gt;{if(state===&#39;play&#39;){renderMantras();show($(&#39;mantraOv&#39;));}};
$(&#39;btnInv&#39;).onclick=()=&gt;{if(state===&#39;play&#39;){renderInv();show($(&#39;invOv&#39;));}};
$(&#39;btnHelp&#39;).onclick=()=&gt;show($(&#39;helpOv&#39;));
$(&#39;btnHelpT&#39;).onclick=()=&gt;show($(&#39;helpOv&#39;));
$(&#39;btnHelpClose&#39;).onclick=()=&gt;hide($(&#39;helpOv&#39;));
$(&#39;btnSnd&#39;).onclick=()=&gt;{initAudio();toggleSound();};
$(&#39;controls&#39;).addEventListener(&#39;contextmenu&#39;,e=&gt;e.preventDefault());
window.addEventListener(&#39;keydown&#39;,e=&gt;{

if(e.repeat)return;
initAudio();
if([&#39;ArrowUp&#39;,&#39;ArrowDown&#39;,&#39;ArrowLeft&#39;,&#39;ArrowRight&#39;,&#39;
&#39;].includes(e.key))e.preventDefault();
if(e.key===&#39;ArrowUp&#39;||e.key===&#39;w&#39;)tryMove(0,-1);
else if(e.key===&#39;ArrowDown&#39;||e.key===&#39;s&#39;)tryMove(0,1);
else if(e.key===&#39;ArrowLeft&#39;||e.key===&#39;a&#39;)tryMove(-1,0);
else if(e.key===&#39;ArrowRight&#39;||e.key===&#39;d&#39;)tryMove(1,0);
else if(e.key===&#39; &#39;)waitTurn();
else if(e.key===&#39;m&#39;){if(state===&#39;play&#39;){renderMantras();show($(&#39;mantraOv&#39;));}}
else if(e.key===&#39;i&#39;){if(state===&#39;play&#39;){renderInv();show($(&#39;invOv&#39;));}}
else if(e.key===&#39;h&#39;)show($(&#39;helpOv&#39;));
else if(e.key===&#39;Escape&#39;)hideAll();
});
/* ปุ่มเมนู / โอเวอร์เลย์ */
$(&#39;btnNew&#39;).onclick=()=&gt;{initAudio();hide($(&#39;title&#39;));show($(&#39;classSel&#39;));};
$(&#39;btnContinue&#39;).onclick=()=&gt;{initAudio();if(!loadGame()){msg(&#39;เซฟเสียหาย
เริ่มใหม่แทน&#39;);hideAll();show($(&#39;classSel&#39;));}};
$(&#39;btnRecords&#39;).onclick=()=&gt;{renderRecords();hide($(&#39;titleMenu&#39;));show($(&#39;recordsBox&#39;));};
$(&#39;btnRecordsBack&#39;).onclick=()=&gt;{hide($(&#39;recordsBox&#39;));show($(&#39;titleMenu&#39;));};
$(&#39;btnBackTitle&#39;).onclick=()=&gt;{hide($(&#39;classSel&#39;));show($(&#39;title&#39;));};
$(&#39;btnInvClose&#39;).onclick=()=&gt;hide($(&#39;invOv&#39;));
$(&#39;btnMantraClose&#39;).onclick=()=&gt;hide($(&#39;mantraOv&#39;));
$(&#39;btnShopClose&#39;).onclick=()=&gt;{hide($(&#39;shopOv&#39;));endTurn();};
$(&#39;altarPray&#39;).onclick=()=&gt;pray(true);
$(&#39;altarOffer&#39;).onclick=()=&gt;pray(false);
$(&#39;altarGo&#39;).onclick=()=&gt;hide($(&#39;altarOv&#39;));
$(&#39;btnDescend&#39;).onclick=descend;
$(&#39;btnStay&#39;).onclick=()=&gt;hide($(&#39;stairsOv&#39;));
$(&#39;btnRebirth&#39;).onclick=()=&gt;{hideAll();show($(&#39;title&#39;));state=&#39;title&#39;;refreshTitle();};
$(&#39;btnRebirth2&#39;).onclick=()=&gt;{hideAll();show($(&#39;title&#39;));state=&#39;title&#39;;refreshTitle();};
}
function refreshTitle(){
if(localStorage.getItem(SAVE_KEY))show($(&#39;btnContinue&#39;));else hide($(&#39;btnContinue&#39;));
}
function fitCanvas(){
const r=stage.getBoundingClientRect();
const s=Math.max(1,Math.floor(Math.min((r.width-12)/320,(r.height-12)/240)));
cv.style.width=320*s+&#39;px&#39;;cv.style.height=240*s+&#39;px&#39;;
}
window.addEventListener(&#39;resize&#39;,fitCanvas);
/* ── เริ่มระบบ ── */
if(&#39;serviceWorker&#39; in navigator){
navigator.serviceWorker.register(&#39;sw.js&#39;).catch(()=&gt;{});
}
buildClassCards();setupInput();refreshTitle();fitCanvas();
requestAnimationFrame(loop);
