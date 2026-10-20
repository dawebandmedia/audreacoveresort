import {DatabaseSync} from 'node:sqlite';
import {readFileSync,mkdirSync} from 'node:fs';
export function createDB(filename=':memory:'){
 if(filename!==':memory:')mkdirSync('.sites-runtime',{recursive:true});
 const sqlite=new DatabaseSync(filename);sqlite.exec('PRAGMA journal_mode=WAL;');
 if(!sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='reservations'").get())sqlite.exec(readFileSync(new URL('../drizzle/0000_audrea.sql',import.meta.url),'utf8'));
 function prepare(sql){return {sql,params:[],bind(...params){this.params=params;return this;},async first(){return sqlite.prepare(sql).get(...this.params)||null;},async all(){return {results:sqlite.prepare(sql).all(...this.params)};},async run(){const out=sqlite.prepare(sql).run(...this.params);return {success:true,meta:{changes:Number(out.changes),last_row_id:Number(out.lastInsertRowid)}};}};}
 return {prepare,async batch(statements){sqlite.exec('BEGIN IMMEDIATE;');try{const out=[];for(const s of statements)out.push(await s.run());sqlite.exec('COMMIT;');return out;}catch(e){sqlite.exec('ROLLBACK;');throw e;}},close(){sqlite.close();}};
}
