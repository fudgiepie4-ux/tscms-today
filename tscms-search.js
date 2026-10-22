/* TSCMS verified music search — browser only; no account or private data. */
(function(){
  'use strict';
  const form=document.getElementById('tscms-search-form');
  const input=document.getElementById('tscms-search-input');
  const results=document.getElementById('tscms-search-results');
  const status=document.getElementById('tscms-search-status');
  const coverage=document.getElementById('tscms-search-coverage');
  if(!form||!input||!results||!status||!coverage)return;
  let songs=[];
  const goodUrl=value=>typeof value==='string'&&/^https:\/\/[a-z0-9.-]+\/\S+$/i.test(value);
  function clear(){results.replaceChildren();}
  function item(song){
    const li=document.createElement('li');li.className='tscms-search-result';
    const title=document.createElement('strong');title.textContent=song.title;
    const meta=document.createElement('div');meta.className='tscms-search-meta';
    meta.textContent=song.artist+' · Station week '+song.week;
    const actions=document.createElement('div');actions.className='tscms-search-actions';
    const play=document.createElement('button');play.type='button';play.className='tscms-search-play';
    play.textContent='▶ PLAY';play.dataset.stream=song.play_url;play.dataset.title=song.title;
    play.setAttribute('aria-label','Play '+song.title+' by '+song.artist);
    play.addEventListener('click',function(){
      if(typeof window.dayPlay==='function'){window.dayPlay(play);}
      else status.textContent='The audio player is unavailable. Please try again later.';
    });
    actions.appendChild(play);
    if(goodUrl(song.post_url)&&/^https:\/\/(?:www\.)?(?:facebook\.com|m\.facebook\.com)\//i.test(song.post_url)){
      const post=document.createElement('a');post.href=song.post_url;
      post.target='_blank';post.rel='noopener noreferrer';
      post.textContent='VIEW FACEBOOK POST ↗';
      post.setAttribute('aria-label','View Facebook post for '+song.title+' by '+song.artist);
      actions.appendChild(post);
    }
    li.append(title,meta,actions);return li;
  }
  function render(){
    const q=input.value.trim().toLocaleLowerCase();
    clear();
    const matching=songs.filter(s=>!q||s.artist.toLocaleLowerCase().includes(q)||s.title.toLocaleLowerCase().includes(q));
    // No result cap: an artist search must find ALL of that artist's verified songs in the archive window.
    const frag=document.createDocumentFragment();
    matching.forEach(s=>frag.appendChild(item(s)));
    results.appendChild(frag);
    status.textContent=matching.length===0?
      'No verified songs match this search in the archived weeks.':
      matching.length+' verified '+(matching.length===1?'song':'songs')+' '+(q?'matched.':'in the current archive.');
  }
  form.addEventListener('submit',event=>{event.preventDefault();render();});
  input.addEventListener('input',render);
  fetch('./search-index.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Missing archive');return r.json();})
    .then(data=>{
      if(!data||data.schema_version!==1||!Array.isArray(data.songs)||!data.coverage)throw Error('Invalid archive');
      songs=data.songs.filter(s=>s&&typeof s.artist==='string'&&s.artist.trim()&&
        typeof s.title==='string'&&s.title.trim()&&goodUrl(s.play_url)&&
        typeof s.week==='string'&&/^\d{4}-\d\d-\d\d$/.test(s.week));
      if(!songs.length)throw Error('Empty verified archive');
      const weeks=[...new Set(songs.map(s=>s.week))].sort();
      // Derive coverage from records, not from unverified, possibly stale descriptive fields.
      coverage.textContent='Verified station-week archive: '+weeks[0]+' through '+weeks[weeks.length-1]+
        ' · '+weeks.length+' '+(weeks.length===1?'week':'weeks')+' represented. This is not a full six-week history until the archive grows.';
      render();
    }).catch(()=>{
      clear();
      coverage.textContent='Search archive coverage unavailable.';
      status.textContent='The verified song archive is not ready. No songs or dates have been assumed.';
    });
})();