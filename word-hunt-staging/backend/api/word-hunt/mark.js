import {config} from '../../lib/config.js';
import {markPayload} from '../../lib/mark.js';
import {currentDrop} from '../../lib/drop.js';
import {storage} from '../../lib/storage.js';
import {headers,preflight,isDisabled} from '../../lib/http.js';
export default async function handler(req,res){
 headers(res);if(preflight(req,res,'GET'))return;
 if(req.method!=='GET')return res.status(405).json({error:'method'});
 if(isDisabled())return res.status(200).json({active:false});
 try{
  const path=String(req.query?.path||'');
  if(!/^\/[a-zA-Z0-9/_-]+\.html$/.test(path)||path.length>180)return res.status(400).json({active:false});
  const c=await config(),now=Date.now(),drop=await currentDrop(c,storage,now);
  return res.status(200).json(markPayload(c,now,drop,path));
 }catch{return res.status(503).json({active:false});}
}
