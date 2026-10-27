import {config} from '../../lib/config.js';
import {status} from '../../lib/core.js';
import {currentDrop} from '../../lib/drop.js';
import {storage} from '../../lib/storage.js';
import {headers,preflight,isDisabled} from '../../lib/http.js';
export default async function handler(req,res){
 headers(res);
 const pre=preflight(req,res,'GET');if(pre!==false)return;
 if(req.method!=='GET')return res.status(405).json({error:'method'});
 if(isDisabled())return res.status(200).json({state:'not-yet'});
 try{const c=await config(),now=Date.now(),drop=await currentDrop(c,storage,now);return res.status(200).json(status(c,now,drop));}
 catch{return res.status(503).json({state:'not-yet',error:'unavailable'});}
}
