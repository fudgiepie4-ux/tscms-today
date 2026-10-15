
/* Fudgie 2026-10-14 (corrected): Viewer's local time is PRIMARY, CT is the reference */
(function(){
  function initTzDisplay(){
    var viewerTz = 'America/Chicago';
    try {
      viewerTz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Chicago';
    } catch(e) {}
    
    var isCentral = viewerTz === 'America/Chicago' || viewerTz === 'US/Central' || viewerTz === 'CST6CDT';
    
    // Get viewer's timezone abbreviation
    var tzAbbr = 'local';
    try {
      var parts = new Intl.DateTimeFormat('en-US', {timeZone: viewerTz, timeZoneName: 'short'}).formatToParts(new Date());
      for(var i = 0; i < parts.length; i++){
        if(parts[i].type === 'timeZoneName'){ tzAbbr = parts[i].value; break; }
      }
    } catch(e) {}
    
    var events = document.querySelectorAll('a.show-event[data-start]');
    for(var i = 0; i < events.length; i++){
      var el = events[i];
      var iso = el.getAttribute('data-start');
      if(!iso) continue;
      if(el.getAttribute('data-tz-done') === '1') continue;
      
      try {
        var d = new Date(iso);
        
        // Viewer's local time (PRIMARY display)
        var localTime = new Intl.DateTimeFormat('en-US', {
          hour: 'numeric', minute: '2-digit', hour12: true, timeZone: viewerTz
        }).format(d);
        
        // Central time (reference)
        var ctTime = new Intl.DateTimeFormat('en-US', {
          hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/Chicago'
        }).format(d);
        
        var timeDiv = el.querySelector('.show-event-time');
        if(timeDiv){
          el.setAttribute('data-tz-done', '1');
          if(isCentral){
            // Central viewer: just show CT (unchanged from original)
            // Already displays correctly, no change needed
          } else {
            // Non-Central viewer: local time primary, CT as reference below
            // Replace the time display content
            timeDiv.innerHTML = localTime + ' <small>' + tzAbbr + '</small>' +
              '<div class="show-event-ct-ref" style="font-size:0.75em;opacity:0.85;margin-top:2px;">' +
              ctTime + ' CT</div>' +
              '<span aria-hidden="true"> \u2197</span>';
          }
        }
        
        // Update aria-label for accessibility
        var label = el.getAttribute('aria-label') || '';
        if(label && !isCentral && label.indexOf('your time') === -1){
          el.setAttribute('aria-label', label + ' (' + localTime + ' ' + tzAbbr + ' your time)');
        }
      } catch(e) {}
    }
  }
  
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', initTzDisplay);
  } else {
    initTzDisplay();
  }
})();