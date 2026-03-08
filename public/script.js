const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const leftScoreEl = document.getElementById("leftScore");
const rightScoreEl = document.getElementById("rightScore");
const messageEl = document.getElementById("message");
const restartBtn = document.getElementById("restartBtn");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const GROUND_Y = 460;
const NET_X = WIDTH / 2;
const NET_WIDTH = 12;
const NET_HEIGHT = 120;
const GRAVITY = 0.45;
const MOVE_SPEED = 6;
const JUMP_FORCE = -11;
const WIN_SCORE = 7;

const keys = {};

let leftScore = 0;
let rightScore = 0;
let gameOver = false;

const playerLeft = {
  x: 140,
  y: GROUND_Y - 80,
  w: 28,
  h: 80,
  vy: 0,
  onGround: true,
  color: "#2563eb"
};

const playerRight = {
  x: WIDTH - 168,
  y: GROUND_Y - 80,
  w: 28,
  h: 80,
  vy: 0,
  onGround: true,
  color: "#16a34a"
};

const ball = {
  x: WIDTH / 2,
  y: 140,
  r: 14,
  vx: 4,
  vy: 0,
  color: "#f97316"
};

function resetBall(direction = 1) {
  ball.x = WIDTH / 2;
  ball.y = 140;
  ball.vx = 4 * direction;
  ball.vy = 0;

  playerLeft.x = 140;
  playerLeft.y = GROUND_Y - playerLeft.h;
  playerLeft.vy = 0;
  playerLeft.onGround = true;

  playerRight.x = WIDTH - 168;
  playerRight.y = GROUND_Y - playerRight.h;
  playerRight.vy = 0;
  playerRight.onGround = true;
}

function restartGame() {
  leftScore = 0;
  rightScore = 0;
  gameOver = false;
  messageEl.textContent = "";
  updateScore();
  resetBall(Math.random() < 0.5 ? -1 : 1);
}

