import {createHash,timingSafeEqual} from 'node:crypto';
import {config} from '../../lib/config.js';
import {flipDrop} from '../../lib/drop.js';
import {storage} from '../../lib/storage.js';
import {headers,preflight} from '../../lib/http.js';
function authorized(req){
 const expected=process.env.WORD_HUNT_DROP_TOKEN;
 if(typeof expected!=='string'||expected.length<40)return false;
 const match=/^Bearer ([A-Za-z0-9_-]{40,256})$/.exec(String(req.headers.authorization||''));
 if(!match)return false;
 const a=createHash('sha256').update(match[1]).digest(),b=createHash('sha256').update(expected).digest();
 return timingSafeEqual(a,b);
}
export default async function handler(req,res){
 headers(res);
 if(preflight(req,res,'POST'))return;
 if(req.method!=='POST')return res.status(405).json({error:'method'});
 if(!authorized(req))return res.status(401).json({error:'unauthorized'});
 try{
  const c=await config(),r=await flipDrop(c,storage,Date.now());
  return res.status(r.result==='flipped'?200:r.result==='already-live'?409:422).json(r);
 }catch{return res.status(503).json({error:'unavailable',recorded:false});}
}
