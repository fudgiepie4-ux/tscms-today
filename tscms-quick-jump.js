/* TSCMS Quick Jump — public homepage navigation, October 2026.
   Standalone enhancement; never loads or exposes private Admin content. */
(function () {
  'use strict';
  function initialize() {
    var wrap = document.querySelector('.wrap');
    if (!wrap || document.getElementById('tscms-qj-bar')) return;
    var insertBefore = wrap.querySelector('.tscms-site-tabs') || wrap.firstElementChild;
    if (!insertBefore) return;

    var items = [
      {key:'home', icon:'⌂', label:'Home'},
      {key:'gamehouse', icon:'♠', label:'TSCMS Gamehouse', href:'gamehouse.html'},
      {key:'halloween', icon:'🎃', label:'Halloween Playlist'},
      {key:'dicey', icon:'🎲', label:'Dicey Discovery'},
      {key:'daily', icon:'♫', label:'Daily Songs'},
      {key:'weekly', icon:'▦', label:'Weekly Songs'},
      {key:'loved', icon:'♥', label:'Most Loved'},
      {key:'spotlight', icon:'★', label:'Monthly Spotlight'}
    ];
    // Admin is intentionally excluded. Its secure sign-in/access controls
    // must be completed and approved before an Admin shortcut is added.
    var bar = document.createElement('nav');
    bar.id='tscms-qj-bar';
    bar.className='tscms-qj-bar';
    bar.setAttribute('aria-label','Quick jump navigation');

    var trigger=document.createElement('button');
    trigger.type='button'; trigger.className='tscms-qj-trigger';
    trigger.setAttribute('aria-haspopup','dialog');
    trigger.setAttribute('aria-controls','tscms-qj-drawer');
    trigger.setAttribute('aria-expanded','false');
    trigger.innerHTML='<span aria-hidden="true">☰</span> QUICK JUMP <span aria-hidden="true">★</span>';
    bar.appendChild(trigger);

    var desktop=document.createElement('div');
    desktop.className='tscms-qj-desktop';
    desktop.setAttribute('aria-label','Website sections');
    bar.appendChild(desktop);
    insertBefore.parentNode.insertBefore(bar,insertBefore);

    var shade=document.createElement('div');
    shade.id='tscms-qj-overlay';
    shade.className='tscms-qj-overlay';
    shade.hidden=true;
    document.body.appendChild(shade);

    var drawer=document.createElement('aside');
    drawer.id='tscms-qj-drawer';
    drawer.className='tscms-qj-drawer';
    drawer.setAttribute('role','dialog');
    drawer.setAttribute('aria-modal','true');
    drawer.setAttribute('aria-labelledby','tscms-qj-title');
    drawer.hidden=true;
    drawer.innerHTML='<button class="tscms-qj-close" type="button" aria-label="Close quick jump menu">×</button>'+
      '<div class="tscms-qj-hero">'+
        '<div class="tscms-qj-brand">★ THE SUNO COUNTRY MUSIC SPOT ★</div>'+
        '<h2 id="tscms-qj-title">Quick Jump</h2>'+
        '<p class="tscms-qj-tagline">Songs · Friends · Community</p>'+
      '</div>'+
      '<nav class="tscms-qj-drawer-links" aria-label="Quick jump destinations"></nav>'+
      '<div class="tscms-qj-footer" aria-hidden="true">🍁 COUNTRY MUSIC BRINGS US TOGETHER 🍂</div>';
    document.body.appendChild(drawer);
    var drawerNav=drawer.querySelector('.tscms-qj-drawer-links');
    var closeButton=drawer.querySelector('.tscms-qj-close');
    var lastFocus=null,oldOverflow='';
    var sections = {
      dicey:document.getElementById('diceSection'),
      halloween:document.querySelector('.daypanel .halloween-pin-head'),
      loved:document.querySelector('.most-loved-autumn'),
      spotlight:document.getElementById('tscms-september-spotlight-2026'),
      weekly:document.querySelector('.tabs button.tab[data-day]')?.closest('.tabs') || null,
      daily:document.querySelector('.tabs button.tab[data-day]')?.closest('.tabs') || null
    };

    function isReady(key) {
      if (key==='dicey') {
        var box=sections.dicey;
        return !!(box && !box.hidden && box.getAttribute('aria-hidden')!=='true' && getComputedStyle(box).display!=='none');
      }
      if (key==='gamehouse' || key==='home') return true;
      if (key==='halloween') return !!(sections.halloween && sections.halloween.closest('.daypanel[id^="day-"]'));
      return !!sections[key];
    }
    function createLink(item, targetContainer) {
      var link=document.createElement('a');
      link.className='tscms-qj-link';
      link.dataset.target=item.key;
      link.href=item.href || '#tscms-qj-'+item.key;
      link.innerHTML='<span class="tscms-qj-icon" aria-hidden="true">'+item.icon+'</span><span>'+item.label+'</span>'+
        (targetContainer===drawerNav ? '<span class="tscms-qj-chevron" aria-hidden="true">›</span>' : '');
      if(item.href){link.target='_self';}
      link.hidden=!isReady(item.key);
      targetContainer.appendChild(link);
    }
    items.forEach(function(item){createLink(item,desktop);createLink(item,drawerNav);});

    function syncAvailable(){
      Array.prototype.forEach.call(document.querySelectorAll('.tscms-qj-link'),function(link){
        link.hidden=!isReady(link.dataset.target);
      });
    }
    function closeMenu(restoreFocus) {
      if(drawer.hidden) return;
      drawer.hidden=true;
      shade.hidden=true;
      trigger.setAttribute('aria-expanded','false');
      document.documentElement.style.overflow=oldOverflow;
      if(restoreFocus!==false && lastFocus && typeof lastFocus.focus==='function')lastFocus.focus();
    }
    function openMenu() {
      if(!drawer.hidden) return;
      lastFocus=document.activeElement;
      oldOverflow=document.documentElement.style.overflow;
      document.documentElement.style.overflow='hidden';
      shade.hidden=false;drawer.hidden=false;
      trigger.setAttribute('aria-expanded','true');
      syncAvailable();
      closeButton.focus();
    }
    trigger.addEventListener('click',openMenu);
    closeButton.addEventListener('click',function(){closeMenu(true);});
    shade.addEventListener('click',function(){closeMenu(true);});
    document.addEventListener('keydown',function(e){
      if(drawer.hidden) return;
      if(e.key==='Escape'){e.preventDefault();closeMenu(true);return;}
      if(e.key!=='Tab')return;
      var focusables=Array.prototype.filter.call(drawer.querySelectorAll('button,a[href]'),function(n){return !n.hidden;});
      if(!focusables.length)return;
      var first=focusables[0],last=focusables[focusables.length-1];
      if(e.shiftKey && document.activeElement===first){e.preventDefault();last.focus();}
      else if(!e.shiftKey && document.activeElement===last){e.preventDefault();first.focus();}
    });

    function findCurrentDayButton() {
      var buttons=Array.prototype.slice.call(document.querySelectorAll('.tabs .tab[data-day]'));
      if(!buttons.length) return null;
      try{
        var today = new Intl.DateTimeFormat('en-US',{timeZone:'America/Chicago',month:'numeric',day:'numeric'}).format(new Date());
        var current=buttons.find(function(btn){
          var s=btn.querySelector('.t-m');
          if(!s)return false;
          var left=s.textContent.trim().split('/').map(function(n){return Number(n);});
          var right=today.split('/').map(function(n){return Number(n);});
          return left[0]===right[0] && left[1]===right[1];
        });
        if(current)return current;
      }catch(e){/* Older browser: keep the active tab. */}
      return buttons.find(function(btn){return btn.classList.contains('active');})||buttons[0];
    }
    function scrollToElement(node){
      if(!node)return;
      var reduced=window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      node.scrollIntoView({behavior:reduced?'auto':'smooth',block:'start'});
    }
    function jump(key) {
      if(key==='home'){window.scrollTo({top:0,behavior:'smooth'});return;}
      if(key==='daily'){
        var dayButton=findCurrentDayButton();
        if(dayButton && typeof window.showDay==='function')window.showDay(Number(dayButton.dataset.day));
        scrollToElement(sections.daily);return;
      }
      if(key==='halloween'){
        var pin=sections.halloween;
        var halloweenPanel=pin && pin.closest('.daypanel[id^="day-"]');
        if(!halloweenPanel)return;
        var day=Number(halloweenPanel.id.slice(4));
        if(typeof window.showDay==='function')window.showDay(day);
        // If someone is already on the Halloween day but on a later song page,
        // return to its first page before scrolling to the pinned collection.
        var prev;
        for(var n=0;n<35;n++){
          prev=halloweenPanel.querySelector('.song-pager--top button[aria-label="Previous page of songs"]');
          if(!prev || prev.disabled)break;
          prev.click();
        }
        requestAnimationFrame(function(){scrollToElement(pin);});
        return;
      }
      if(key==='weekly'){scrollToElement(sections.weekly);return;}
      if(key==='loved'){scrollToElement(sections.loved);return;}
      if(key==='spotlight'){scrollToElement(sections.spotlight);return;}
      if(key==='dicey' && isReady('dicey')){scrollToElement(sections.dicey);}
    }
    function handleLink(e){
      var link=e.target.closest('.tscms-qj-link');
      if(!link)return;
      var key=link.dataset.target;
      if(key==='gamehouse'){closeMenu(false);return;} // Normal existing Gamehouse page navigation.
      e.preventDefault();
      if(!isReady(key))return;
      closeMenu(false);
      jump(key);
    }
    desktop.addEventListener('click',handleLink);
    drawerNav.addEventListener('click',handleLink);
    if(sections.dicey && window.MutationObserver){
      var observer=new MutationObserver(syncAvailable);
      observer.observe(sections.dicey,{attributes:true,attributeFilter:['hidden','aria-hidden','style']});
    }
    // Permanent Halloween shortcut beside the date tabs. It does not duplicate
    // songs or audio; it activates the day containing the existing pinned set.
    if(isReady('halloween') && sections.daily && !document.getElementById('tscms-halloween-jump')){
      var halloweenButton=document.createElement('button');
      halloweenButton.type='button';
      halloweenButton.id='tscms-halloween-jump';
      halloweenButton.className='tscms-halloween-jump';
      halloweenButton.setAttribute('aria-label','Open Halloween Favorites playlist');
      halloweenButton.innerHTML='<span class="halloween-pumpkin" aria-hidden="true">🎃</span><span class="halloween-words"><strong>HALLOWEEN PLAYLIST</strong><small>Open Halloween favorites from any day</small></span><span class="halloween-arrow" aria-hidden="true">›</span>';
      sections.daily.parentNode.insertBefore(halloweenButton,sections.daily);
      halloweenButton.addEventListener('click',function(){jump('halloween');});
    }
    syncAvailable();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize);
  else initialize();
})();