function updateScore() {
  leftScoreEl.textContent = leftScore;
  rightScoreEl.textContent = rightScore;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function circleRectCollision(ballObj, rect) {
  const closestX = clamp(ballObj.x, rect.x, rect.x + rect.w);
  const closestY = clamp(ballObj.y, rect.y, rect.y + rect.h);
  const dx = ballObj.x - closestX;
  const dy = ballObj.y - closestY;
  return dx * dx + dy * dy < ballObj.r * ballObj.r;
}

function updatePlayer(player, controls, side) {
  if (gameOver) return;

  if (keys[controls.left]) player.x -= MOVE_SPEED;
  if (keys[controls.right]) player.x += MOVE_SPEED;

  if (keys[controls.jump] && player.onGround) {
    player.vy = JUMP_FORCE;
    player.onGround = false;
  }

  player.vy += GRAVITY;
  player.y += player.vy;

  if (player.y + player.h >= GROUND_Y) {
    player.y = GROUND_Y - player.h;
    player.vy = 0;
    player.onGround = true;
  }

  if (side === "left") {
    player.x = clamp(player.x, 20, NET_X - NET_WIDTH / 2 - player.w - 10);
  } else {
    player.x = clamp(player.x, NET_X + NET_WIDTH / 2 + 10, WIDTH - player.w - 20);
  }
}

function bounceBallFromPlayer(player, side) {
  const rect = { x: player.x, y: player.y, w: player.w, h: player.h };

  if (!circleRectCollision(ball, rect)) return;

  const centerX = player.x + player.w / 2;
  const offset = (ball.x - centerX) / (player.w / 2);

  if (side === "left") {
    ball.x = player.x + player.w + ball.r + 1;
    ball.vx = Math.abs(4 + offset * 3);
  } else {
    ball.x = player.x - ball.r - 1;
    ball.vx = -Math.abs(4 + offset * 3);
  }

  ball.vy = Math.min(-4, ball.vy - 2.5);
}

function updateBall() {
  if (gameOver) return;

  ball.vy += GRAVITY;
  ball.x += ball.vx;
  ball.y += ball.vy;

  if (ball.x - ball.r <= 0) {
    ball.x = ball.r;
    ball.vx *= -1;
  }

  if (ball.x + ball.r >= WIDTH) {
    ball.x = WIDTH - ball.r;
    ball.vx *= -1;
  }

  if (ball.y - ball.r <= 0) {
    ball.y = ball.r;
    ball.vy *= -1;
  }

  const netRect = {
    x: NET_X - NET_WIDTH / 2,
    y: GROUND_Y - NET_HEIGHT,
    w: NET_WIDTH,
    h: NET_HEIGHT
  };

  if (circleRectCollision(ball, netRect)) {
    if (ball.x < NET_X) {
      ball.x = netRect.x - ball.r - 1;
      ball.vx = -Math.abs(ball.vx);
    } else {
      ball.x = netRect.x + netRect.w + ball.r + 1;
      ball.vx = Math.abs(ball.vx);
    }
    ball.vy *= 0.98;
  }

  bounceBallFromPlayer(playerLeft, "left");
  bounceBallFromPlayer(playerRight, "right");

  if (ball.y + ball.r >= GROUND_Y) {
    if (ball.x < NET_X) {
      rightScore += 1;
      updateScore();
      checkWinner();
      if (!gameOver) resetBall(1);
    } else {
      leftScore += 1;
      updateScore();
      checkWinner();
      if (!gameOver) resetBall(-1);
    }
  }
}

function checkWinner() {
  if (leftScore >= WIN_SCORE) {
    gameOver = true;
    messageEl.textContent = "Left Player Menang!";
  } else if (rightScore >= WIN_SCORE) {
    gameOver = true;
    messageEl.textContent = "Right Player Menang!";
  }
}

function drawBackground() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);

  // ground
  ctx.fillStyle = "#caa472";
  ctx.fillRect(0, GROUND_Y, WIDTH, HEIGHT - GROUND_Y);

  // center net
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(NET_X - NET_WIDTH / 2, GROUND_Y - NET_HEIGHT, NET_WIDTH, NET_HEIGHT);

  // top of net
  ctx.fillStyle = "#ef4444";
  ctx.fillRect(NET_X - 30, GROUND_Y - NET_HEIGHT - 8, 60, 8);

  // center line
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.beginPath();
  ctx.moveTo(NET_X, 0);
  ctx.lineTo(NET_X, GROUND_Y);
  ctx.stroke();
}

function drawPlayer(player) {
  ctx.fillStyle = player.color;
  ctx.fillRect(player.x, player.y, player.w, player.h);

  // head
  ctx.fillStyle = "#fde0c8";
  ctx.beginPath();
  ctx.arc(player.x + player.w / 2, player.y + 14, 12, 0, Math.PI * 2);
  ctx.fill();
}

function drawBall() {
  ctx.fillStyle = ball.color;
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
  ctx.fill();
}

function drawWinnerOverlay() {
  if (!gameOver) return;

  ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 42px Arial";
  ctx.fillText(messageEl.textContent, WIDTH / 2 - 180, 120);
}

function gameLoop() {
  updatePlayer(playerLeft, { left: "a", right: "d", jump: "w" }, "left");
  updatePlayer(playerRight, { left: "ArrowLeft", right: "ArrowRight", jump: "ArrowUp" }, "right");
  updateBall();

  drawBackground();
  drawPlayer(playerLeft);
  drawPlayer(playerRight);
  drawBall();
  drawWinnerOverlay();

  requestAnimationFrame(gameLoop);
}

document.addEventListener("keydown", (e) => {
  keys[e.key] = true;
});

document.addEventListener("keyup", (e) => {
  keys[e.key] = false;
});

restartBtn.addEventListener("click", restartGame);

updateScore();
resetBall();
gameLoop();
