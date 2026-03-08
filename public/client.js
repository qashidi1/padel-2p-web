const socket = io();

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const roleBox = document.getElementById("roleBox");
const scoreBox = document.getElementById("scoreBox");
const statusEl = document.getElementById("status");
const restartBtn = document.getElementById("restartBtn");

let myRole = "spectator";
let gameState = null;

const keys = {
  left: false,
  right: false,
  jump: false
};

socket.on("role", (role) => {
  myRole = role;
  if (role === "left") roleBox.textContent = "You are: Left Player";
  else if (role === "right") roleBox.textContent = "You are: Right Player";
  else roleBox.textContent = "You are: Spectator (room full)";
});

socket.on("state", (state) => {
  gameState = state;
  scoreBox.textContent = `${state.scores.left} : ${state.scores.right}`;

  if (!state.started) {
    statusEl.textContent = "Menunggu 2 pemain terhubung...";
  } else if (state.gameOver) {
    statusEl.textContent = `${state.winner} wins! Klik Restart untuk main lagi.`;
  } else {
    statusEl.textContent = "";
  }

  draw();
});

function emitInput() {
  socket.emit("input", keys);
}

document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") keys.left = true;
  if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") keys.right = true;
  if (e.key === "ArrowUp" || e.key === "w" || e.key === "W" || e.key === " ") keys.jump = true;
  emitInput();
});

document.addEventListener("keyup", (e) => {
  if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") keys.left = false;
  if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") keys.right = false;
  if (e.key === "ArrowUp" || e.key === "w" || e.key === "W" || e.key === " ") keys.jump = false;
  emitInput();
});

restartBtn.addEventListener("click", () => {
  socket.emit("restart");
});

function drawCourt(state) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // ground
  ctx.fillStyle = "#c2a56a";
  ctx.fillRect(0, state.groundY, state.width, state.height - state.groundY);

  // center line/net
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(
    state.net.x - state.net.width / 2,
    state.groundY - state.net.height,
    state.net.width,
    state.net.height
  );

  // net top
  ctx.fillStyle = "#e63946";
  ctx.fillRect(
    state.net.x - 30,
    state.groundY - state.net.height - 8,
    60,
    8
  );
}

function drawPlayer(player, side) {
  if (!player) return;

  ctx.fillStyle = side === "left" ? "#1d4ed8" : "#16a34a";
  ctx.fillRect(player.x, player.y, 28, 80);

  ctx.fillStyle = "#ffe0bd";
  ctx.beginPath();
  ctx.arc(player.x + 14, player.y + 14, 12, 0, Math.PI * 2);
  ctx.fill();
}

function drawBall(ball) {
  if (!ball) return;
  ctx.fillStyle = "#ff7f11";
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
  ctx.fill();
}

function drawOverlay(state) {
  if (!state.gameOver) return;

  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#fff";
  ctx.font = "bold 42px Arial";
  ctx.fillText(`${state.winner} wins!`, canvas.width / 2 - 150, 120);
}

function draw() {
  if (!gameState) return;

  drawCourt(gameState);
  drawPlayer(gameState.players.left, "left");
  drawPlayer(gameState.players.right, "right");
  drawBall(gameState.ball);
  drawOverlay(gameState);
}
