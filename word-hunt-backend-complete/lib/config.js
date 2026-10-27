import {storage} from './storage.js';
import {dateCT,nextMidnight,validateConfig} from './core.js';

// Real values NEVER leave the server. The launch mode needs two independent gates.
export async function config(){
 if(process.env.VERCEL_ENV==='production'&&process.env.WORD_HUNT_ENABLE_REAL==='true'){
  if(!process.env.WORD_HUNT_CONFIG_JSON)throw Error('Private contest configuration missing');
  const c=validateConfig(JSON.parse(process.env.WORD_HUNT_CONFIG_JSON));
  if(c.testOnly!==false||c.manualDrop!==true)throw Error('Real manual drops require approved private config');
  return c;
 }
 if(process.env.VERCEL_ENV!=='preview'||process.env.VERCEL_PROJECT_ID!=='prj_gVSzGbFJNElO95CwPvPNzoBkBoy2')throw Error('Real entries are disabled');
 const key='test-config/manual-drop-v1.json';
 let c=await storage.read(key);if(c)return validateConfig(c);
 let when=Date.now(),days=[];
 for(let i=0;i<4;i++){
  const date=dateCT(when);
  days.push({dateCT:date,answer:'lantern',riddle:'STAGING ONLY — the detective carries a tiny light.',target:{path:'/paw-demo.html',marker:'test-lantern'}});
  when=nextMidnight(when)+12*3600000;
 }
 c={id:'staging-manual-drop-v1',testOnly:true,manualDrop:true,rosterConfirmed:true,adminNames:['Test Admin'],adminEmails:['admin@example.invalid'],days};
 await storage.create(key,c);return validateConfig(await storage.read(key));
}
