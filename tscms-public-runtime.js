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