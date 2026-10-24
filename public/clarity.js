// Load analytics only on the live site, never during local development or previews.
(function(c,l,a,r,i,t,y){
    if (c.location.hostname !== 'brick-breaker.suryansh.lol') return;
    c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
    t=l.createElement(r);t.async=1;t.src='https://www.clarity.ms/tag/'+i;
    y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
})(window, document, 'clarity', 'script', 'z2svp9vjnl');
