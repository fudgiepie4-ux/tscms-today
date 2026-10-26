import {config} from '../../lib/config.js';
import {check} from '../../lib/core.js';
import {currentDrop} from '../../lib/drop.js';
import {storage} from '../../lib/storage.js';
import {headers,preflight,isDisabled} from '../../lib/http.js';
export default async function handler(req,res){
 const now=Date.now();headers(res);if(preflight(req,res,'POST'))return;
 if(req.method!=='POST')return res.status(405).json({error:'method'});
 if(!String(req.headers['content-type']||'').startsWith('application/json'))return res.status(415).json({error:'content-type'});
 if(isDisabled())return res.status(200).json({result:'closed',recorded:false});
 try{
  const body=typeof req.body==='string'?JSON.parse(req.body):req.body;
  if(!body||JSON.stringify(body).length>4096)return res.status(400).json({result:'invalid'});
  const c=await config(),drop=await currentDrop(c,storage,now);
  return res.status(200).json(await check(c,body,storage,now,drop));
 }catch{return res.status(503).json({result:'unavailable',recorded:false});}
}
