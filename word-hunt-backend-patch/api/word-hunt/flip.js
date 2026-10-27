import {authorized} from '../../lib/drop-auth.js';
import {config} from '../../lib/config.js';
import {flipDrop} from '../../lib/drop.js';
import {storage} from '../../lib/storage.js';
import {headers,preflight} from '../../lib/http.js';
export default async function handler(req,res){
 headers(res);
 const pre=preflight(req,res,'POST');if(pre!==false)return;
 if(req.method!=='POST')return res.status(405).json({error:'method'});
 if(!authorized(req))return res.status(401).json({error:'unauthorized'});
 try{
  const c=await config(),r=await flipDrop(c,storage,Date.now());
  return res.status(r.result==='flipped'?200:r.result==='already-live'?409:422).json(r);
 }catch{return res.status(503).json({error:'unavailable',recorded:false});}
}
