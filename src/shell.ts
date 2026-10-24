const svg=(path:string)=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
const playIcon=svg('<path d="m9 5 11 7-11 7z"/>');
const levelsIcon=svg('<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>');
const helpIcon=svg('<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4 2L12 12v2m0 3h.01"/>');
const settingsIcon=svg('<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3" fill="currentColor"/><circle cx="15" cy="17" r="3" fill="currentColor"/>');

export const shell=`
<nav class="game-nav" aria-label="Main navigation">
  <a href="/" class="brand" aria-label="Brick Breaker home"><span class="brand-icon" aria-hidden="true"><i></i><i></i><i></i><i></i></span><span>brick<span class="brand-light">breaker</span></span></a>
  <div class="nav-links">
    <a href="#game" class="nav-item active" aria-current="page">${playIcon}<span>Play</span></a>
    <button class="nav-item" data-action="levels" aria-label="Browse levels">${levelsIcon}<span>Levels</span></button>
    <button class="nav-item" data-action="help" aria-label="How to play">${helpIcon}<span>How to play</span></button>
  </div>
  <div class="nav-bottom"><span class="nav-caption">A little break. A new high score.</span><button class="nav-item" data-action="settings" aria-label="Open settings">${settingsIcon}<span>Settings</span></button></div>
</nav>
<main class="app-shell">
  <section class="game-app" id="cabinet" aria-label="Brick Breaker">
    <header class="board-heading"><div class="board-title">Classic <span class="heading-divider">/</span> <span id="board-level-name">Hollow</span></div><button id="levels" class="level-select" aria-label="Choose level"><span>Level <span id="current-level">01</span></span>${svg('<path d="m9 5 7 7-7 7"/>')}</button></header>
    <div class="playfield" id="playfield"><canvas id="game" tabindex="0" role="img" aria-label="Brick breaker. Arrow keys or A and D move the paddle. Space launches. P pauses."></canvas><div id="overlay" class="game-overlay"></div><span id="announcement" class="sr-only" aria-live="polite"></span></div>
    <footer class="player-bar"><button id="account" data-clarity-mask="true" class="account-button" aria-label="Google sign-in and game saves"><span class="avatar">G</span><span class="player-info"><strong id="account-label">Guest</strong><span id="player-caption">Playing on this device</span></span></button><div class="game-clock" aria-label="Time played">${svg('<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6"/>')}<span id="game-time">0:00</span></div></footer>
    <aside class="controls" aria-label="Game controls">
      <div class="panel-heading"><h1>Your game</h1><span class="game-state" id="game-state">Ready to play</span></div>
      <div class="level-summary"><div class="level-art" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div><div><span class="eyebrow">LEVEL <span id="panel-level">01</span> OF 20</span><h2 id="panel-name">Hollow</h2></div></div>
      <div class="game-stats"><div><span>Score</span><strong id="stat-score">0</strong></div><div><span>Best</span><strong id="stat-best">0</strong></div><div><span>Lives</span><strong id="stat-lives">3 <span class="life-heart" aria-hidden="true">♥</span></strong></div></div>
      <div class="play-actions" id="play-actions"><span class="direction-label"><span class="desktop-hint">Use ← / → or A / D to move</span><span class="mobile-hint">Hold an arrow to move</span></span><div class="touch-buttons" id="touch-buttons" role="group" aria-label="Game controls"><button id="left" aria-label="Move left" title="Hold to move left">${svg('<path d="M19 12H5m6-6-6 6 6 6"/>')}</button><button id="pause" aria-label="Start game" title="Play / pause (Space)"></button><button id="right" aria-label="Move right" title="Hold to move right">${svg('<path d="M5 12h14m-6-6 6 6-6 6"/>')}</button></div></div>
      <div class="toolbar" role="group" aria-label="Game options"><button id="sound" class="icon-button" aria-label="Mute sound" title="Sound"></button><button id="share" class="icon-button" aria-label="Share card or recent clip" title="Share"></button><button id="desktop-fullscreen" class="icon-button" aria-label="Enter fullscreen" title="Fullscreen">${svg('<path d="M8 3H3v5m13-5h5v5M3 16v5h5m8 0h5v-5"/>')}<span class="action-label">Fullscreen</span></button><button id="settings" class="icon-button" aria-label="Game settings" title="Settings">${settingsIcon}<span class="action-label">Settings</span></button></div>
      <div class="desktop-guide"><div class="guide-heading"><h2>The next high score is yours.</h2><button class="text-button" data-action="help" aria-label="View game instructions">${helpIcon}</button></div><p>Clear the bricks. Catch the power-ups.<br>Keep the ball in play.</p><div class="key-row"><span>Move paddle</span><span><kbd>←</kbd> <kbd>→</kbd> <small>or</small> <kbd>A</kbd> <kbd>D</kbd></span></div><div class="key-row"><span>Play / pause</span><kbd>Space</kbd></div></div>
      <div class="progress-section"><div class="progress-label"><span>Your progress</span><strong><span id="completed-count">0</span> / 20</strong></div><progress id="level-progress" max="20" value="0" aria-label="Levels cleared"></progress><span class="progress-caption">One brick at a time.</span></div>
      <button class="save-indicator" id="save-status" title="Manage saved game"><i></i> Saved on this device</button>
    </aside>
  </section>
</main>
<dialog id="modal"><div class="modal-top"><span class="micro" id="modal-label"></span><button id="modal-close" class="icon-button" aria-label="Close dialog">${svg('<path d="m6 6 12 12M6 18 18 6"/>')}</button></div><div id="modal-content"></div></dialog>
<div id="toast" role="status" class="toast" hidden></div>`;
