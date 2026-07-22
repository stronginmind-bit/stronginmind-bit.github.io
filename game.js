"use strict";

(() => {
  const canvas = document.querySelector("#game-canvas");
  if (!canvas) return;

  const context = canvas.getContext("2d");
  const scoreElement = document.querySelector("#score");
  const bestElement = document.querySelector("#best-score");
  const livesElement = document.querySelector("#lives");
  const statusElement = document.querySelector("#game-status");
  const startButton = document.querySelector("#start-game");
  const pauseButton = document.querySelector("#pause-game");
  const restartButton = document.querySelector("#restart-game");
  const soundButton = document.querySelector("#sound-toggle");
  const width = canvas.width;
  const height = canvas.height;
  const player = { x: width / 2, y: height - 54, width: 30, height: 18, speed: 6 };
  const keys = new Set();
  const bullets = [];
  const enemies = [];
  const particles = [];
  let score = 0;
  let lives = 3;
  let bestScore = getBestScore();
  let state = "ready";
  let timer = null;
  let lastTime = 0;
  let enemyDirection = 1;
  let enemyStepClock = 0;
  let fireClock = 0;
  let touchStart = null;
  let soundEnabled = true;
  let audioContext;

  function getBestScore() {
    const saved = Number.parseInt(localStorage.getItem("taesik-galaga-best") || "0", 10);
    return Number.isFinite(saved) ? saved : 0;
  }

  function saveBestScore() {
    if (score > bestScore) {
      bestScore = score;
      localStorage.setItem("taesik-galaga-best", String(bestScore));
    }
  }

  function setStatus(message, danger = false) {
    statusElement.textContent = message;
    statusElement.classList.toggle("is-danger", danger);
  }

  function makeEnemies() {
    enemies.length = 0;
    const colors = ["#ff6b7d", "#ffad66", "#c58cff"];
    for (let row = 0; row < 4; row += 1) {
      for (let column = 0; column < 7; column += 1) {
        enemies.push({ x: 76 + column * 54, y: 62 + row * 34, width: 24, height: 18, color: colors[row % colors.length], row, alive: true });
      }
    }
  }

  function resetGame() {
    clearInterval(timer);
    bullets.length = 0;
    particles.length = 0;
    score = 0;
    lives = 3;
    player.x = width / 2;
    enemyDirection = 1;
    enemyStepClock = 0;
    fireClock = 0;
    state = "ready";
    makeEnemies();
    scoreElement.textContent = "0";
    livesElement.textContent = String(lives);
    bestElement.textContent = String(bestScore);
    pauseButton.disabled = true;
    pauseButton.textContent = "일시정지";
    setStatus("시작 버튼을 눌러 출격하세요.");
    draw();
  }

  function ensureAudio() {
    if (!soundEnabled) return null;
    if (!audioContext) audioContext = new AudioContext();
    if (audioContext.state === "suspended") audioContext.resume();
    return audioContext;
  }

  function beep(frequency, duration, type = "square", volume = 0.025) {
    const audio = ensureAudio();
    if (!audio) return;
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(volume, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start();
    oscillator.stop(audio.currentTime + duration);
  }

  function startGame() {
    if (state === "running") return;
    if (state === "gameover" || state === "ready" || enemies.every(enemy => !enemy.alive)) resetGame();
    state = "running";
    pauseButton.disabled = false;
    setStatus("출격 중 — 적 편대를 정리하세요.");
    beep(440, 0.12, "sawtooth", 0.02);
    clearInterval(timer);
    timer = setInterval(() => update(16), 16);
  }

  function pauseGame() {
    if (state === "running") {
      state = "paused";
      setStatus("일시정지됨.");
      pauseButton.textContent = "계속";
    } else if (state === "paused") {
      state = "running";
      setStatus("출격 중 — 적 편대를 정리하세요.");
      pauseButton.textContent = "일시정지";
    }
  }

  function restartGame() {
    resetGame();
    startGame();
  }

  function fire() {
    if (state !== "running" || fireClock > 0 || bullets.length > 3) return;
    bullets.push({ x: player.x, y: player.y - 18, width: 3, height: 12, speed: 8 });
    fireClock = 180;
    beep(760, 0.06, "square", 0.018);
  }

  function movePlayer(amount) {
    player.x = Math.max(24, Math.min(width - 24, player.x + amount));
  }

  function handleKey(event) {
    const key = event.key;
    if (["ArrowLeft", "ArrowRight", "a", "A", "d", "D", " "].includes(key)) event.preventDefault();
    if (key === " ") return state === "paused" ? pauseGame() : fire();
    keys.add(key);
    if (["p", "P"].includes(key)) pauseGame();
  }

  function handleKeyUp(event) { keys.delete(event.key); }

  function setDirection(direction) {
    if (direction === "left") movePlayer(-32);
    if (direction === "right") movePlayer(32);
    if (direction === "fire") fire();
  }

  function handleTouchStart(event) {
    const touch = event.changedTouches[0];
    touchStart = { x: touch.clientX, y: touch.clientY };
  }

  function handleTouchEnd(event) {
    if (!touchStart) return;
    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - touchStart.x;
    const deltaY = touch.clientY - touchStart.y;
    touchStart = null;
    if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < 24) return fire();
    if (Math.abs(deltaX) > Math.abs(deltaY)) setDirection(deltaX > 0 ? "right" : "left");
  }

  function overlaps(a, b) {
    return Math.abs(a.x - b.x) < (a.width + b.width) / 2 && Math.abs(a.y - b.y) < (a.height + b.height) / 2;
  }

  function addBurst(x, y, color) {
    const colors = ["#ff4d6d", "#ffcf56", "#73e2a7", "#57b9ff", "#c58cff", color];
    for (let index = 0; index < 20; index += 1) {
      const angle = (Math.PI * 2 * index) / 20;
      particles.push({ x, y, vx: Math.cos(angle) * (1 + Math.random() * 2), vy: Math.sin(angle) * (1 + Math.random() * 2), life: 1, color: colors[index % colors.length] });
    }
  }

  function update(delta) {
    if (state !== "running") return;
    const now = performance.now();
    if (!lastTime) lastTime = now;
    const elapsed = Math.min(delta, 32);
    lastTime = now;
    if (keys.has("ArrowLeft") || keys.has("a") || keys.has("A")) movePlayer(-player.speed);
    if (keys.has("ArrowRight") || keys.has("d") || keys.has("D")) movePlayer(player.speed);
    if (keys.has(" ")) fire();
    fireClock = Math.max(0, fireClock - elapsed);
    bullets.forEach(bullet => { bullet.y -= bullet.speed; });
    while (bullets.length && bullets[0].y < -20) bullets.shift();
    enemyStepClock += elapsed;
    if (enemyStepClock > 600) {
      enemyStepClock = 0;
      const living = enemies.filter(enemy => enemy.alive);
      const nextEdge = living.some(enemy => enemy.x + enemyDirection * 20 > width - 28 || enemy.x + enemyDirection * 20 < 28);
      if (nextEdge) { enemyDirection *= -1; living.forEach(enemy => { enemy.y += 12; }); }
      living.forEach(enemy => { enemy.x += enemyDirection * 14; });
    }
    bullets.forEach(bullet => {
      enemies.forEach(enemy => {
        if (enemy.alive && overlaps(bullet, enemy)) {
          enemy.alive = false;
          bullet.y = -30;
          score += 10;
          scoreElement.textContent = String(score);
          addBurst(enemy.x, enemy.y, enemy.color);
          beep(180 + score * 2, 0.08, "triangle", 0.018);
        }
      });
    });
    const living = enemies.filter(enemy => enemy.alive);
    if (living.some(enemy => enemy.y + enemy.height / 2 >= player.y - 22)) return endGame();
    if (!living.length) { saveBestScore(); bestElement.textContent = String(bestScore); state = "ready"; setStatus("편대 격추 완료 — 다시 출격할까요?"); beep(880, 0.2, "triangle", 0.025); }
    particles.forEach(particle => { particle.x += particle.vx; particle.y += particle.vy; particle.life -= 0.035; });
    while (particles.length && particles[0].life <= 0) particles.shift();
    draw();
  }

  function endGame() {
    clearInterval(timer);
    state = "gameover";
    pauseButton.disabled = true;
    saveBestScore();
    bestElement.textContent = String(bestScore);
    setStatus("게임 오버 — 재시작 후 다시 도전하세요.", true);
    beep(100, 0.25, "sawtooth", 0.025);
    draw();
  }

  function drawPlayer() {
    context.save();
    context.translate(player.x, player.y);
    context.fillStyle = "#d6e94c";
    context.shadowColor = "#d6e94c";
    context.shadowBlur = 14;
    context.beginPath();
    context.moveTo(0, -18); context.lineTo(18, 12); context.lineTo(7, 9); context.lineTo(0, 17); context.lineTo(-7, 9); context.lineTo(-18, 12); context.closePath(); context.fill();
    context.fillStyle = "#f7fff0";
    context.fillRect(-2, -5, 4, 13);
    context.restore();
  }

  function drawEnemy(enemy) {
    context.save();
    context.translate(enemy.x, enemy.y);
    context.fillStyle = enemy.color;
    context.shadowColor = enemy.color;
    context.shadowBlur = 10;
    context.beginPath();
    context.moveTo(0, -11); context.lineTo(14, -4); context.lineTo(10, 10); context.lineTo(0, 5); context.lineTo(-10, 10); context.lineTo(-14, -4); context.closePath(); context.fill();
    context.fillStyle = "#081416";
    context.fillRect(-8, -3, 4, 4); context.fillRect(4, -3, 4, 4);
    context.restore();
  }

  function draw() {
    const background = context.createLinearGradient(0, 0, 0, height);
    background.addColorStop(0, "#102e3a"); background.addColorStop(1, "#060b12");
    context.fillStyle = background; context.fillRect(0, 0, width, height);
    context.fillStyle = "rgba(255,255,255,.42)";
    for (let index = 0; index < 45; index += 1) { const x = (index * 83) % width; const y = (index * 47) % height; context.fillRect(x, y, index % 3 === 0 ? 2 : 1, 1); }
    context.fillStyle = "rgba(214,233,76,.07)"; context.fillRect(20, height - 82, width - 40, 1);
    enemies.filter(enemy => enemy.alive).forEach(drawEnemy);
    bullets.forEach(bullet => { context.fillStyle = "#f7fff0"; context.shadowColor = "#d6e94c"; context.shadowBlur = 12; context.fillRect(bullet.x - 1.5, bullet.y - bullet.height / 2, bullet.width, bullet.height); context.shadowBlur = 0; });
    particles.forEach(particle => { context.globalAlpha = particle.life; context.fillStyle = particle.color; context.fillRect(particle.x, particle.y, 3, 3); }); context.globalAlpha = 1;
    drawPlayer();
  }

  startButton.addEventListener("click", startGame);
  pauseButton.addEventListener("click", pauseGame);
  restartButton.addEventListener("click", restartGame);
  soundButton.addEventListener("click", () => { soundEnabled = !soundEnabled; soundButton.textContent = soundEnabled ? "사운드 켜짐" : "사운드 꺼짐"; if (soundEnabled) beep(520, 0.08); });
  document.addEventListener("keydown", handleKey);
  document.addEventListener("keyup", handleKeyUp);
  canvas.addEventListener("touchstart", handleTouchStart, { passive: true });
  canvas.addEventListener("touchend", handleTouchEnd, { passive: true });
  document.querySelectorAll("[data-direction]").forEach(button => { button.addEventListener("click", () => setDirection(button.dataset.direction)); });
  resetGame();
})();
