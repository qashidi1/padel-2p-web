const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const PORT = process.env.PORT || 3000;

const WIDTH = 1000;
const HEIGHT = 500;
const GROUND_Y = 460;
const NET_X = WIDTH / 2;
const NET_WIDTH = 12;
const NET_HEIGHT = 120;
const GRAVITY = 0.45;
const PLAYER_SPEED = 6;
const JUMP_FORCE = -11;
const PLAYER_WIDTH = 28;
const PLAYER_HEIGHT = 80;
const BALL_RADIUS = 14;
const WIN_SCORE = 7;

const room = {
  players: {},
  sockets: [],
  scores: { left: 0, right: 0 },
  started: false,
  gameOver: false,
  winner: null,
  ball: null
};

function createInitialBall(lastScorer = null) {
  const direction = lastScorer === "left" ? 1 : lastScorer === "right" ? -1 : (Math.random() < 0.5 ? -1 : 1);
  return {
    x: WIDTH / 2,
    y: 140,
    vx: 4 * direction,
    vy: 0,
    r: BALL_RADIUS
  };
}

function resetRound(lastScorer = null) {
  room.ball = createInitialBall(lastScorer);
  if (room.players.left) {
    room.players.left.x = 140;
    room.players.left.y = GROUND_Y - PLAYER_HEIGHT;
    room.players.left.vy = 0;
  }
  if (room.players.right) {
    room.players.right.x = WIDTH - 140 - PLAYER_WIDTH;
    room.players.right.y = GROUND_Y - PLAYER_HEIGHT;
    room.players.right.vy = 0;
  }
}

function resetGame() {
  room.scores.left = 0;
  room.scores.right = 0;
  room.gameOver = false;
  room.winner = null;
  resetRound();
}

function assignSide() {
  const hasLeft = !!room.players.left;
  const hasRight = !!room.players.right;
  if (!hasLeft) return "left";
  if (!hasRight) return "right";
  return "spectator";
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function circleRectCollision(ball, rect) {
  const closestX = clamp(ball.x, rect.x, rect.x + rect.w);
  const closestY = clamp(ball.y, rect.y, rect.y + rect.h);
  const dx = ball.x - closestX;
  const dy = ball.y - closestY;
  return dx * dx + dy * dy < ball.r * ball.r;
}

function resolveBallPlayerCollision(ball, player, side) {
  const rect = {
    x: player.x,
    y: player.y,
    w: PLAYER_WIDTH,
    h: PLAYER_HEIGHT
  };

  if (!circleRectCollision(ball, rect)) return;

  const playerCenterX = player.x + PLAYER_WIDTH / 2;
  const offset = (ball.x - playerCenterX) / (PLAYER_WIDTH / 2);

  if (side === "left") {
    ball.x = player.x + PLAYER_WIDTH + ball.r + 1;
    ball.vx = Math.abs(4 + offset * 3);
  } else {
    ball.x = player.x - ball.r - 1;
    ball.vx = -Math.abs(4 + offset * 3);
  }

  ball.vy = Math.min(-4, ball.vy - 2.5);
}

function updatePlayer(player, side) {
  if (!player) return;

  if (player.input.left) player.x -= PLAYER_SPEED;
  if (player.input.right) player.x += PLAYER_SPEED;

  if (player.input.jump && player.onGround) {
    player.vy = JUMP_FORCE;
    player.onGround = false;
  }

  player.vy += GRAVITY;
  player.y += player.vy;

  if (player.y + PLAYER_HEIGHT >= GROUND_Y) {
    player.y = GROUND_Y - PLAYER_HEIGHT;
    player.vy = 0;
    player.onGround = true;
  }

  if (side === "left") {
    player.x = clamp(player.x, 20, NET_X - NET_WIDTH / 2 - PLAYER_WIDTH - 10);
  } else {
    player.x = clamp(player.x, NET_X + NET_WIDTH / 2 + 10, WIDTH - PLAYER_WIDTH - 20);
  }
}

function updateBall() {
  const ball = room.ball;
  if (!ball || room.gameOver) return;

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

  resolveBallPlayerCollision(ball, room.players.left, "left");
  resolveBallPlayerCollision(ball, room.players.right, "right");

  if (ball.y + ball.r >= GROUND_Y) {
    const leftSide = ball.x < NET_X;
    if (leftSide) {
      room.scores.right += 1;
      if (room.scores.right >= WIN_SCORE) {
        room.gameOver = true;
        room.winner = "Right Player";
      } else {
        resetRound("right");
      }
    } else {
      room.scores.left += 1;
      if (room.scores.left >= WIN_SCORE) {
        room.gameOver = true;
        room.winner = "Left Player";
      } else {
        resetRound("left");
      }
    }
  }
}

function getPublicState() {
  return {
    width: WIDTH,
    height: HEIGHT,
    groundY: GROUND_Y,
    net: {
      x: NET_X,
      width: NET_WIDTH,
      height: NET_HEIGHT
    },
    players: {
      left: room.players.left
        ? { x: room.players.left.x, y: room.players.left.y }
        : null,
      right: room.players.right
        ? { x: room.players.right.x, y: room.players.right.y }
        : null
    },
    ball: room.ball,
    scores: room.scores,
    gameOver: room.gameOver,
    winner: room.winner,
    started: !!(room.players.left && room.players.right)
  };
}

io.on("connection", (socket) => {
  const side = assignSide();

  room.sockets.push(socket.id);

  if (side !== "spectator") {
    room.players[side] = {
      id: socket.id,
      x: side === "left" ? 140 : WIDTH - 140 - PLAYER_WIDTH,
      y: GROUND_Y - PLAYER_HEIGHT,
      vy: 0,
      onGround: true,
      input: { left: false, right: false, jump: false }
    };
  }

  if (!room.ball) resetRound();

  socket.emit("role", side);

  socket.on("input", (input) => {
    if (side === "spectator") return;
    const player = room.players[side];
    if (!player) return;
    player.input = {
      left: !!input.left,
      right: !!input.right,
      jump: !!input.jump
    };
  });

  socket.on("restart", () => {
    resetGame();
  });

  socket.on("disconnect", () => {
    room.sockets = room.sockets.filter((id) => id !== socket.id);

    if (room.players.left && room.players.left.id === socket.id) {
      delete room.players.left;
    }
    if (room.players.right && room.players.right.id === socket.id) {
      delete room.players.right;
    }

    room.gameOver = false;
    room.winner = null;
    resetRound();
  });
});

setInterval(() => {
  updatePlayer(room.players.left, "left");
  updatePlayer(room.players.right, "right");
  updateBall();
  io.emit("state", getPublicState());
}, 1000 / 60);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
