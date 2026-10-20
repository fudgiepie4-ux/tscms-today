/* TSCMS public-only launch repairs — song playback, Dicey, and autumn cards. */
(function () {
  'use strict';
  var player = null, active = null, pending = false;
  function initPlayer() {
    if (player) return player;
    player = document.createElement('audio');
    player.id = 'tscms-song-player';
    player.controls = true;
    player.preload = 'none';
    player.setAttribute('aria-label', 'TSCMS song playback controls');
    player.hidden = true;
    player.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:78px;width:min(94vw,500px);height:50px;z-index:9000;border:2px solid #c9a227;border-radius:26px;background:#130f0a;box-shadow:0 5px 25px #000a';
    document.body.appendChild(player);
    player.addEventListener('ended', resetPlayer);
    player.addEventListener('pause', function () { if (active) active.textContent = '▶ PLAY'; });
    player.addEventListener('play', function () { if (active) active.textContent = '⏸ PAUSE'; });
    player.addEventListener('error', function () { resetPlayer(); say('This track could not play here. Please use its SUNO link.'); });
    return player;
  }
  function say(message) {
    var el = document.getElementById('tscms-audio-notice');
    if (!el) {
      el = document.createElement('div');
      el.id = 'tscms-audio-notice';
      el.setAttribute('role', 'status');
      el.style.cssText = 'position:fixed;bottom:137px;left:50%;transform:translateX(-50%);background:#23170d;color:#fff2cc;border:1px solid #b5914c;border-radius:9px;max-width:90vw;padding:8px 12px;z-index:9001;text-align:center;font:13px system-ui';
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.hidden = false;
    clearTimeout(el._hideTimer);
    el._hideTimer = setTimeout(function () { el.hidden = true; }, 6500);
  }
  function resetPlayer() {
    if (active) { active.textContent = '▶ PLAY'; active.setAttribute('aria-pressed','false'); }
    active = null;
  }
  window.dayPlay = function (button) {
    if (!button || !button.getAttribute) return;
    var url = button.getAttribute('data-stream') || '';
    if (!/^https:\/\/[a-z0-9.-]+\/.+/i.test(url)) {
      say('No direct stream for this song. Please choose SUNO.');
      return;
    }
    var a = initPlayer();
    if (active === button && !a.paused) { a.pause(); return; }
    if (active === button && a.paused && a.src) {
      a.play().catch(function () { say('Audio unavailable here; try the SUNO link.'); });
      return;
    }
    resetPlayer();
    active = button;
    active.setAttribute('aria-pressed','true');
    a.src = url;
    a.hidden = false;
    a.play().catch(function () {
      resetPlayer();
      say('This track cannot play directly. Please use its SUNO link.');
    });
  };

  /* Never expose a Dicey button without a verified Facebook post pool. */
  var dicePool = [], rolling = false;
  var PIPS = {1:[5],2:[1,9],3:[1,5,9],4:[1,3,7,9],5:[1,3,5,7,9],6:[1,3,4,6,7,9]};
  var ROT = {1:[0,0],2:[0,180],3:[0,-90],4:[0,90],5:[-90,0],6:[90,0]};
  var SEEN_KEY = 'tscms_dicey_member_history_v2';
  function el(id) { return document.getElementById(id); }
  function ident(s) { return String(s || '').trim().toLocaleLowerCase(); }
  function getSeen() { try { var v = JSON.parse(localStorage.getItem(SEEN_KEY)||'[]'); return Array.isArray(v)?v:[]; } catch(e) { return []; } }
  function saveSeen(v) { try { localStorage.setItem(SEEN_KEY, JSON.stringify(v)); } catch(e) {} }
  function members() {
    var m = Object.create(null);
    dicePool.forEach(function (p) { m[ident(p.member)] = true; });
    return Object.keys(m);
  }
  function updateCount() {
    var seen = new Set(getSeen());
    var all = members();
    var remaining = all.filter(function (k) { return !seen.has(k); }).length;
    if (el('diceCount')) el('diceCount').textContent = remaining + ' of ' + all.length + ' unique voices awaiting discovery';
  }
  function buildDie(id) {
    var node = el(id); if (!node || node.childElementCount) return;
    for (var i=1;i<=6;i++) {
      var face = document.createElement('div'); face.className='dface df'+i;
      for (var j=1;j<=9;j++) {
        var dot = document.createElement('span');
        dot.className=PIPS[i].indexOf(j)>=0?'pip':'blank';
        face.appendChild(dot);
      }
      node.appendChild(face);
    }
    node.style.transform='rotateX(-20deg) rotateY(30deg)';
  }
  function rollDie(id, value, reduced) {
    var node=el(id), r=ROT[value];
    if (!node) return;
    if (reduced) { node.style.transform='rotateX('+r[0]+'deg) rotateY('+r[1]+'deg)'; return; }
    node.style.transition='none';
    node.style.transform='rotateX(0deg) rotateY(0deg)';
    void node.offsetWidth;
    node.style.transition='';
    node.style.transform='rotateX('+(720+r[0])+'deg) rotateY('+(720+r[1])+'deg)';
  }
  function showResult(p) {
    el('diceMember').textContent=p.member;
    el('diceSong').textContent=p.title ? '🎵 '+p.title : 'Discover this member’s post';
    var actions=el('diceActions');
    actions.replaceChildren();
    var link=document.createElement('a');
    link.className='btn post'; link.textContent='❤️ VISIT FACEBOOK POST ↗';
    link.href=p.post_url; link.target='_blank'; link.rel='noopener noreferrer';
    actions.appendChild(link);
    var result=el('diceResult');
    result.classList.remove('show'); void result.offsetWidth; result.classList.add('show');
    result.scrollIntoView({behavior:'smooth',block:'nearest'});
  }
  window.diceRoll=function () {
    if (rolling||!dicePool.length) return;
    rolling=true;
    var button=el('diceBtn'); button.disabled=true;
    var reduced=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    rollDie('die1',1+Math.floor(Math.random()*6),reduced);
    rollDie('die2',1+Math.floor(Math.random()*6),reduced);
    var seen=new Set(getSeen()), all=members();
    var remaining=all.filter(function (k) { return !seen.has(k); });
    if (!remaining.length) { seen.clear(); remaining=all; }
    var key=remaining[Math.floor(Math.random()*remaining.length)];
    var choices=dicePool.filter(function (p) { return ident(p.member)===key; });
    var chosen=choices[Math.floor(Math.random()*choices.length)];
    setTimeout(function () {
      seen.add(key); saveSeen(Array.from(seen)); showResult(chosen);
      updateCount(); rolling=false; button.disabled=false;
    },reduced?50:1550);
  };
  function initDicey() {
    var section=el('diceSection'); if (!section) return;
    fetch('danger-zone-public.json?v=20261019-97',{cache:'no-store'})
      .then(function (r) { if (!r.ok) throw Error('pool unavailable'); return r.json(); })
      .then(function (data) {
        if (!data||!Array.isArray(data.pool)) throw Error('pool malformed');
        dicePool=data.pool.filter(function (p) {
          return p&&typeof p.member==='string'&&p.member.trim()&&
            typeof p.post_url==='string'&&
            /^https:\/\/(?:www\.)?facebook\.com\/groups\/1410002804113962\/permalink\/\d+\/?$/i.test(p.post_url);
        });
        if (!dicePool.length) throw Error('no valid public Dicey posts');
        buildDie('die1'); buildDie('die2'); updateCount();
        section.hidden=false;
        section.removeAttribute('aria-hidden');
        section.style.removeProperty('display');
      })
      .catch(function (e) { console.warn('Dicey remains hidden until its post pool is available',e); });
  }

  /* Reuse the approved autumn spotlight styling with the new Most Loved data. */
  function autumnMostLoved() {
    var h=Array.from(document.querySelectorAll('h2')).find(function(x){return /MOST LOVED TODAY/.test(x.textContent||'');});
    if(!h||!h.nextElementSibling) return;
    var sub=h.nextElementSibling, panel=sub.nextElementSibling;
    if(!panel||!panel.classList.contains('panel')) return;
    var rows=Array.from(panel.children).filter(function(x){return x.classList.contains('trow');});
    if(!rows.length) return;
    var section=document.createElement('section');
    section.className='most-loved-autumn'; section.setAttribute('aria-labelledby','mlAutumnTitle');
    section.innerHTML='<div class="ml-autumn-leaves" aria-hidden="true">🍁 🍂 🍁</div>'+
      '<div class="ml-heading"><div class="ml-season-tag">🍂 AUTUMN COMMUNITY FAVORITES</div>'+
      '<h2 class="slab" id="mlAutumnTitle">🔥 MOST LOVED TODAY</h2>'+
      '<p>These are the posts getting the most conversation right now.</p></div>';
    var cards=document.createElement('div'); cards.className='ml-cards'; cards.setAttribute('role','list');
    rows.forEach(function(row,i){
      var actions=row.nextElementSibling;
      var article=document.createElement('article'); article.className='ml-card'; article.setAttribute('role','listitem');
      row.className='ml-card-info';row.target='_blank';row.rel='noopener noreferrer';
      row.setAttribute('aria-label','View Facebook post ranked number '+(i+1));
      var rank=row.querySelector('.t-rank'),copy=row.querySelector('.d-main'),title=row.querySelector('.d-ex');
      var by=row.querySelector('.d-by'),com=row.querySelector('.t-com'),go=row.querySelector('.d-go');
      if(rank) rank.className='ml-rank';if(copy)copy.className='ml-post-copy';
      if(title)title.className='ml-post-title';if(by)by.className='ml-post-by';
      if(com)com.className='ml-comments';if(go)go.remove();
      article.appendChild(row);
      var bar=document.createElement('div');bar.className='ml-post-actions';
      if(actions&&actions.classList.contains('most-loved-song-actions')){
        while(actions.firstChild)bar.appendChild(actions.firstChild);
      } else {
        var fb=document.createElement('a');fb.className='btn post';fb.href=row.href;
        fb.target='_blank';fb.rel='noopener noreferrer';fb.textContent='💬 FACEBOOK · VIEW POST ↗';
        bar.appendChild(fb);
      }
      article.appendChild(bar);cards.appendChild(article);
    });
    section.appendChild(cards);
    var leaves=document.createElement('div');leaves.className='ml-footer-decor';leaves.setAttribute('aria-hidden','true');leaves.textContent='🍁  ♪  🍂  ♪  🍁';
    section.appendChild(leaves);
    h.parentNode.insertBefore(section,h);
    h.remove();sub.remove();panel.remove();
  }
  function start() { autumnMostLoved();initDicey(); }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);
  else start();
})();

