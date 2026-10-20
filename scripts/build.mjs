import {readFile,writeFile,mkdir,readdir,copyFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
await copyFile(path.join(root,'src/data.js'),path.join(root,'public/data.js'));
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp'};
const bundle={};async function walk(dir,prefix=''){for(const entry of await readdir(dir,{withFileTypes:true})){if(entry.name.endsWith('.png'))continue;const full=path.join(dir,entry.name),name=prefix+'/'+entry.name;if(entry.isDirectory())await walk(full,name);else{const ext=path.extname(entry.name),binary=['.jpg','.webp'].includes(ext),bytes=await readFile(full);bundle[name]={type:types[ext]||'application/octet-stream',binary,content:bytes.toString(binary?'base64':'utf8')};}}}
await walk(path.join(root,'public'));
let worker=await readFile(path.join(root,'worker/index.js'),'utf8');const data=(await readFile(path.join(root,'src/data.js'),'utf8')).replaceAll('export ','');worker=worker.replace(/^import .*?from '\.\.\/src\/data\.js';\r?\n/,'').replace('/*__ASSET_BUNDLE__*/{}',JSON.stringify(bundle));
await mkdir(path.join(root,'dist/server'),{recursive:true});await mkdir(path.join(root,'dist/.openai'),{recursive:true});await writeFile(path.join(root,'dist/server/index.js'),data+'\n'+worker);await copyFile(path.join(root,'.openai/hosting.json'),path.join(root,'dist/.openai/hosting.json'));
console.log(JSON.stringify({built:true,assets:Object.keys(bundle).length,workerBytes:Buffer.byteLength(worker)}));
