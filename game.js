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
  function drawCell(position, color, inset = 1) { context.fillStyle = color; context.fillRect(position.x * cellSize + inset, position.y * cellSize + inset, cellSize - inset * 2, cellSize - inset * 2); }
  function draw() {
    context.fillStyle = "#151813"; context.fillRect(0, 0, canvas.width, canvas.height); context.strokeStyle = "rgba(242,239,231,.06)";
    for (let i = 0; i <= gridSize; i += 1) { context.beginPath(); context.moveTo(i * cellSize, 0); context.lineTo(i * cellSize, canvas.height); context.stroke(); context.beginPath(); context.moveTo(0, i * cellSize); context.lineTo(canvas.width, i * cellSize); context.stroke(); }
    drawCell(food, "#d6e94c", 3); snake.forEach((part, index) => drawCell(part, index === 0 ? "#f2efe7" : "#9bb32f", 2));
    effects.forEach(effect => { context.globalAlpha = effect.life; drawCell({x:effect.x,y:effect.y}, ["#f44336","#ff9800","#ffeb3b","#4caf50","#2196f3","#9c27b0"][Math.floor(effect.life * 6) % 6], 1); }); context.globalAlpha = 1;
  }
  startButton.addEventListener("click", startGame); pauseButton.addEventListener("click", pauseGame); restartButton.addEventListener("click", restartGame); document.addEventListener("keydown", handleKey); canvas.addEventListener("touchstart", handleTouchStart, {passive:true}); canvas.addEventListener("touchend", handleTouchEnd, {passive:true});
  document.querySelectorAll("[data-direction]").forEach(button => { button.addEventListener("click", () => setDirection(button.dataset.direction)); button.addEventListener("touchstart", event => { event.preventDefault(); setDirection(button.dataset.direction); }, {passive:false}); });
  resetGame();
})();
