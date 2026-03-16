
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const hoverLabel = document.getElementById("hoverLabel");

const state = {
  worldW: 34, worldH: 34, tileW: 64, tileH: 32,
  cameraX: 0, cameraY: 10, zoom: 1.22,
  dragging: false, dragStartX: 0, dragStartY: 0, cameraStartX: 0, cameraStartY: 0,
  player: { x: 12, y: 18, hp: 40, maxHp: 40 }, moveTarget: null, entities: []
};

function clamp(n,min,max){ return Math.max(min, Math.min(max, n)); }
function isoToScreen(ix,iy){ return { x:(ix-iy)*(state.tileW/2), y:(ix+iy)*(state.tileH/2) }; }
function screenToIso(sx,sy){
  const x=(sx/(state.tileW/2)+sy/(state.tileH/2))/2;
  const y=(sy/(state.tileH/2)-sx/(state.tileW/2))/2;
  return {x,y};
}
function worldToCanvas(ix,iy){
  const p = isoToScreen(ix,iy);
  return { x: canvas.width/2 + state.cameraX + p.x * state.zoom, y: 110 + state.cameraY + p.y * state.zoom };
}
function buildWorld(){
  state.entities = [
    {type:"houseTall", x:8, y:8},{type:"houseTall", x:10, y:7},{type:"houseWide", x:12, y:8},
    {type:"bankBooth", x:9, y:10},{type:"merchantStall", x:12, y:10},{type:"well", x:11, y:12},
    {type:"forge", x:8, y:12},{type:"anvil", x:9, y:13},{type:"fenceH", x:7, y:11},{type:"fenceH", x:6, y:12},
    {type:"fenceV", x:13, y:11},{type:"fenceV", x:13, y:12},{type:"banker", x:9, y:11},
    {type:"merchant", x:12, y:11},{type:"healer", x:10, y:14},{type:"signpost", x:14, y:14},
    {type:"cart", x:15, y:15},{type:"treeOak", x:16, y:14},{type:"treeOak", x:17, y:13},
    {type:"treeOak", x:18, y:14},{type:"treePine", x:19, y:12},{type:"treePine", x:20, y:13},
    {type:"treeOak", x:20, y:15},{type:"treePine", x:21, y:14},{type:"stump", x:17, y:15},
    {type:"rockCopper", x:16, y:20},{type:"rockCopper", x:17, y:20},{type:"rockIron", x:18, y:21},
    {type:"rockIron", x:17, y:22},{type:"reed", x:24, y:20},{type:"reed", x:25, y:21},
    {type:"reed", x:26, y:20},{type:"fishSpot", x:25, y:19},{type:"wolf", x:20, y:18, hp:10, maxHp:10},
    {type:"wolf", x:22, y:17, hp:10, maxHp:10}
  ];
}
function tileKind(x,y){
  if ((x>=6 && x<=14 && y>=7 && y<=14)) return "village";
  if ((x+y)%13===0 && x>14 && y>14) return "grass2";
  if (x>=23 && x<=27 && y>=18 && y<=22) return "water";
  if ((x+y>=28 && x+y<=33) || (x>=10 && x<=16 && y>=12 && y<=18)) return "road";
  return "grass";
}
function drawDiamond(x,y,fill,stroke){
  ctx.beginPath(); ctx.moveTo(x, y - state.tileH/2); ctx.lineTo(x + state.tileW/2, y); ctx.lineTo(x, y + state.tileH/2);
  ctx.lineTo(x - state.tileW/2, y); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke();
}
function drawTileAt(tx,ty){
  const p = worldToCanvas(tx,ty);
  const kind = tileKind(tx,ty);
  let fill="#99a06f", stroke="#5f6548";
  if(kind==="grass2"){ fill="#929a67"; stroke="#596046"; }
  if(kind==="road"){ fill="#a59c87"; stroke="#6b6557"; }
  if(kind==="village"){ fill="#aba38c"; stroke="#6d6759"; }
  if(kind==="water"){ fill="#78929f"; stroke="#516775"; }
  drawDiamond(p.x,p.y,fill,stroke);
  if(kind==="water"){ ctx.strokeStyle="rgba(220,240,255,.25)"; ctx.beginPath(); ctx.moveTo(p.x-10, p.y+2); ctx.lineTo(p.x+8,p.y-1); ctx.stroke(); }
}
function drawShadow(x,y,rx=18,ry=8,a=.2){ ctx.beginPath(); ctx.ellipse(x, y+12, rx, ry, 0, 0, Math.PI*2); ctx.fillStyle = `rgba(0,0,0,${a})`; ctx.fill(); }
function drawHpBar(x,y,hp,maxHp){
  const w=42,h=6; ctx.fillStyle="#3a2924"; ctx.fillRect(x-w/2,y,w,h); ctx.fillStyle="#8fcf7a";
  ctx.fillRect(x-w/2,y,Math.max(0,(hp/maxHp)*w),h); ctx.strokeStyle="#242114"; ctx.strokeRect(x-w/2,y,w,h);
}
function drawHumanoidBase(x,y, opt={}){
  const skin=opt.skin||"#d1b08f", hair=opt.hair||"#5a4030", top=opt.top||"#7d8d68", trim=opt.trim||"#d9d2b1", legs=opt.legs||"#5f6471", belt=opt.belt||"#59442d";
  drawShadow(x,y,17,7,.22);
  ctx.fillStyle=legs; ctx.fillRect(x-10,y-6,7,26); ctx.fillRect(x+3,y-6,7,26);
  ctx.fillStyle="#22211b"; ctx.fillRect(x-11,y+18,9,4); ctx.fillRect(x+2,y+18,9,4);
  ctx.fillStyle=top; ctx.fillRect(x-14,y-34,28,28); ctx.fillStyle=trim; ctx.fillRect(x-3,y-32,6,24); ctx.fillStyle=belt; ctx.fillRect(x-14,y-10,28,4);
  ctx.fillStyle=skin; ctx.fillRect(x-18,y-30,5,18); ctx.fillRect(x+13,y-30,5,18);
  ctx.fillStyle=skin; ctx.fillRect(x-8,y-48,16,16); ctx.fillStyle=hair; ctx.fillRect(x-9,y-53,18,8);
}
function drawSword(x,y){ ctx.fillStyle="#b8b7b4"; ctx.fillRect(x+17,y-26,3,22); ctx.fillStyle="#7b5d34"; ctx.fillRect(x+15,y-5,7,4); }
function drawShield(x,y){ ctx.fillStyle="#868388"; ctx.beginPath(); ctx.moveTo(x-20,y-24); ctx.lineTo(x-11,y-28); ctx.lineTo(x-8,y-18); ctx.lineTo(x-11,y-7); ctx.lineTo(x-20,y-10); ctx.closePath(); ctx.fill(); }
function drawPlayer(x,y){ drawHumanoidBase(x,y,{top:"#7d5a46",legs:"#565d72",hair:"#3a2d24",skin:"#cda889",trim:"#b79b81"}); drawSword(x,y); drawHpBar(x,y-60,state.player.hp,state.player.maxHp); }
function drawBanker(x,y){ drawHumanoidBase(x,y,{top:"#8fa87b",legs:"#6f7280",hair:"#ede8dc",skin:"#d9bb9f",trim:"#dce1d8"}); }
function drawMerchant(x,y){ drawHumanoidBase(x,y,{top:"#c1a25c",legs:"#5f533f",hair:"#6d5334",skin:"#d0ae8d",trim:"#e0cc8c"}); }
function drawHealer(x,y){ drawHumanoidBase(x,y,{top:"#dcded8",legs:"#8e8f95",hair:"#d0a17b",skin:"#d3b291",trim:"#f2f2ec"}); drawShield(x,y); }
function drawWolf(x,y,hp,maxHp){
  drawShadow(x,y,18,8,.2); ctx.fillStyle="#8b8c95";
  ctx.beginPath(); ctx.moveTo(x-20,y-16); ctx.lineTo(x-8,y-26); ctx.lineTo(x+12,y-23); ctx.lineTo(x+20,y-12); ctx.lineTo(x+12,y-5); ctx.lineTo(x-12,y-3); ctx.closePath(); ctx.fill();
  ctx.fillStyle="#72747d"; ctx.fillRect(x-13,y-4,4,16); ctx.fillRect(x-2,y-2,4,14); ctx.fillRect(x+8,y-4,4,15); ctx.fillRect(x+15,y-2,4,13);
  ctx.fillStyle="#666872"; ctx.beginPath(); ctx.moveTo(x+18,y-16); ctx.lineTo(x+28,y-18); ctx.lineTo(x+18,y-8); ctx.closePath(); ctx.fill(); drawHpBar(x,y-30,hp,maxHp);
}
function drawHouseTall(x,y){ drawShadow(x,y,22,9,.2); ctx.fillStyle="#c9b890"; ctx.fillRect(x-20,y-52,40,52); ctx.fillStyle="#8c5d36"; ctx.beginPath(); ctx.moveTo(x-24,y-52); ctx.lineTo(x,y-82); ctx.lineTo(x+24,y-52); ctx.closePath(); ctx.fill(); ctx.fillStyle="#704a2b"; ctx.fillRect(x-6,y-24,12,24); }
function drawHouseWide(x,y){ drawShadow(x,y,28,10,.2); ctx.fillStyle="#cabd98"; ctx.fillRect(x-30,y-40,60,40); ctx.fillStyle="#93663f"; ctx.beginPath(); ctx.moveTo(x-34,y-40); ctx.lineTo(x,y-66); ctx.lineTo(x+34,y-40); ctx.closePath(); ctx.fill(); ctx.fillStyle="#6b482b"; ctx.fillRect(x-4,y-22,10,22); ctx.fillStyle="#9bb0bc"; ctx.fillRect(x-20,y-25,10,8); ctx.fillRect(x+10,y-25,10,8); }
function drawBankBooth(x,y){ drawShadow(x,y,20,8,.2); ctx.fillStyle="#6b4e2f"; ctx.fillRect(x-24,y-24,48,24); ctx.fillStyle="#d3c18d"; ctx.fillRect(x-24,y-36,48,12); ctx.fillStyle="#7f633f"; ctx.fillRect(x-16,y-18,32,12); }
function drawMerchantStall(x,y){ drawShadow(x,y,20,8,.2); ctx.fillStyle="#74573a"; ctx.fillRect(x-18,y-18,36,18); ctx.fillStyle="#b45c56"; ctx.beginPath(); ctx.moveTo(x-22,y-18); ctx.lineTo(x,y-36); ctx.lineTo(x+22,y-18); ctx.closePath(); ctx.fill(); ctx.fillStyle="#d7b05f"; ctx.fillRect(x-10,y-12,8,6); ctx.fillRect(x+2,y-12,8,6); }
function drawWell(x,y){ drawShadow(x,y,18,8,.2); ctx.fillStyle="#7f838b"; ctx.fillRect(x-18,y-18,36,18); ctx.fillStyle="#565860"; ctx.fillRect(x-10,y-35,4,17); ctx.fillRect(x+6,y-35,4,17); ctx.strokeStyle="#5b4029"; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(x-8,y-35); ctx.lineTo(x+8,y-35); ctx.stroke(); ctx.fillStyle="#5f6d93"; ctx.fillRect(x-10,y-14,20,8); }
function drawForge(x,y){ drawShadow(x,y,20,8,.2); ctx.fillStyle="#5f626a"; ctx.fillRect(x-20,y-24,40,24); ctx.fillStyle="#e1b35a"; ctx.fillRect(x-8,y-14,16,10); ctx.fillStyle="#43454d"; ctx.fillRect(x-13,y-6,26,6); }
function drawAnvil(x,y){ drawShadow(x,y,15,7,.2); ctx.fillStyle="#80848d"; ctx.fillRect(x-13,y-16,26,9); ctx.fillRect(x-4,y-7,8,14); ctx.beginPath(); ctx.moveTo(x+13,y-16); ctx.lineTo(x+24,y-12); ctx.lineTo(x+13,y-8); ctx.closePath(); ctx.fill(); }
function drawFenceH(x,y){ drawShadow(x,y,14,5,.12); ctx.strokeStyle="#7a5d37"; ctx.lineWidth=4; ctx.beginPath(); ctx.moveTo(x-18,y-6); ctx.lineTo(x+18,y-6); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x-10,y-12); ctx.lineTo(x-10,y+4); ctx.moveTo(x+10,y-12); ctx.lineTo(x+10,y+4); ctx.stroke(); }
function drawFenceV(x,y){ drawShadow(x,y,10,5,.12); ctx.strokeStyle="#7a5d37"; ctx.lineWidth=4; ctx.beginPath(); ctx.moveTo(x-2,y-18); ctx.lineTo(x-2,y+6); ctx.moveTo(x+8,y-14); ctx.lineTo(x+8,y+10); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x-8,y-10); ctx.lineTo(x+14,y-10); ctx.stroke(); }
function drawSignpost(x,y){ drawShadow(x,y,12,6,.15); ctx.fillStyle="#7a5d37"; ctx.fillRect(x-3,y-22,6,22); ctx.fillStyle="#cdb88a"; ctx.fillRect(x+1,y-22,16,10); }
function drawCart(x,y){ drawShadow(x,y,20,8,.16); ctx.fillStyle="#7c5e39"; ctx.fillRect(x-22,y-18,36,14); ctx.fillStyle="#3d3324"; ctx.beginPath(); ctx.arc(x-14,y-2,6,0,Math.PI*2); ctx.arc(x+8,y-2,6,0,Math.PI*2); ctx.fill(); }
function drawTreeOak(x,y){ drawShadow(x,y,18,8,.18); ctx.fillStyle="#7b5932"; ctx.fillRect(x-5,y-34,10,34); ctx.fillStyle="#6f8450"; ctx.beginPath(); ctx.ellipse(x,y-48,24,22,0,0,Math.PI*2); ctx.fill(); ctx.fillStyle="#7c9359"; ctx.beginPath(); ctx.ellipse(x-8,y-52,10,8,0,0,Math.PI*2); ctx.ellipse(x+8,y-46,9,7,0,0,Math.PI*2); ctx.fill(); }
function drawTreePine(x,y){ drawShadow(x,y,17,8,.18); ctx.fillStyle="#7b5932"; ctx.fillRect(x-5,y-32,10,32); ctx.fillStyle="#5f7245"; ctx.beginPath(); ctx.moveTo(x,y-66); ctx.lineTo(x-20,y-42); ctx.lineTo(x-8,y-42); ctx.lineTo(x-24,y-22); ctx.lineTo(x+24,y-22); ctx.lineTo(x+8,y-42); ctx.lineTo(x+20,y-42); ctx.closePath(); ctx.fill(); }
function drawStump(x,y){ drawShadow(x,y,10,5,.14); ctx.fillStyle="#76562f"; ctx.fillRect(x-8,y-10,16,10); ctx.fillStyle="#9f835b"; ctx.fillRect(x-7,y-14,14,4); }
function drawRockCopper(x,y){ drawShadow(x,y,16,7,.18); ctx.fillStyle="#767c85"; ctx.beginPath(); ctx.moveTo(x-18,y-8); ctx.lineTo(x-8,y-28); ctx.lineTo(x+8,y-25); ctx.lineTo(x+18,y-10); ctx.lineTo(x+8,y+4); ctx.lineTo(x-10,y+2); ctx.closePath(); ctx.fill(); ctx.fillStyle="#c57a53"; ctx.fillRect(x-4,y-16,7,6); ctx.fillRect(x+6,y-12,5,5); }
function drawRockIron(x,y){ drawShadow(x,y,16,7,.18); ctx.fillStyle="#717882"; ctx.beginPath(); ctx.moveTo(x-18,y-8); ctx.lineTo(x-7,y-30); ctx.lineTo(x+12,y-22); ctx.lineTo(x+18,y-8); ctx.lineTo(x+8,y+4); ctx.lineTo(x-10,y+3); ctx.closePath(); ctx.fill(); ctx.fillStyle="#b0bbc8"; ctx.fillRect(x-2,y-18,8,5); }
function drawReed(x,y){ drawShadow(x,y,10,4,.1); ctx.strokeStyle="#768955"; ctx.lineWidth=2; for(let i=0;i<5;i++){ ctx.beginPath(); ctx.moveTo(x-6+i*3,y); ctx.lineTo(x-4+i*3,y-20-(i%2)*4); ctx.stroke(); } }
function drawFishSpot(x,y){ drawShadow(x,y,12,5,.08); ctx.strokeStyle="#d6e7f4"; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(x-3,y-2,7,0,Math.PI); ctx.stroke(); ctx.beginPath(); ctx.arc(x+8,y+1,5,0,Math.PI); ctx.stroke(); }

