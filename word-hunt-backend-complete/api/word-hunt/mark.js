import {config} from '../../lib/config.js';
import {activeDay} from '../../lib/core.js';
import {currentDrop} from '../../lib/drop.js';
import {storage} from '../../lib/storage.js';
import {headers,preflight,isDisabled} from '../../lib/http.js';
export default async function handler(req,res){
 headers(res);
 const pre=preflight(req,res,'GET');if(pre!==false)return;
 if(req.method!=='GET')return res.status(405).json({error:'method'});
 if(isDisabled())return res.status(200).json({active:false});
 try{
  const path=String(req.query?.path||'');
  if(!/^\/[a-zA-Z0-9/_-]+\.html$/.test(path)||path.length>180)return res.status(400).json({active:false});
  const c=await config(),now=Date.now(),drop=await currentDrop(c,storage,now),day=activeDay(c,now,drop);
  if(!day||day.target?.path!==path)return res.status(200).json({active:false});
  // Only the active day's matching page may receive the visible-case target word.
  // Fail closed if private target data is incomplete; never guess a word.
  const target=day.target;
  if(typeof target.word!=='string'||target.word.length<1||target.word.length>100||/\s/u.test(target.word))
   return res.status(503).json({active:false});
  return res.status(200).json({active:true,marker:target.marker,word:target.word,contestDateCT:day.dateCT});
 }catch{return res.status(503).json({active:false});}
}
