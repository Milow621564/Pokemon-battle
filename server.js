const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';
const GAME_FILE = path.join(__dirname, 'pokemon_arena_v21_multiplayer.html');
const rooms = new Map();

function send(ws, msg){ if(ws.readyState === 1) ws.send(JSON.stringify(msg)); }
function broadcast(room, msg, except){ for(const p of room.players.values()) if(p.ws!==except) send(p.ws,msg); }
function safeName(n){ return String(n||'Joueur').replace(/[^\p{L}\p{N}_ -]/gu,'').trim().slice(0,18)||'Joueur'; }
function makeCode(){ let c; do{c=crypto.randomBytes(3).toString('hex').toUpperCase()}while(rooms.has(c)); return c; }
function roomState(room){
  return {type:'roomState',roomId:room.id,maxPlayers:room.maxPlayers,hostId:room.hostId,started:room.started,
    players:[...room.players.values()].map(p=>({id:p.id,name:p.name,ready:p.ready,team:p.team,species:p.species}))};
}
function broadcastState(room){ broadcast(room,roomState(room)); }
function leave(p){
  const r=p.roomId?rooms.get(p.roomId):null;
  if(!r)return;
  r.players.delete(p.id);
  if(r.hostId===p.id){ const next=r.players.values().next().value; r.hostId=next?.id||null; if(next) send(next.ws,{type:'host',hostId:r.hostId}); }
  if(r.players.size===0) rooms.delete(r.id); else broadcastState(r);
}

const server=http.createServer((req,res)=>{
  let u=new URL(req.url,`http://${req.headers.host}`);
  if(u.pathname==='/health'){res.writeHead(200,{'content-type':'application/json'});return res.end(JSON.stringify({ok:true,rooms:rooms.size}));}
  if(u.pathname==='/'||u.pathname==='/pokemon_arena_v21_multiplayer.html'){
    const data=fs.readFileSync(GAME_FILE);res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});return res.end(data);
  }
  res.writeHead(404);res.end('Not found');
});
const wss=new WebSocketServer({server});
wss.on('connection',ws=>{
  const p={ws,id:crypto.randomUUID(),name:'Joueur',roomId:null,ready:false,team:0,species:null};
  send(ws,{type:'hello',id:p.id});
  ws.on('message',raw=>{
    let m;try{m=JSON.parse(raw)}catch{return;}
    if(m.type==='create'){
      if(p.roomId)return;
      const max=Math.max(2,Math.min(100,Number(m.maxPlayers)||8));
      const id=makeCode();const r={id,maxPlayers:max,hostId:p.id,started:false,players:new Map()};rooms.set(id,r);
      p.name=safeName(m.name);p.roomId=id;p.team=0;r.players.set(p.id,p);send(ws,{type:'created',roomId:id});broadcastState(r);return;
    }
    if(m.type==='join'){
      const r=rooms.get(String(m.roomId||'').toUpperCase());
      if(!r)return send(ws,{type:'error',message:'Salon introuvable.'});
      if(r.started)return send(ws,{type:'error',message:'La partie a déjà commencé.'});
      if(r.players.size>=r.maxPlayers)return send(ws,{type:'error',message:'Salon complet.'});
      p.name=safeName(m.name);p.roomId=r.id;p.team=r.players.size;r.players.set(p.id,p);send(ws,{type:'joined',roomId:r.id});broadcastState(r);return;
    }
    const r=p.roomId?rooms.get(p.roomId):null;if(!r)return;
    if(m.type==='name'){p.name=safeName(m.name);broadcastState(r);}
    else if(m.type==='team'){p.species={id:Number(m.speciesId)||0,name:String(m.speciesName||'')};broadcastState(r);}
    else if(m.type==='ready'){p.ready=!!m.value;broadcastState(r);}
    else if(m.type==='start'){
      if(p.id!==r.hostId)return;
      if(r.players.size<2)return send(ws,{type:'error',message:'Il faut au moins 2 joueurs.'});
      if([...r.players.values()].some(x=>!x.species))return send(ws,{type:'error',message:'Tout le monde doit choisir son Pokémon.'});
      r.started=true;broadcast(r,{type:'start',players:roomState(r).players});
    }
    else if(m.type==='command'){
      if(!r.started)return;
      // Le serveur relaie uniquement les commandes du joueur vers l'hôte.
      const host=r.players.get(r.hostId); if(host)send(host.ws,{type:'remoteCommand',from:p.id,team:p.team,key:Number(m.key)||0});
    }
    else if(m.type==='snapshot'){
      if(p.id!==r.hostId)return;
      broadcast(r,{type:'snapshot',t:m.t,state:m.state},p.ws);
    }
    else if(m.type==='event'){
      if(p.id!==r.hostId)return;
      broadcast(r,{type:'event',event:m.event},p.ws);
    }
  });
  ws.on('close',()=>leave(p));
});
server.listen(PORT,HOST,()=>console.log(`Pokemon Arena multiplayer: http://${HOST}:${PORT}`));
