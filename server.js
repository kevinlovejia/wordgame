// Zero-dependency static server + two-player WebSocket room relay.
// Run: node server.js  (then open http://localhost:3344)
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const root = __dirname, rooms = new Map();
const mime = {'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css'};
function sendFrame(socket, message){const data=Buffer.from(JSON.stringify(message));const head=data.length<126?Buffer.from([0x81,data.length]):Buffer.from([0x81,126,data.length>>8,data.length&255]);socket.write(Buffer.concat([head,data]));}
function remove(room,socket){const players=rooms.get(room);if(!players)return;players.delete(socket);for(const peer of players)sendFrame(peer,{type:'leave'});if(!players.size)rooms.delete(room);}
const server=http.createServer((req,res)=>{let file=req.url==='/'?'index.html':req.url.split('?')[0];file=path.normalize(path.join(root,file));if(!file.startsWith(root)){res.writeHead(403);return res.end();}fs.readFile(file,(err,data)=>{if(err){res.writeHead(404);return res.end('Not found');}res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});res.end(data);});});
server.on('upgrade',(req,socket)=>{const u=new URL(req.url,'http://localhost'),room=u.searchParams.get('room');if(u.pathname!=='/ws'||!/^\d{4}$/.test(room)){socket.destroy();return;}const peers=rooms.get(room)||new Set();if(peers.size>=2){socket.destroy();return;}const key=req.headers['sec-websocket-key'];if(!key){socket.destroy();return;}socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: '+crypto.createHash('sha1').update(key+'258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64')+'\r\n\r\n');peers.add(socket);rooms.set(room,peers);socket.on('data',buf=>{const len=buf[1]&127,off=2+(len===126?2:len===127?8:0),mask=buf.subarray(off,off+4),payload=buf.subarray(off+4,off+4+len);for(let i=0;i<payload.length;i++)payload[i]^=mask[i%4];try{const m=JSON.parse(payload);for(const peer of peers)if(peer!==socket)sendFrame(peer,m);}catch{}});socket.on('close',()=>remove(room,socket));socket.on('error',()=>remove(room,socket));});
server.listen(process.env.PORT||3344,()=>console.log('词境运行于 http://localhost:3344'));
