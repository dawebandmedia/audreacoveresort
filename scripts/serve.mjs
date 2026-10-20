import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import worker from '../worker/index.js';
import {createDB} from './local-db.mjs';
const DB=createDB('.sites-runtime/preview.sqlite');const port=Number(process.env.PORT||5173);const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg'};
const server=http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://127.0.0.1:'+port);let p=url.pathname;if(p==='/signin-with-chatgpt'||p==='/signout-with-chatgpt'){res.writeHead(302,{Location:url.searchParams.get('return_to')||'/'});res.end();return;}
if(p.startsWith('/api/')){const chunks=[];for await(const c of req)chunks.push(c);const h=new Headers(req.headers);h.set('oai-authenticated-user-id','local-preview-owner');h.set('oai-authenticated-user-email','manager@example.com');const r=await worker.fetch(new Request(url,{method:req.method,headers:h,...(!['GET','HEAD'].includes(req.method)?{body:Buffer.concat(chunks)}:{})}),{DB,LOCAL_PREVIEW:true});res.writeHead(r.status,Object.fromEntries(r.headers));res.end(Buffer.from(await r.arrayBuffer()));return;}
if(p==='/')p='/index.html';if(p==='/admin'||p==='/admin/')p='/admin.html';if(p==='/data.js')p='/../src/data.js';let file=p==='/../src/data.js'?path.resolve('src/data.js'):path.resolve('public','.'+decodeURIComponent(p));if(p!=='/../src/data.js'&&!file.startsWith(path.resolve('public')+path.sep)){res.writeHead(403);res.end('Forbidden');return;}
try{await stat(file);const bytes=await readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(bytes);}catch{res.writeHead(404);res.end('Not found');}}catch(e){res.writeHead(500);res.end('Preview error: '+String(e));}});
server.listen(port,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:'+port+' (local-only mock identity; production uses hosting sign-in)'));
