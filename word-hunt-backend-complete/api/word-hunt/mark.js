import {config} from '../../lib/config.js';
import {activeDay} from '../../lib/core.js';
import {currentDrop} from '../../lib/drop.js';
import {storage} from '../../lib/storage.js';
import {headers} from '../../lib/http.js';
// Never returns the hidden answer or any other day's page or marker.
export default async function handler(req,res){
 headers(res);if(req.method!=='GET')return res.status(405).json({error:'method'});
 try{
  const path=String(req.query?.path||'');
  if(!/^\/[a-zA-Z0-9/_-]+\.html$/.test(path)||path.length>180)return res.status(400).json({active:false});
  const c=await config(),now=Date.now(),drop=await currentDrop(c,storage,now),day=activeDay(c,now,drop);
  if(!day||day.target?.path!==path)return res.status(200).json({active:false});
  return res.status(200).json({active:true,marker:day.target.marker});
 }catch{return res.status(503).json({active:false});}
}
