import {storage} from './storage.js';
import {dateCT,nextMidnight,validateConfig} from './core.js';
// Staging is dummy-only. Live intake is disabled unless production + explicit private launch flag.
export async function config(){
 if(process.env.VERCEL_ENV==='production'&&process.env.WORD_HUNT_ENABLE_REAL==='true'){
  if(!process.env.WORD_HUNT_CONFIG_JSON)throw Error('Private contest configuration missing');
  const c=validateConfig(JSON.parse(process.env.WORD_HUNT_CONFIG_JSON));
  if(c.testOnly!==false)throw Error('Live mode requires a confirmed live configuration');
  return c;
 }
 if(process.env.VERCEL_ENV!=='preview'||process.env.VERCEL_PROJECT_ID!=='prj_gVSzGbFJNElO95CwPvPNzoBkBoy2')throw Error('Real entries are disabled');
 const key='test-config/automatic-drop-v1.json';let c=await storage.read(key);if(c)return validateConfig(c);
 let start=Date.now()+30000;
 if(nextMidnight(Date.now())-start<60000)start=nextMidnight(Date.now())+12*3600000;
 const days=[];for(let i=0;i<4;i++){days.push({dateCT:dateCT(start),dropAtUTC:new Date(start).toISOString(),answer:'lantern',riddle:'Staging test clue: a small light carried by a detective.'});start=nextMidnight(start)+12*3600000;}
 c={id:'staging-automatic-drop-v1',testOnly:true,rosterConfirmed:true,adminNames:['Test Admin'],adminEmails:['admin@example.invalid'],days};
 await storage.create(key,c);return validateConfig(await storage.read(key));
}
