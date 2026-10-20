import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import worker from '../dist/server/index.js';
const origin='https://audrea.test';
for(const path of ['/','/styles.css','/app.js','/scene.js','/data.js','/admin.css','/admin.js','/favicon.svg','/images/hero.jpg','/images/garden.jpg','/images/suite.jpg','/images/villa.jpg']){
 const res=await worker.fetch(new Request(origin+path),{});assert.equal(res.status,200,'Missing built resource: '+path);assert((await res.arrayBuffer()).byteLength>0);assert(res.headers.has('Content-Security-Policy'));
}
const protectedPage=await worker.fetch(new Request(origin+'/admin'),{});assert.equal(protectedPage.status,302);assert(protectedPage.headers.get('location').startsWith(origin+'/signin-with-chatgpt'));
const adminPage=await worker.fetch(new Request(origin+'/admin',{headers:{'oai-authenticated-user-id':'test-owner','oai-authenticated-user-email':'manager@example.com'}}),{});assert.equal(adminPage.status,200);assert((await adminPage.text()).includes('Resort Management'));
const html=await readFile(new URL('../public/index.html',import.meta.url),'utf8');assert(html.includes('AI-generated'));assert(!html.includes('/images/hero.png'));assert(!html.includes('onclick='));
console.log('PASS: built public routes, image assets, script assets, CSP, protected admin redirect and authenticated admin route.');