/* Public-only September Monthly Spotlight — approved October 20, 2026.
   Uses verified post links, no audio buttons, no admin changes. */
(function () {
  'use strict';
  function addSpotlight() {
    if (document.getElementById('tscms-september-spotlight-2026')) return;
    var css = document.createElement('style');
    css.textContent = [
      '#tscms-september-spotlight-2026{margin:38px auto 26px;max-width:900px;scroll-margin-top:80px}',
      '#tscms-september-spotlight-2026 .tscms-spotlight-frame{position:relative;overflow:hidden;border-radius:13px;border:1px solid #e3ae54;box-shadow:0 14px 38px #000b,0 0 0 2px #48280b}',
      '#tscms-september-spotlight-2026 .tscms-spotlight-frame img{width:100%;height:auto;display:block}',
      '#tscms-september-spotlight-2026 .tscms-spotlight-hotspot{position:absolute;top:67.15%;height:4.8%;border-radius:8px;display:block;cursor:pointer;z-index:2}',
      '#tscms-september-spotlight-2026 .tscms-spotlight-hotspot.chris{left:5.8%;width:38.4%}',
      '#tscms-september-spotlight-2026 .tscms-spotlight-hotspot.matt{left:54.2%;width:37.8%}',
      '#tscms-september-spotlight-2026 .tscms-spotlight-hotspot:hover{background:rgba(255,227,146,.17);box-shadow:inset 0 0 0 2px #fff2b6}',
      '#tscms-september-spotlight-2026 .tscms-spotlight-hotspot:focus-visible{outline:4px solid #fff6c4;outline-offset:2px;background:rgba(255,227,146,.25)}',
      '#tscms-september-spotlight-2026 .tscms-spotlight-mobile-links{display:none}',
      '#tscms-september-spotlight-2026 .tscms-spotlight-sr{position:absolute!important;clip:rect(0,0,0,0);width:1px;height:1px;overflow:hidden;white-space:nowrap}',
      '@media(max-width:680px){#tscms-september-spotlight-2026{margin-top:24px}#tscms-september-spotlight-2026 .tscms-spotlight-mobile-links{display:grid;grid-template-columns:1fr;gap:12px;margin-top:12px}#tscms-september-spotlight-2026 .tscms-spotlight-mobile-links a{display:block;min-height:46px;padding:14px 12px;text-align:center;text-decoration:none;border:1px solid #e8b756;border-radius:12px;background:linear-gradient(#3c2614,#20150d);color:#ffdc95;font:700 15px/1.4 system-ui,sans-serif}#tscms-september-spotlight-2026 .tscms-spotlight-mobile-links a:focus-visible{outline:3px solid #fff3bc}#tscms-september-spotlight-2026 .tscms-spotlight-mobile-links strong{display:block;font-size:16px;color:#fff1c9}#tscms-september-spotlight-2026 .tscms-spotlight-mobile-links small{display:block;font-size:13px;margin:4px 0;color:#dac29b}}'
    ].join('\n');
    document.head.appendChild(css);

    var section = document.createElement('section');
    section.id = 'tscms-september-spotlight-2026';
    section.setAttribute('aria-labelledby','tscms-sep-spotlight-label');
    var heading = document.createElement('h2');
    heading.id='tscms-sep-spotlight-label';
    heading.className='tscms-spotlight-sr';
    heading.textContent='TSCMS Monthly Spotlight — September 2026: Breakout Star Chris Bloy and Top Hand Matt Spencer';
    section.appendChild(heading);

    var frame = document.createElement('div');
    frame.className='tscms-spotlight-frame';
    var picture = document.createElement('img');
    picture.src='assets/spotlight-september-2026.webp';
    picture.width=1122;picture.height=1402;picture.loading='lazy';
    picture.alt='Autumn-themed TSCMS Monthly Spotlight celebrating Chris Bloy, Breakout Star with 24 comments on one eligible post, and Matt Spencer, Top Hand with 421 comments across 56 posts. Decorative illustrated portraits are not actual winner photos.';
    frame.appendChild(picture);
    var links=[
      {who:'Chris Bloy',kind:'chris',href:'https://www.facebook.com/groups/1410002804113962/posts/1621782419602665/'},
      {who:'Matt Spencer',kind:'matt',href:'https://www.facebook.com/groups/1410002804113962/posts/1629423668838540/'}
    ];
    links.forEach(function(w){
      var a=document.createElement('a');
      a.className='tscms-spotlight-hotspot '+w.kind;
      a.href=w.href;a.target='_blank';a.rel='noopener noreferrer';
      a.setAttribute('aria-label','View '+w.who+"'s September spotlight Facebook post (opens in new tab)");
      frame.appendChild(a);
    });
    section.appendChild(frame);
    var mobiles=document.createElement('div');
    mobiles.className='tscms-spotlight-mobile-links';
    [
      ['Chris Bloy','Breakout Star · 24 comments',links[0].href],
      ['Matt Spencer','Top Hand · 421 comments across 56 posts',links[1].href]
    ].forEach(function(w){
      var a=document.createElement('a');a.href=w[2];a.target='_blank';a.rel='noopener noreferrer';
      var strong=document.createElement('strong');strong.textContent=w[0];
      var small=document.createElement('small');small.textContent=w[1];
      a.appendChild(strong);a.appendChild(small);
      a.appendChild(document.createTextNode('VIEW FACEBOOK POST ↗'));
      mobiles.appendChild(a);
    });
    section.appendChild(mobiles);
    var mostLoved=document.querySelector('.most-loved-autumn');
    var footer=document.querySelector('.wrap > footer')||document.querySelector('footer');
    if(mostLoved && mostLoved.parentNode)mostLoved.insertAdjacentElement('afterend',section);
    else if(footer && footer.parentNode)footer.parentNode.insertBefore(section,footer);
    else document.querySelector('.wrap').appendChild(section);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',addSpotlight);
  else addSpotlight();
})();