function drawEntity(e){
  const p = worldToCanvas(e.x,e.y);
  ctx.save(); ctx.translate(p.x,p.y); ctx.scale(state.zoom,state.zoom);
  switch(e.type){
    case "player": drawPlayer(0,0); break; case "banker": drawBanker(0,0); break; case "merchant": drawMerchant(0,0); break;
    case "healer": drawHealer(0,0); break; case "wolf": drawWolf(0,0,e.hp,e.maxHp); break; case "houseTall": drawHouseTall(0,0); break;
    case "houseWide": drawHouseWide(0,0); break; case "bankBooth": drawBankBooth(0,0); break; case "merchantStall": drawMerchantStall(0,0); break;
    case "well": drawWell(0,0); break; case "forge": drawForge(0,0); break; case "anvil": drawAnvil(0,0); break; case "fenceH": drawFenceH(0,0); break;
    case "fenceV": drawFenceV(0,0); break; case "signpost": drawSignpost(0,0); break; case "cart": drawCart(0,0); break; case "treeOak": drawTreeOak(0,0); break;
    case "treePine": drawTreePine(0,0); break; case "stump": drawStump(0,0); break; case "rockCopper": drawRockCopper(0,0); break;
    case "rockIron": drawRockIron(0,0); break; case "reed": drawReed(0,0); break; case "fishSpot": drawFishSpot(0,0); break;
  }
  ctx.restore();
}
function drawWorld(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  for(let y=0; y<state.worldH; y++) for(let x=0; x<state.worldW; x++) drawTileAt(x,y);
  const list = [...state.entities.map(e=>({...e, sort:e.x+e.y})), {type:"player", x:state.player.x, y:state.player.y, sort:state.player.x+state.player.y}].sort((a,b)=>a.sort-b.sort);
  for(const e of list) drawEntity(e);
}
function tickMovement(){
  if(!state.moveTarget) return;
  const dx = state.moveTarget.x - state.player.x, dy = state.moveTarget.y - state.player.y;
  if(dx===0 && dy===0){ state.moveTarget=null; return; }
  state.player.x += dx===0 ? 0 : (dx>0 ? 1 : -1);
  state.player.y += dy===0 ? 0 : (dy>0 ? 1 : -1);
}
let lastMove=0;
function loop(ts){ if(ts-lastMove>130){ tickMovement(); lastMove=ts; } drawWorld(); requestAnimationFrame(loop); }
function getMouseTile(evt){
  const rect = canvas.getBoundingClientRect();
  const mx = (evt.clientX-rect.left)*(canvas.width/rect.width), my = (evt.clientY-rect.top)*(canvas.height/rect.height);
  const sx = (mx - canvas.width/2 - state.cameraX)/state.zoom, sy = (my - 110 - state.cameraY)/state.zoom;
  const iso = screenToIso(sx,sy);
  return { x: clamp(Math.round(iso.x),0,state.worldW-1), y: clamp(Math.round(iso.y),0,state.worldH-1) };
}
function entityAtTile(tx,ty){ return state.entities.find(e => e.x===tx && e.y===ty); }
canvas.addEventListener("mousemove", evt => {
  const tile = getMouseTile(evt), e = entityAtTile(tile.x,tile.y);
  let label = "Walk here";
  if(e){
    const map = { banker:"Talk Banker", merchant:"Talk Merchant", healer:"Talk Healer", wolf:"Attack Wolf", treeOak:"Chop Tree", treePine:"Chop Tree",
      rockCopper:"Mine Rock", rockIron:"Mine Rock", fishSpot:"Fish", bankBooth:"Bank Booth", merchantStall:"Trade Stall", forge:"Use Forge",
      anvil:"Use Anvil", well:"Use Well", houseTall:"Enter House", houseWide:"Enter House" };
    label = map[e.type] || "Walk here";
  }
  hoverLabel.textContent = label;
});
canvas.addEventListener("click", evt => { state.moveTarget = getMouseTile(evt); });
canvas.addEventListener("contextmenu", e => e.preventDefault());
canvas.addEventListener("mousedown", e => { if(e.button===2){ state.dragging=true; state.dragStartX=e.clientX; state.dragStartY=e.clientY; state.cameraStartX=state.cameraX; state.cameraStartY=state.cameraY; }});
window.addEventListener("mouseup", ()=> state.dragging=false);
window.addEventListener("mousemove", e => { if(state.dragging){ state.cameraX = state.cameraStartX + (e.clientX-state.dragStartX); state.cameraY = state.cameraStartY + (e.clientY-state.dragStartY); }});
canvas.addEventListener("wheel", e => { e.preventDefault(); state.zoom += e.deltaY < 0 ? 0.08 : -0.08; state.zoom = clamp(state.zoom, 0.7, 1.8); }, {passive:false});
window.addEventListener("keydown", e => { const pan = 24; if(e.key==="ArrowLeft") state.cameraX += pan; if(e.key==="ArrowRight") state.cameraX -= pan; if(e.key==="ArrowUp") state.cameraY += pan; if(e.key==="ArrowDown") state.cameraY -= pan; });
buildWorld();
requestAnimationFrame(loop);
