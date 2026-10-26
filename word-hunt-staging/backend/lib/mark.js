import {activeDay} from './core.js';
export function markPayload(c,now,drop,path){
 const d=activeDay(c,now,drop);
 if(!d||!d.target||d.target.path!==path)return {active:false};
 if(typeof d.target.word!=='string'||!d.target.word||typeof d.target.marker!=='string')return {active:false};
 return {active:true,marker:d.target.marker,word:d.target.word,contestDateCT:d.dateCT};
}
