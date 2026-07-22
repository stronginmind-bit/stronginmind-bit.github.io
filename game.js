"use strict";

(() => {
  const canvas = document.querySelector("#game-canvas");
  if (!canvas) return;
  const context = canvas.getContext("2d");
  const scoreElement = document.querySelector("#score");
  const bestElement = document.querySelector("#best-score");
  const statusElement = document.querySelector("#game-status");
  const startButton = document.querySelector("#start-game");
  const pauseButton = document.querySelector("#pause-game");
  const restartButton = document.querySelector("#restart-game");
  const gridSize = 24;
  const cellSize = canvas.width / gridSize;
  const tickMs = 145;
  const directions = { up:{x:0,y:-1}, down:{x:0,y:1}, left:{x:-1,y:0}, right:{x:1,y:0} };
  const opposite = { up:"down", down:"up", left:"right", right:"left" };
  let snake, food, direction, queuedDirection, score, timer, state, effects, touchStart, bestScore = getBestScore();

  function getBestScore() { const saved = Number.parseInt(localStorage.getItem("taesik-snake-best") || "0", 10); return Number.isFinite(saved) ? saved : 0; }
  function saveBestScore() { if (score > bestScore) { bestScore = score; localStorage.setItem("taesik-snake-best", String(bestScore)); } }
  function setStatus(message, danger = false) { statusElement.textContent = message; statusElement.classList.toggle("is-danger", danger); }
  function samePosition(a, b) { return a.x === b.x && a.y === b.y; }
  function randomCell() { return { x:Math.floor(Math.random() * gridSize), y:Math.floor(Math.random() * gridSize) }; }
  function occupied(position) { return snake.some(part => samePosition(part, position)); }
  function freeCell() { let position = randomCell(); while (occupied(position) || samePosition(position, food)) position = randomCell(); return position; }
  function resetGame() {
    snake = [{x:12,y:12},{x:11,y:12},{x:10,y:12}]; food = {x:17,y:12};
    direction = "right"; queuedDirection = "right"; score = 0; effects = []; state = "ready";
    scoreElement.textContent = "0"; bestElement.textContent = String(bestScore); pauseButton.disabled = true; draw(); setStatus("시작 버튼을 눌러 게임을 시작하세요.");
  }
  function startGame() { if (state === "running") return; if (state === "gameover" || state === "ready") resetGame(); state = "running"; pauseButton.disabled = false; setStatus("집중해서 먹이를 모으세요."); clearInterval(timer); timer = setInterval(step, tickMs); draw(); }
  function pauseGame() { if (state === "running") { state = "paused"; clearInterval(timer); pauseButton.textContent = "계속"; setStatus("일시정지됨"); } else if (state === "paused") { state = "running"; pauseButton.textContent = "일시정지"; setStatus("다시 시작합니다."); clearInterval(timer); timer = setInterval(step, tickMs); } }
  function restartGame() { clearInterval(timer); pauseButton.textContent = "일시정지"; resetGame(); startGame(); }
  function setDirection(next) { if (!directions[next] || state === "gameover") return; if (opposite[direction] !== next) queuedDirection = next; }
  function handleKey(event) { const keyMap = { ArrowUp:"up", w:"up", W:"up", ArrowDown:"down", s:"down", S:"down", ArrowLeft:"left", a:"left", A:"left", ArrowRight:"right", d:"right", D:"right", " ":"pause" }; const next = keyMap[event.key]; if (!next) return; event.preventDefault(); if (next === "pause") pauseGame(); else setDirection(next); }
  function handleTouchStart(event) { const touch = event.changedTouches[0]; touchStart = {x:touch.clientX,y:touch.clientY}; }
  function handleTouchEnd(event) { if (!touchStart) return; const touch = event.changedTouches[0]; const deltaX = touch.clientX - touchStart.x; const deltaY = touch.clientY - touchStart.y; touchStart = null; if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < 24) return; if (Math.abs(deltaX) > Math.abs(deltaY)) setDirection(deltaX > 0 ? "right" : "left"); else setDirection(deltaY > 0 ? "down" : "up"); }
  function addEffect(position) { effects.push({x:position.x,y:position.y,life:1}); }
  function step() {
    direction = queuedDirection; const vector = directions[direction]; const head = {x:snake[0].x + vector.x,y:snake[0].y + vector.y};
    effects = effects.map(effect => ({...effect,life:effect.life - .12})).filter(effect => effect.life > 0);
    const hitWall = head.x < 0 || head.x >= gridSize || head.y < 0 || head.y >= gridSize; const hitSelf = snake.some(part => samePosition(part, head));
    if (hitWall || hitSelf) { endGame(); return; }
    snake.unshift(head); if (samePosition(head, food)) { score += 10; scoreElement.textContent = String(score); addEffect(head); food = freeCell(); } else snake.pop();
    draw();
  }
  function endGame() { clearInterval(timer); state = "gameover"; pauseButton.disabled = true; saveBestScore(); bestElement.textContent = String(bestScore); setStatus("게임 오버 — 재시작해서 다시 도전하세요.", true); draw(); }
  function drawCell(position, color, inset = 2, glow = 0) { const centerX = position.x * cellSize + cellSize / 2; const centerY = position.y * cellSize + cellSize / 2; const radius = cellSize / 2 - inset; context.beginPath(); context.fillStyle = color; context.shadowColor = color; context.shadowBlur = glow; context.arc(centerX, centerY, radius, 0, Math.PI * 2); context.fill(); context.shadowBlur = 0; }
  function draw() {
    const background = context.createRadialGradient(canvas.width * .5, canvas.height * .35, 10, canvas.width * .5, canvas.height * .5, canvas.width * .7); background.addColorStop(0, "#164b48"); background.addColorStop(1, "#081416"); context.fillStyle = background; context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "rgba(214,233,76,.12)"; for (let x = 24; x < canvas.width; x += 48) for (let y = 24; y < canvas.height; y += 48) { context.beginPath(); context.arc(x, y, 1.5, 0, Math.PI * 2); context.fill(); }
    drawCell(food, "#d6e94c", 4, 14); snake.forEach((part, index) => drawCell(part, index === 0 ? "#f7fff0" : "#8ccf75", index === 0 ? 2 : 3, index === 0 ? 10 : 3));
    effects.forEach(effect => { const centerX = effect.x * cellSize + cellSize / 2; const centerY = effect.y * cellSize + cellSize / 2; const radius = cellSize * (1.2 - effect.life * .45); const colors = ["#ff5f6d","#ffc371","#f9f871","#7bed9f","#70a1ff","#c56cf0"]; context.globalAlpha = effect.life; context.strokeStyle = colors[Math.floor(effect.life * colors.length) % colors.length]; context.lineWidth = 3; context.beginPath(); context.arc(centerX, centerY, radius, 0, Math.PI * 2); context.stroke(); context.globalAlpha = 1; });
  }
  startButton.addEventListener("click", startGame); pauseButton.addEventListener("click", pauseGame); restartButton.addEventListener("click", restartGame); document.addEventListener("keydown", handleKey); canvas.addEventListener("touchstart", handleTouchStart, {passive:true}); canvas.addEventListener("touchend", handleTouchEnd, {passive:true});
  document.querySelectorAll("[data-direction]").forEach(button => { button.addEventListener("click", () => setDirection(button.dataset.direction)); button.addEventListener("touchstart", event => { event.preventDefault(); setDirection(button.dataset.direction); }, {passive:false}); });
  resetGame();
})();
