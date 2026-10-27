/* Include on approved target pages once at launch. No answer or dates embedded here. */
(function(){'use strict';
  const GATEWAY='https://tscms-word-hunt-public-gateway-2026.vercel.app';
  const GATEWAY_READY=/^https:\/\/[a-z0-9.-]+$/i.test(GATEWAY)&&!GATEWAY.includes('production-candidate');
 const selectors='[data-word-hunt-marker]';
 const candidates=()=>[...document.querySelectorAll(selectors)];
 let sequence=0;
 async function refresh(){
  const current=++sequence;
  // A previous day's paw disappears immediately on refresh, even if server is unavailable.
  const clear=()=>candidates().forEach(node=>node.classList.remove('wh-paw-live'));
  try{
   if(!GATEWAY_READY)throw Error('gateway not configured');
   const res=await fetch(GATEWAY+'/api/word-hunt/mark?path='+encodeURIComponent(location.pathname),{
    credentials:'omit',cache:'no-store',headers:{Accept:'application/json'}
   });
   if(!res.ok)throw Error('unavailable');
   const data=await res.json();if(sequence!==current)return;
   clear();
   if(data?.active!==true||typeof data.marker!=='string')return;
   const matches=candidates().filter(node=>node.getAttribute('data-word-hunt-marker')===data.marker);
   if(matches.length===1)matches[0].classList.add('wh-paw-live'); // exact ONE word only
  }catch{if(sequence===current)clear();}
 }
 refresh();window.setInterval(()=>{if(!document.hidden)refresh();},5000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
})();
