const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const touchControlButtons = Array.from(document.querySelectorAll("[data-touch-control]"));
const touchActionButtons = Array.from(document.querySelectorAll("[data-touch-action]"));
ctx.imageSmoothingEnabled = false;

const MOBILE_LIGHT_MODE = navigator.maxTouchPoints > 0 || window.innerWidth <= 900;
const LOGICAL_W = 1280;
const LOGICAL_H = 720;
const RENDER_SCALE = MOBILE_LIGHT_MODE ? 0.75 : 1;
canvas.width = Math.round(LOGICAL_W * RENDER_SCALE);
canvas.height = Math.round(LOGICAL_H * RENDER_SCALE);
const W = LOGICAL_W;
const H = LOGICAL_H;
const TILE = 64;
const BLOCK = 82;
const UI_FONT = '"GuchioCute", "Noto Sans JP", "Yu Gothic", "Meiryo", sans-serif';
const GROUND_Y = 600;
const WORLD_W = BLOCK * 92;
const ROW1 = GROUND_Y - BLOCK;
const ROW2 = GROUND_Y - BLOCK * 2;
const ROW3 = GROUND_Y - BLOCK * 3;
const ROW4 = GROUND_Y - BLOCK * 4;
const GRAVITY = 0.58;
const FRICTION = 0.82;
const MAX_JUMPS = 2;
const JUMP_VELOCITY = -17.8;
const STOMP_VELOCITY = -12.5;
const MAX_FALL_SPEED = 13;
const JUMP_BUFFER_FRAMES = 8;
const RUN_ANIMATION_SPEED = 0.07;
const ENEMY_ANIMATION_SPEED = RUN_ANIMATION_SPEED;
const MAX_STAGE = 5;
const PARTICLE_SCALE = MOBILE_LIGHT_MODE ? 0.45 : 1;

const keys = new Set();
const playerSprite = new Image();
playerSprite.src = "assets/player.png";
const playerRunSprites = Array.from({ length: 5 }, (_, i) => {
  const image = new Image();
  image.src = `assets/player_run_${i}.png`;
  return image;
});
const brickSprite = new Image();
brickSprite.src = "assets/brick.png";
const questionSprite = new Image();
questionSprite.src = "assets/question.png";
const questionIconSprite = new Image();
questionIconSprite.src = "assets/question_icon.png";
const eggCoinSprite = new Image();
eggCoinSprite.src = "assets/egg_coin.png";
const chickenSprite = new Image();
chickenSprite.src = "assets/chicken.png";
const lifeHeartSprite = new Image();
lifeHeartSprite.src = "assets/life_heart.png";
const enemySprite = new Image();
enemySprite.src = "assets/enemy_new.png";
const enemyWalkSprites = Array.from({ length: 5 }, (_, i) => {
  const image = new Image();
  image.src = `assets/enemy_walk_${i}.png`;
  return image;
});
const grassSprite = new Image();
grassSprite.src = "assets/grass.png";
const groundSprite = new Image();
groundSprite.src = "assets/ground.png";
const cityBackgroundSprite = new Image();
cityBackgroundSprite.src = "assets/city_background.jpg";
const titleSprite = new Image();
titleSprite.src = "assets/title_guchio_jump.png";
const particleSprites = {
  enemy: new Image(),
  block: new Image(),
  hit: new Image(),
};
particleSprites.enemy.src = "assets/particle_enemy.png";
particleSprites.block.src = "assets/particle_block.png";
particleSprites.hit.src = "assets/particle_hit.png";
const touchButtonSprites = {
  left: new Image(),
  right: new Image(),
  jump: new Image(),
};
touchButtonSprites.left.src = "assets/touch_left.png";
touchButtonSprites.right.src = "assets/touch_right.png";
touchButtonSprites.jump.src = "assets/touch_jump.png";

let jumpWasDown = false;
let jumpBuffer = 0;
let lastTouchActionAt = 0;
let gameNow = performance.now();
const fireworks = [];
const touchPointers = new Map();
const touchInput = { left: false, right: false, jump: false, seen: false };
const buttonPointers = new Map();
const state = {
  started: false,
  camera: 0,
  cameraY: 0,
  score: 1500,
  coins: 0,
  lives: 3,
  time: 284,
  won: false,
  gameOver: false,
  paused: false,
  stage: 1,
  nextStageTimer: 0,
  clearPhase: "play",
  clearFlash: 0,
  fireworkClock: 0,
  poleTimer: 0,
  poleResultTimer: 0,
  poleCountdownEndAt: 0,
  poleResultEndAt: 0,
  nextStageMessageTimer: 0,
  poleStartY: 0,
  poleResultClimbed: 0,
  poleResultRate: 0,
  poleResultRank: "",
  poleResultBonus: 0,
  poleBonusAdded: false,
  message: "",
  messageTimer: 0,
  timedMessage: "",
  messageColor: "#fff8df",
};

const player = {
  x: BLOCK * 11,
  y: 440,
  w: 74,
  h: 98,
  baseW: 74,
  baseH: 98,
  bigW: 96,
  bigH: 128,
  isBig: false,
  vx: 0,
  vy: 0,
  onGround: false,
  jumpsLeft: MAX_JUMPS,
  facing: 1,
  runFrame: 2,
  runClock: 0,
  invincible: 0,
  spawnX: BLOCK * 11,
  spawnY: 440,
};

const pits = [
  { x: BLOCK * 23, w: BLOCK * 2 },
  { x: BLOCK * 34, w: BLOCK * 3 },
  { x: BLOCK * 48, w: BLOCK * 2 },
  { x: BLOCK * 66, w: BLOCK * 3 },
];

const groundSegments = [
  { x: 0, w: BLOCK * 23 },
  { x: BLOCK * 25, w: BLOCK * 9 },
  { x: BLOCK * 37, w: BLOCK * 11 },
  { x: BLOCK * 50, w: BLOCK * 16 },
  { x: BLOCK * 89, w: WORLD_W - BLOCK * 89 },
];

const solids = [
  ...groundSegments.map((segment) => ({ x: segment.x, y: GROUND_Y, w: segment.w, h: 160, type: "ground" })),
  { x: BLOCK * 2, y: GROUND_Y - 108, w: 150, h: 108, type: "pipe" },
  { x: BLOCK * 13, y: ROW3, w: BLOCK, h: BLOCK, type: "brick" },
  { x: BLOCK * 14, y: ROW3, w: BLOCK, h: BLOCK, type: "question" },
  { x: BLOCK * 15, y: ROW3, w: BLOCK, h: BLOCK, type: "brick" },
  { x: BLOCK * 27, y: ROW3, w: BLOCK, h: BLOCK, type: "brick" },
  { x: BLOCK * 28, y: ROW3, w: BLOCK, h: BLOCK, type: "brick" },
  { x: BLOCK * 29, y: ROW3, w: BLOCK, h: BLOCK, type: "brick" },
  { x: BLOCK * 37, y: ROW4, w: BLOCK, h: BLOCK, type: "brick" },
  { x: BLOCK * 38, y: ROW4, w: BLOCK, h: BLOCK, type: "question" },
  { x: BLOCK * 39, y: ROW4, w: BLOCK, h: BLOCK, type: "brick" },
  { x: BLOCK * 45, y: ROW1, w: BLOCK, h: BLOCK, type: "brick" },
  { x: BLOCK * 46, y: ROW1, w: BLOCK, h: BLOCK, type: "brick" },
  { x: BLOCK * 51, y: ROW3, w: BLOCK, h: BLOCK, type: "question" },
  { x: BLOCK * 52, y: ROW3, w: BLOCK, h: BLOCK, type: "brick" },
  { x: BLOCK * 53, y: ROW3, w: BLOCK, h: BLOCK, type: "brick" },
  { x: BLOCK * 60, y: ROW1, w: BLOCK, h: BLOCK, type: "brick" },
  { x: BLOCK * 61, y: ROW1, w: BLOCK, h: BLOCK, type: "brick" },
  { x: BLOCK * 67, y: ROW1, w: BLOCK, h: BLOCK, type: "brick" },
  { x: BLOCK * 68, y: ROW1, w: BLOCK, h: BLOCK, type: "brick" },
  { x: BLOCK * 71, y: ROW2, w: BLOCK, h: BLOCK, type: "brick" },
  { x: BLOCK * 74, y: ROW3, w: BLOCK, h: BLOCK, type: "brick" },
  { x: BLOCK * 77, y: ROW4, w: BLOCK, h: BLOCK, type: "question" },
  { x: BLOCK * 80, y: ROW4, w: BLOCK, h: BLOCK, type: "brick" },
  { x: BLOCK * 83, y: ROW3, w: BLOCK, h: BLOCK, type: "brick" },
  { x: BLOCK * 86, y: ROW2, w: BLOCK, h: BLOCK, type: "brick" },
];

const coins = [
  { x: BLOCK * 14 + 22, y: ROW4 - 54, taken: false },
  { x: BLOCK * 20 + 22, y: ROW1 - 54, taken: false },
  { x: BLOCK * 25 + 22, y: ROW1 - 54, taken: false },
  { x: BLOCK * 29 + 22, y: ROW4 - 54, taken: false },
  { x: BLOCK * 33 + 22, y: ROW1 - 54, taken: false },
  { x: BLOCK * 38 + 22, y: ROW4 - 54, taken: false },
  { x: BLOCK * 44 + 22, y: ROW1 - 54, taken: false },
  { x: BLOCK * 51 + 22, y: ROW4 - 54, taken: false },
  { x: BLOCK * 57 + 22, y: ROW1 - 54, taken: false },
  { x: BLOCK * 63 + 22, y: ROW1 - 54, taken: false },
  { x: BLOCK * 68 + 22, y: ROW2 - 54, taken: false },
  { x: BLOCK * 74 + 22, y: ROW4 - 54, taken: false },
  { x: BLOCK * 77 + 22, y: ROW4 - 54, taken: false },
  { x: BLOCK * 86 + 22, y: ROW3 - 54, taken: false },
];

const powerups = [];

const enemies = [
  { x: BLOCK * 18, startX: BLOCK * 18, y: GROUND_Y - 146, w: 139, h: 146, vx: -0.75, startVx: -0.75, alive: true, big: true, walkClock: 0 },
  { x: BLOCK * 21, startX: BLOCK * 21, y: GROUND_Y - 110, w: 105, h: 110, vx: -0.9, startVx: -0.9, alive: true, big: false, walkClock: 0 },
  { x: BLOCK * 6, startX: BLOCK * 6, y: GROUND_Y - 110, w: 105, h: 110, vx: 0.85, startVx: 0.85, alive: true, big: false, walkClock: 0 },
  { x: BLOCK * 36, startX: BLOCK * 36, y: GROUND_Y - 110, w: 105, h: 110, vx: -0.95, startVx: -0.95, alive: true, big: false, walkClock: 0 },
  { x: BLOCK * 42, startX: BLOCK * 42, y: GROUND_Y - 146, w: 139, h: 146, vx: -0.85, startVx: -0.85, alive: true, big: true, walkClock: 0 },
  { x: BLOCK * 56, startX: BLOCK * 56, y: GROUND_Y - 110, w: 105, h: 110, vx: -1.0, startVx: -1.0, alive: true, big: false, walkClock: 0 },
  { x: BLOCK * 62, startX: BLOCK * 62, y: GROUND_Y - 110, w: 105, h: 110, vx: -1.05, startVx: -1.05, alive: true, big: false, walkClock: 0 },
];

const springs = [];
const hazards = [];
const movingPlatforms = [];

const flag = { x: WORLD_W - BLOCK * 2, y: -820, w: 120, h: 1420 };

function makeGroundSolids(segments) {
  return segments.map((segment) => ({ x: segment.x, y: GROUND_Y, w: segment.w, h: 160, type: "ground" }));
}

const stage1Template = {
  groundSegments: groundSegments.map((segment) => ({ ...segment })),
  solids: solids.map((solid) => ({ ...solid })),
  coins: coins.map((coin) => ({ ...coin })),
  enemies: enemies.map((enemy) => ({ ...enemy })),
  springs: springs.map((spring) => ({ ...spring })),
  hazards: hazards.map((hazard) => ({ ...hazard })),
  movingPlatforms: movingPlatforms.map((platform) => ({ ...platform })),
};

function restoreStage1Layout() {
  state.stage = 1;
  groundSegments.splice(0, groundSegments.length, ...stage1Template.groundSegments.map((segment) => ({ ...segment })));
  solids.splice(0, solids.length, ...stage1Template.solids.map((solid) => ({ ...solid })));
  coins.splice(0, coins.length, ...stage1Template.coins.map((coin) => ({ ...coin })));
  enemies.splice(0, enemies.length, ...stage1Template.enemies.map((enemy) => ({ ...enemy })));
  springs.splice(0, springs.length, ...stage1Template.springs.map((spring) => ({ ...spring })));
  hazards.splice(0, hazards.length, ...stage1Template.hazards.map((hazard) => ({ ...hazard })));
  movingPlatforms.splice(0, movingPlatforms.length, ...stage1Template.movingPlatforms.map((platform) => ({ ...platform })));
  flag.x = WORLD_W - BLOCK * 2;
}

function switchToStage2() {
  const keepBig = player.isBig;
  state.stage = 2;
  state.camera = 0;
  state.cameraY = 0;
  state.time = 320;
  state.won = false;
  state.gameOver = false;
  state.paused = false;
  state.clearPhase = "play";
  state.clearFlash = 0;
  state.fireworkClock = 0;
  state.nextStageTimer = 0;
  state.poleTimer = 0;
  state.poleResultTimer = 0;
  state.poleCountdownEndAt = 0;
  state.poleResultEndAt = 0;
  state.nextStageMessageTimer = 0;
  state.poleStartY = 0;
  state.poleResultClimbed = 0;
  state.poleResultRate = 0;
  state.poleResultRank = "";
  state.poleResultBonus = 0;
  state.poleBonusAdded = false;
  showTimedMessage("\u0032\u3081\u3093 \u30b9\u30bf\u30fc\u30c8!", "#fff8df", 90);
  jumpWasDown = false;
  jumpBuffer = 0;
  powerups.length = 0;
  fireworks.length = 0;
  springs.length = 0;
  hazards.length = 0;
  movingPlatforms.length = 0;

  groundSegments.splice(
    0,
    groundSegments.length,
    { x: 0, w: BLOCK * 16 },
    { x: BLOCK * 19, w: BLOCK * 11 },
    { x: BLOCK * 33, w: BLOCK * 9 },
    { x: BLOCK * 45, w: BLOCK * 13 },
    { x: BLOCK * 63, w: BLOCK * 9 },
    { x: BLOCK * 78, w: BLOCK * 2 },
    { x: BLOCK * 91, w: BLOCK },
  );

  solids.splice(
    0,
    solids.length,
    ...makeGroundSolids(groundSegments),
    { x: BLOCK * 3, y: GROUND_Y - 108, w: 150, h: 108, type: "pipe" },
    { x: BLOCK * 10, y: ROW3, w: BLOCK, h: BLOCK, type: "question" },
    { x: BLOCK * 11, y: ROW3, w: BLOCK, h: BLOCK, type: "brick" },
    { x: BLOCK * 12, y: ROW3, w: BLOCK, h: BLOCK, type: "brick" },
    { x: BLOCK * 21, y: ROW3, w: BLOCK, h: BLOCK, type: "brick" },
    { x: BLOCK * 22, y: ROW3, w: BLOCK, h: BLOCK, type: "question" },
    { x: BLOCK * 26, y: ROW4, w: BLOCK, h: BLOCK, type: "brick" },
    { x: BLOCK * 27, y: ROW4, w: BLOCK, h: BLOCK, type: "brick" },
    { x: BLOCK * 36, y: ROW3, w: BLOCK, h: BLOCK, type: "brick" },
    { x: BLOCK * 37, y: ROW3, w: BLOCK, h: BLOCK, type: "question" },
    { x: BLOCK * 49, y: ROW3, w: BLOCK, h: BLOCK, type: "brick" },
    { x: BLOCK * 50, y: ROW3, w: BLOCK, h: BLOCK, type: "brick" },
    { x: BLOCK * 51, y: ROW3, w: BLOCK, h: BLOCK, type: "question" },
    { x: BLOCK * 65, y: ROW1, w: BLOCK, h: BLOCK, type: "brick" },
    { x: BLOCK * 67, y: ROW3, w: BLOCK, h: BLOCK, type: "brick" },
    { x: BLOCK * 69, y: ROW3, w: BLOCK, h: BLOCK, type: "brick" },
    { x: BLOCK * 80, y: ROW3, w: BLOCK, h: BLOCK, type: "brick" },
    { x: BLOCK * 82, y: ROW3, w: BLOCK, h: BLOCK, type: "brick" },
    { x: BLOCK * 84, y: ROW4, w: BLOCK, h: BLOCK, type: "question" },
  );

  coins.splice(
    0,
    coins.length,
    { x: BLOCK * 10 + 22, y: ROW4 - 54, taken: false },
    { x: BLOCK * 18 + 22, y: ROW1 - 54, taken: false },
    { x: BLOCK * 22 + 22, y: ROW3 - 54, taken: false },
    { x: BLOCK * 27 + 22, y: ROW5_SAFE() - 54, taken: false },
    { x: BLOCK * 36 + 22, y: ROW3 - 54, taken: false },
    { x: BLOCK * 43 + 22, y: ROW1 - 54, taken: false },
    { x: BLOCK * 51 + 22, y: ROW4 - 54, taken: false },
    { x: BLOCK * 58 + 22, y: ROW1 - 54, taken: false },
    { x: BLOCK * 67 + 22, y: ROW3 - 54, taken: false },
    { x: BLOCK * 76 + 22, y: ROW1 - 54, taken: false },
    { x: BLOCK * 84 + 22, y: ROW5_SAFE() - 54, taken: false },
  );

  enemies.splice(
    0,
    enemies.length,
    { x: BLOCK * 13, startX: BLOCK * 13, y: GROUND_Y - 110, w: 105, h: 110, vx: -0.85, startVx: -0.85, alive: true, big: false, walkClock: 0 },
    { x: BLOCK * 24, startX: BLOCK * 24, y: GROUND_Y - 146, w: 139, h: 146, vx: -0.78, startVx: -0.78, alive: true, big: true, walkClock: 0 },
    { x: BLOCK * 40, startX: BLOCK * 40, y: GROUND_Y - 110, w: 105, h: 110, vx: -1.0, startVx: -1.0, alive: true, big: false, walkClock: 0 },
    { x: BLOCK * 55, startX: BLOCK * 55, y: GROUND_Y - 146, w: 139, h: 146, vx: -0.9, startVx: -0.9, alive: true, big: true, walkClock: 0 },
    { x: BLOCK * 70, startX: BLOCK * 70, y: GROUND_Y - 110, w: 105, h: 110, vx: -1.05, startVx: -1.05, alive: true, big: false, walkClock: 0 },
  );

  flag.x = WORLD_W - BLOCK * 2;
  player.spawnX = BLOCK * 2;
  player.spawnY = 440;
  resetPlayer();
  if (keepBig) setPlayerSize(true, false);
}

function ROW5_SAFE() {
  return GROUND_Y - BLOCK * 5;
}

function showTimedMessage(text, color, frames = 120) {
  state.message = text;
  state.timedMessage = text;
  state.messageColor = color;
  state.messageTimer = frames;
}

function updateTimedMessage(dt) {
  if (state.messageTimer <= 0) return;
  state.messageTimer -= dt;
  if (state.messageTimer <= 0 && state.message === state.timedMessage) {
    state.message = "";
    state.timedMessage = "";
    state.messageColor = "#fff8df";
  }
}

function enemyAt(tile, big = false, vx = -0.95) {
  const h = big ? 146 : 110;
  return { x: BLOCK * tile, startX: BLOCK * tile, y: GROUND_Y - h, w: big ? 139 : 105, h, vx, startVx: vx, alive: true, big, walkClock: 0 };
}

function setStageLayout(config) {
  const keepBig = player.isBig;
  state.stage = config.stage;
  state.camera = 0;
  state.cameraY = 0;
  state.time = config.time || 320;
  state.won = false;
  state.gameOver = false;
  state.paused = false;
  state.clearPhase = "play";
  state.clearFlash = 0;
  state.fireworkClock = 0;
  state.nextStageTimer = 0;
  state.poleTimer = 0;
  state.poleResultTimer = 0;
  state.poleCountdownEndAt = 0;
  state.poleResultEndAt = 0;
  state.nextStageMessageTimer = 0;
  state.poleStartY = 0;
  state.poleResultClimbed = 0;
  state.poleResultRate = 0;
  state.poleResultRank = "";
  state.poleResultBonus = 0;
  state.poleBonusAdded = false;
  showTimedMessage(`1-${config.stage} \u30b9\u30bf\u30fc\u30c8!`, "#fff8df", 90);
  jumpWasDown = false;
  jumpBuffer = 0;
  powerups.length = 0;
  fireworks.length = 0;

  groundSegments.splice(0, groundSegments.length, ...config.ground.map((segment) => ({ ...segment })));
  solids.splice(0, solids.length, ...makeGroundSolids(groundSegments), ...config.blocks.map((block) => ({ ...block })));
  coins.splice(0, coins.length, ...config.coins.map((coin) => ({ ...coin, taken: false })));
  enemies.splice(0, enemies.length, ...config.enemies.map((enemy) => ({ ...enemy })));
  springs.splice(0, springs.length, ...(config.springs || []).map((spring) => ({ ...spring, bounce: 0 })));
  hazards.splice(0, hazards.length, ...(config.hazards || []).map((hazard) => ({ ...hazard })));
  movingPlatforms.splice(0, movingPlatforms.length, ...(config.platforms || []).map((platform) => ({
    ...platform,
    startX: platform.x,
    startY: platform.y,
    prevX: platform.x,
    prevY: platform.y,
    phase: platform.phase || 0,
    type: "moving",
  })));

  flag.x = WORLD_W - BLOCK * 2;
  player.spawnX = config.spawnX || BLOCK * 2;
  player.spawnY = 440;
  resetPlayer();
  if (keepBig) setPlayerSize(true, false);
}

function switchToStage(stage) {
  if (stage === 2) {
    switchToStage2();
    return;
  }
  const configs = {
    3: {
      stage: 3,
      time: 330,
      ground: [{ x: 0, w: BLOCK * 18 }, { x: BLOCK * 22, w: BLOCK * 13 }, { x: BLOCK * 39, w: BLOCK * 9 }, { x: BLOCK * 54, w: BLOCK * 10 }, { x: BLOCK * 72, w: BLOCK * 7 }, { x: BLOCK * 90, w: BLOCK * 2 }],
      blocks: [{ x: BLOCK * 9, y: ROW3, w: BLOCK, h: BLOCK, type: "question" }, { x: BLOCK * 24, y: ROW3, w: BLOCK, h: BLOCK, type: "brick" }, { x: BLOCK * 25, y: ROW3, w: BLOCK, h: BLOCK, type: "brick" }, { x: BLOCK * 43, y: ROW3, w: BLOCK, h: BLOCK, type: "question" }, { x: BLOCK * 59, y: ROW3, w: BLOCK, h: BLOCK, type: "brick" }, { x: BLOCK * 76, y: ROW3, w: BLOCK, h: BLOCK, type: "brick" }],
      coins: [9, 23, 25, 43, 55, 62, 75, 88].map((tile) => ({ x: BLOCK * tile + 22, y: ROW3 - 54 })),
      enemies: [enemyAt(13), enemyAt(30, true, -0.8), enemyAt(58), enemyAt(73, true, -0.9)],
      springs: [
        { x: BLOCK * 18 + 10, y: GROUND_Y - 34, w: 62, h: 34 },
        { x: BLOCK * 31 + 10, y: ROW3 + 18, w: 62, h: 34 },
        { x: BLOCK * 48 + 10, y: GROUND_Y - 34, w: 62, h: 34 },
        { x: BLOCK * 61 + 10, y: ROW2 + 20, w: 62, h: 34 },
        { x: BLOCK * 84 + 10, y: ROW4 + 18, w: 62, h: 34 },
      ],
      hazards: [],
      platforms: [],
    },
    4: {
      stage: 4,
      time: 340,
      ground: [{ x: 0, w: BLOCK * 14 }, { x: BLOCK * 18, w: BLOCK * 10 }, { x: BLOCK * 35, w: BLOCK * 8 }, { x: BLOCK * 51, w: BLOCK * 11 }, { x: BLOCK * 76, w: BLOCK * 6 }, { x: BLOCK * 90, w: BLOCK * 2 }],
      blocks: [{ x: BLOCK * 21, y: ROW3, w: BLOCK, h: BLOCK, type: "question" }, { x: BLOCK * 39, y: ROW3, w: BLOCK, h: BLOCK, type: "brick" }, { x: BLOCK * 54, y: ROW4, w: BLOCK, h: BLOCK, type: "question" }, { x: BLOCK * 78, y: ROW3, w: BLOCK, h: BLOCK, type: "brick" }],
      coins: [12, 21, 38, 54, 61, 77, 85].map((tile) => ({ x: BLOCK * tile + 22, y: ROW3 - 54 })),
      enemies: [enemyAt(10), enemyAt(24), enemyAt(56, true, -0.8), enemyAt(79)],
      springs: [{ x: BLOCK * 28 + 10, y: GROUND_Y - 34, w: 62, h: 34 }],
      hazards: [{ x: BLOCK * 14, y: GROUND_Y - 42, w: BLOCK * 4, h: 42 }, { x: BLOCK * 43, y: GROUND_Y - 42, w: BLOCK * 8, h: 42 }, { x: BLOCK * 66, y: GROUND_Y - 42, w: BLOCK * 10, h: 42 }],
      platforms: [{ x: BLOCK * 29, y: ROW2, w: BLOCK * 2.6, h: 40, axis: "y", range: BLOCK * 1.4, speed: 0.008 }, { x: BLOCK * 63, y: ROW3, w: BLOCK * 2.6, h: 40, axis: "y", range: BLOCK * 1.5, speed: 0.008 }],
    },
    5: {
      stage: 5,
      time: 360,
      ground: [{ x: 0, w: BLOCK * 12 }, { x: BLOCK * 16, w: BLOCK * 8 }, { x: BLOCK * 31, w: BLOCK * 7 }, { x: BLOCK * 48, w: BLOCK * 8 }, { x: BLOCK * 70, w: BLOCK * 3 }, { x: BLOCK * 91, w: BLOCK }],
      blocks: [{ x: BLOCK * 10, y: ROW3, w: BLOCK, h: BLOCK, type: "question" }, { x: BLOCK * 20, y: ROW4, w: BLOCK, h: BLOCK, type: "brick" }, { x: BLOCK * 34, y: ROW3, w: BLOCK, h: BLOCK, type: "question" }, { x: BLOCK * 52, y: ROW3, w: BLOCK, h: BLOCK, type: "brick" }, { x: BLOCK * 74, y: ROW3, w: BLOCK, h: BLOCK, type: "brick" }, { x: BLOCK * 77, y: ROW3, w: BLOCK, h: BLOCK, type: "brick" }, { x: BLOCK * 80, y: ROW4, w: BLOCK, h: BLOCK, type: "question" }],
      coins: [10, 19, 34, 49, 52, 71, 77, 80, 88].map((tile) => ({ x: BLOCK * tile + 22, y: ROW4 - 54 })),
      enemies: [enemyAt(9, true, -0.7), enemyAt(22), enemyAt(36), enemyAt(53, true, -0.85), enemyAt(72)],
      springs: [{ x: BLOCK * 24 + 10, y: GROUND_Y - 34, w: 62, h: 34 }, { x: BLOCK * 56 + 10, y: GROUND_Y - 34, w: 62, h: 34 }],
      hazards: [{ x: BLOCK * 12, y: GROUND_Y - 42, w: BLOCK * 4, h: 42 }, { x: BLOCK * 38, y: GROUND_Y - 42, w: BLOCK * 10, h: 42 }, { x: BLOCK * 73, y: GROUND_Y - 42, w: BLOCK * 18, h: 42 }],
      platforms: [{ x: BLOCK * 25, y: ROW3, w: BLOCK * 2.6, h: 40, axis: "y", range: BLOCK * 1.7, speed: 0.008 }, { x: BLOCK * 58, y: ROW2, w: BLOCK * 2.4, h: 40, axis: "y", range: BLOCK * 2, speed: 0.008 }, { x: BLOCK * 82, y: ROW4, w: BLOCK * 2.3, h: 38, axis: "x", range: BLOCK * 3, speed: 0.009 }],
    },
  };
  setStageLayout(configs[stage]);
}

function resetPlayer() {
  player.x = player.spawnX;
  player.y = player.spawnY;
  setPlayerSize(false, false);
  player.vx = 0;
  player.vy = 0;
  player.runFrame = 2;
  player.runClock = 0;
  player.jumpsLeft = MAX_JUMPS;
  player.invincible = 110;
}

function setPlayerSize(big, keepFeet = true) {
  const feetY = player.y + player.h;
  player.isBig = big;
  player.w = big ? player.bigW : player.baseW;
  player.h = big ? player.bigH : player.baseH;
  if (keepFeet) player.y = feetY - player.h;
}

function restart(options = {}) {
  const wasStarted = state.started;
  if (options.stage === 1) restoreStage1Layout();
  jumpWasDown = false;
  jumpBuffer = 0;
  state.started = wasStarted;
  state.camera = 0;
  state.cameraY = 0;
  state.score = 1500;
  state.coins = 0;
  state.lives = 3;
  state.time = 284;
  state.won = false;
  state.gameOver = false;
  state.paused = false;
  state.clearPhase = "play";
  state.clearFlash = 0;
  state.fireworkClock = 0;
  state.nextStageTimer = 0;
  state.poleTimer = 0;
  state.poleResultTimer = 0;
  state.poleCountdownEndAt = 0;
  state.poleResultEndAt = 0;
  state.nextStageMessageTimer = 0;
  state.poleStartY = 0;
  state.poleResultClimbed = 0;
  state.poleResultRate = 0;
  state.poleResultRank = "";
  state.poleResultBonus = 0;
  state.poleBonusAdded = false;
  state.message = "";
  state.messageTimer = 0;
  state.timedMessage = "";
  state.messageColor = "#fff8df";
  player.spawnX = state.stage === 1 ? BLOCK * 11 : BLOCK * 2;
  player.spawnY = 440;
  resetPlayer();
  solids.forEach((solid) => {
    solid.broken = false;
    if (solid.type === "used") solid.type = "question";
  });
  coins.forEach((coin) => coin.taken = false);
  powerups.length = 0;
  fireworks.length = 0;
  enemies.forEach((enemy) => {
    enemy.alive = true;
    enemy.x = enemy.startX;
    enemy.vx = enemy.startVx;
    enemy.walkClock = 0;
  });
  springs.forEach((spring) => spring.bounce = 0);
  movingPlatforms.forEach((platform) => {
    platform.x = platform.startX;
    platform.y = platform.startY;
    platform.prevX = platform.x;
    platform.prevY = platform.y;
    platform.phase = 0;
  });
}

window.addEventListener("keydown", (event) => {
  keys.add(event.key.toLowerCase());
  if (event.key === " ") event.preventDefault();
  if (!state.started && event.key === "Enter") {
    state.started = true;
    restart();
    return;
  }
  if (!state.started) return;
  if (event.key.toLowerCase() === "r") restart({ stage: 1 });
  if (event.key.toLowerCase() === "p") togglePause();
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.key.toLowerCase());
});

function getCanvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * W,
    y: ((event.clientY - rect.top) / rect.height) * H,
  };
}

function getCanvasPointFromTouch(touch) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((touch.clientX - rect.left) / rect.width) * W,
    y: ((touch.clientY - rect.top) / rect.height) * H,
  };
}

function getTouchButtonRects() {
  return {
    left: { x: 30, y: H - 148, w: 130, h: 120 },
    right: { x: 178, y: H - 148, w: 130, h: 120 },
    jump: { x: W - 178, y: H - 188, w: 142, h: 166 },
  };
}

function hitTouchButton(point) {
  const rects = getTouchButtonRects();
  for (const [name, rect] of Object.entries(rects)) {
    if (point.x >= rect.x && point.x <= rect.x + rect.w && point.y >= rect.y && point.y <= rect.y + rect.h) {
      return name;
    }
  }
  return null;
}

function updateTouchInput() {
  touchInput.left = false;
  touchInput.right = false;
  touchInput.jump = false;
  for (const button of touchPointers.values()) {
    if (button) touchInput[button] = true;
  }
  for (const button of buttonPointers.values()) {
    if (button) touchInput[button] = true;
  }
}

function togglePause() {
  if (!state.started || state.won || state.gameOver) return;
  state.paused = !state.paused;
  jumpWasDown = false;
  jumpBuffer = 0;
}

function restartFromUi() {
  if (!state.started) state.started = true;
  restart({ stage: 1 });
}

function beginGameFromTouch() {
  if (!state.started) {
    state.started = true;
    restart();
    return true;
  }
  return false;
}

function advanceFromResult() {
  if (state.clearPhase !== "poleResult") return false;
  state.clearPhase = "done";
  state.nextStageTimer = 0;
  state.nextStageMessageTimer = 0;
  state.message = "";
  state.messageColor = "#fff8df";
  return true;
}

function hasHorizontalInput() {
  return keys.has("arrowleft") || keys.has("a") || touchInput.left || keys.has("arrowright") || keys.has("d") || touchInput.right;
}

function pressTouchButton(id, point) {
  touchInput.seen = true;
  const button = hitTouchButton(point);
  touchPointers.set(id, button);
  updateTouchInput();
  return button;
}

function setDomTouchButton(button, pressed) {
  button.classList.toggle("is-pressed", pressed);
}

function pressDomTouchButton(button, pointerId = "mouse") {
  const control = button.dataset.touchControl;
  if (!control) return;
  touchInput.seen = true;
  beginGameFromTouch();
  buttonPointers.set(pointerId, control);
  setDomTouchButton(button, true);
  updateTouchInput();
}

function releaseDomTouchButton(pointerId) {
  buttonPointers.delete(pointerId);
  updateTouchInput();
}

for (const button of touchControlButtons) {
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    const id = `button-${event.pointerId}`;
    if (button.setPointerCapture) {
      try {
        button.setPointerCapture(event.pointerId);
      } catch {
        // Pointer capture is optional across mobile browsers.
      }
    }
    pressDomTouchButton(button, id);
  });
  button.addEventListener("pointerup", (event) => {
    event.preventDefault();
    releaseDomTouchButton(`button-${event.pointerId}`);
    setDomTouchButton(button, false);
  });
  button.addEventListener("pointercancel", (event) => {
    releaseDomTouchButton(`button-${event.pointerId}`);
    setDomTouchButton(button, false);
  });
  button.addEventListener("touchstart", (event) => {
    event.preventDefault();
    for (const touch of event.changedTouches) {
      pressDomTouchButton(button, `button-touch-${touch.identifier}`);
    }
  }, { passive: false });
  button.addEventListener("touchend", (event) => {
    event.preventDefault();
    for (const touch of event.changedTouches) {
      releaseDomTouchButton(`button-touch-${touch.identifier}`);
    }
    setDomTouchButton(button, false);
  }, { passive: false });
  button.addEventListener("touchcancel", (event) => {
    for (const touch of event.changedTouches) {
      releaseDomTouchButton(`button-touch-${touch.identifier}`);
    }
    setDomTouchButton(button, false);
  }, { passive: false });
  button.addEventListener("mousedown", (event) => {
    event.preventDefault();
    pressDomTouchButton(button, `button-mouse-${button.dataset.touchControl}`);
  });
  button.addEventListener("mouseup", () => {
    releaseDomTouchButton(`button-mouse-${button.dataset.touchControl}`);
    setDomTouchButton(button, false);
  });
  button.addEventListener("mouseleave", () => {
    releaseDomTouchButton(`button-mouse-${button.dataset.touchControl}`);
    setDomTouchButton(button, false);
  });
}

function runTouchAction(button) {
  const now = performance.now();
  if (now - lastTouchActionAt < 180) return;
  lastTouchActionAt = now;
  const action = button.dataset.touchAction;
  touchInput.seen = true;
  if (action === "pause") togglePause();
  if (action === "restart") restartFromUi();
}

for (const button of touchActionButtons) {
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    if (button.setPointerCapture) {
      try {
        button.setPointerCapture(event.pointerId);
      } catch {
        // Pointer capture is optional across mobile browsers.
      }
    }
    button.classList.add("is-pressed");
    runTouchAction(button);
  });
  button.addEventListener("pointerup", (event) => {
    event.preventDefault();
    button.classList.remove("is-pressed");
  });
  button.addEventListener("pointercancel", () => {
    button.classList.remove("is-pressed");
  });
  button.addEventListener("touchstart", (event) => {
    event.preventDefault();
    button.classList.add("is-pressed");
    runTouchAction(button);
  }, { passive: false });
  button.addEventListener("touchend", (event) => {
    event.preventDefault();
    button.classList.remove("is-pressed");
  }, { passive: false });
  button.addEventListener("touchcancel", () => {
    button.classList.remove("is-pressed");
  }, { passive: false });
}

canvas.addEventListener("pointerdown", (event) => {
  touchInput.seen = true;
  event.preventDefault();
  if (canvas.setPointerCapture) {
    try {
      canvas.setPointerCapture(event.pointerId);
    } catch {
      // Some mobile browsers expose PointerEvent but reject capture on canvas.
    }
  }
  if (beginGameFromTouch()) {
    pressTouchButton(`pointer-${event.pointerId}`, getCanvasPoint(event));
    return;
  }
  pressTouchButton(`pointer-${event.pointerId}`, getCanvasPoint(event));
});

canvas.addEventListener("pointermove", (event) => {
  const id = `pointer-${event.pointerId}`;
  if (!touchPointers.has(id)) return;
  event.preventDefault();
  touchPointers.set(id, hitTouchButton(getCanvasPoint(event)));
  updateTouchInput();
});

function endTouchPointer(event) {
  touchPointers.delete(`pointer-${event.pointerId}`);
  updateTouchInput();
}

canvas.addEventListener("pointerup", endTouchPointer);
canvas.addEventListener("pointercancel", endTouchPointer);

canvas.addEventListener("touchstart", (event) => {
  touchInput.seen = true;
  event.preventDefault();
  beginGameFromTouch();
  for (const touch of event.changedTouches) {
    pressTouchButton(`touch-${touch.identifier}`, getCanvasPointFromTouch(touch));
  }
}, { passive: false });

canvas.addEventListener("touchmove", (event) => {
  event.preventDefault();
  for (const touch of event.changedTouches) {
    const id = `touch-${touch.identifier}`;
    if (touchPointers.has(id)) {
      touchPointers.set(id, hitTouchButton(getCanvasPointFromTouch(touch)));
    }
  }
  updateTouchInput();
}, { passive: false });

function endTouch(event) {
  event.preventDefault();
  for (const touch of event.changedTouches) {
    touchPointers.delete(`touch-${touch.identifier}`);
  }
  updateTouchInput();
}

canvas.addEventListener("touchend", endTouch, { passive: false });
canvas.addEventListener("touchcancel", endTouch, { passive: false });

function hit(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function updatePlayer() {
  const left = keys.has("arrowleft") || keys.has("a") || touchInput.left;
  const right = keys.has("arrowright") || keys.has("d") || touchInput.right;
  const jump = keys.has("arrowup") || keys.has("w") || keys.has(" ") || touchInput.jump;
  const jumpPressed = jump && !jumpWasDown;
  jumpWasDown = jump;
  if (jumpPressed) jumpBuffer = JUMP_BUFFER_FRAMES;
  if (jumpBuffer > 0) jumpBuffer--;

  if (state.clearPhase !== "play") {
    player.facing = 1;
    if (state.clearPhase === "poleReady" && jumpPressed) {
      state.clearPhase = "poleClimb";
      state.poleCountdownEndAt = gameNow + 3000;
      state.poleTimer = 3000;
      state.message = "3";
      jumpBuffer = 0;
    }
    if (state.clearPhase === "poleClimb" && jumpPressed && gameNow < state.poleCountdownEndAt) {
      player.y = Math.max(flag.y + 82, player.y - (player.isBig ? 16 : 13));
      spawnEventParticles("hit", flag.x + 50, player.y + player.h * 0.45, 5);
    }
    if (state.clearPhase === "poleReady" || state.clearPhase === "pole" || state.clearPhase === "poleClimb" || state.clearPhase === "poleResult" || (state.won && state.clearPhase === "done")) {
      player.x = flag.x + 40 - player.w;
      player.vx = 0;
      player.vy = 0;
      player.onGround = false;
    } else {
      player.vx *= 0.88;
    }
  } else if (!state.won && !state.gameOver) {
    if (left) {
      player.vx -= 0.7;
      player.facing = -1;
    }
    if (right) {
      player.vx += 0.7;
      player.facing = 1;
    }
    if (jumpBuffer > 0 && player.jumpsLeft > 0) {
      player.vy = JUMP_VELOCITY;
      player.onGround = false;
      player.jumpsLeft--;
      jumpBuffer = 0;
    }
  }

  player.vx *= player.onGround ? FRICTION : 0.96;
  player.vx = Math.max(-8, Math.min(8, player.vx));
  const lockedToPole = state.clearPhase === "poleReady" || state.clearPhase === "pole" || state.clearPhase === "poleClimb" || state.clearPhase === "poleResult" || (state.won && state.clearPhase === "done");
  player.vy = lockedToPole ? 0 : Math.min(MAX_FALL_SPEED, player.vy + GRAVITY);
  updatePlayerAnimation();

  if (!lockedToPole) {
    player.x += player.vx;
    collide("x");
    player.y += player.vy;
    player.onGround = false;
    collide("y");
  }

  player.x = Math.max(0, state.clearPhase === "runout" ? player.x : Math.min(WORLD_W - player.w, player.x));

  if (player.y > H + 100 && state.clearPhase === "play") gameOver();
  if (player.invincible > 0) player.invincible--;
}

function updatePlayerAnimation() {
  const moving = player.onGround && Math.abs(player.vx) > 1.1 && !state.paused && !state.gameOver && (!state.won || state.clearPhase === "runout");
  if (!moving) {
    player.runFrame = 2;
    player.runClock = 0;
    return;
  }
  player.runClock += Math.max(0.8, Math.abs(player.vx)) * RUN_ANIMATION_SPEED;
  player.runFrame = Math.floor(player.runClock) % playerRunSprites.length;
}

function collide(axis) {
  for (const block of [...solids, ...movingPlatforms]) {
    if (block.broken) continue;
    if (!hit(player, block)) continue;
    if (axis === "x") {
      if (block.type === "moving" && player.y + player.h <= block.y + 18) continue;
      if (player.vx > 0) player.x = block.x - player.w;
      if (player.vx < 0) player.x = block.x + block.w;
      player.vx = 0;
    } else {
      if (player.vy > 0) {
        player.y = block.y - player.h;
        player.vy = 0;
        player.onGround = true;
        if (block.type === "moving") {
          player.x += block.x - block.prevX;
          if (!hasHorizontalInput()) player.vx = 0;
        }
        player.jumpsLeft = MAX_JUMPS;
        jumpBuffer = 0;
      } else if (player.vy < 0) {
        player.y = block.y + block.h;
        player.vy = 2;
        if (block.type === "brick") {
          block.broken = true;
          spawnEventParticles("block", block.x + block.w / 2, block.y + block.h / 2, 16);
          state.score += 50;
        } else if (block.type === "question") {
          block.type = "used";
          powerups.push({
            x: block.x + 12,
            y: block.y - 4,
            w: 58,
            h: 58,
            vx: 1.2,
            vy: -5,
            taken: false,
            emerge: 28,
          });
        }
      }
    }
  }
}

function loseLife(source) {
  if (player.invincible > 0 || state.won || state.gameOver) return;
  if (source && player.isBig) {
    shrinkPlayer(source);
    return;
  }
  state.lives = Math.max(0, state.lives - 1);
  if (state.lives <= 0) {
    gameOver();
  } else {
    showTimedMessage("\u30df\u30b9", "#ff3d3d");
    damagePlayer(source);
  }
}

function shrinkPlayer(source) {
  setPlayerSize(false, true);
  damagePlayer(source);
  showTimedMessage("\u30d1\u30ef\u30fc\u30c0\u30a6\u30f3", "#6ee9ff");
}

function damagePlayer(source) {
  spawnEventParticles("hit", player.x + player.w / 2, player.y + player.h / 2, 18);
  player.invincible = 130;
  player.onGround = false;
  player.jumpsLeft = 1;
  player.vy = -9;
  player.vx = source && player.x + player.w / 2 < source.x + source.w / 2 ? -7 : 7;
  jumpWasDown = false;
  jumpBuffer = 0;
}

function gameOver() {
  if (state.won || state.gameOver) return;
  state.gameOver = true;
  state.lives = Math.max(0, state.lives);
  state.message = "GAME OVER";
  state.messageColor = "#fff8df";
  setTimeout(() => restart({ stage: 1 }), 1000);
}

function updateEnemies() {
  for (const enemy of enemies) {
    if (!enemy.alive || Math.abs(enemy.x - player.x) > 1350) continue;
    enemy.x += enemy.vx;
    enemy.walkClock = (enemy.walkClock || 0) + Math.max(0.7, Math.abs(enemy.vx)) * ENEMY_ANIMATION_SPEED;
    const collisionBlocks = [...solids, ...movingPlatforms];
    const probe = {
      x: enemy.vx > 0 ? enemy.x + enemy.w : enemy.x - 4,
      y: enemy.y + enemy.h + 4,
      w: 8,
      h: 8,
    };
    const wall = collisionBlocks.some((solid) => !solid.broken && hit(enemy, solid) && solid.type !== "ground" && solid.type !== "moving");
    const floor = collisionBlocks.some((solid) => !solid.broken && hit(probe, solid));
    if (wall || !floor) enemy.vx *= -1;

    if (hit(player, enemy)) {
      if (player.vy > 2 && player.y + player.h - enemy.y < 36) {
        enemy.alive = false;
        spawnEventParticles("enemy", enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, enemy.big ? 24 : 16);
        player.vy = STOMP_VELOCITY;
        state.score += enemy.big ? 400 : 200;
      } else if (player.invincible <= 0) {
        loseLife(enemy);
      }
    }
  }
}

function updateMovingPlatforms() {
  for (const platform of movingPlatforms) {
    platform.prevX = platform.x;
    platform.prevY = platform.y;
    platform.phase += platform.speed;
    const offset = Math.sin(platform.phase) * platform.range;
    if (platform.axis === "y") {
      platform.y = platform.startY + offset;
    } else {
      platform.x = platform.startX + offset;
    }
    const feet = player.y + player.h;
    const horizontal = player.x + player.w > platform.x + 6 && player.x < platform.x + platform.w - 6;
    const wasStanding = horizontal && Math.abs(feet - platform.prevY) <= 28 && player.vy >= -1;
    if (wasStanding) {
      player.y = platform.y - player.h;
      player.x += platform.x - platform.prevX;
      player.vy = Math.max(0, player.vy);
      if (!hasHorizontalInput()) player.vx = 0;
      player.onGround = true;
      player.jumpsLeft = MAX_JUMPS;
    }
  }
}

function updateStageGimmicks() {
  for (const spring of springs) {
    if (spring.bounce > 0) spring.bounce--;
    if (!hit(player, spring) || player.vy < -2) continue;
    player.y = spring.y - player.h;
    player.vy = -22;
    player.onGround = false;
    player.jumpsLeft = MAX_JUMPS;
    spring.bounce = 14;
    jumpWasDown = false;
    jumpBuffer = 0;
    spawnEventParticles("hit", spring.x + spring.w / 2, spring.y + 6, 12);
  }
  for (const hazard of hazards) {
    if (hit(player, hazard) && player.invincible <= 0) loseLife(hazard);
  }
}

function updateCoins() {
  for (const coin of coins) {
    if (coin.pop) {
      coin.y -= 2.4;
      coin.pop--;
      if (coin.pop <= 0) coin.taken = true;
    }
    if (!coin.taken && hit(player, { x: coin.x, y: coin.y, w: 38, h: 54 })) {
      coin.taken = true;
      state.coins++;
      state.score += 100;
      if (state.coins >= 10) {
        state.coins = 0;
        state.lives++;
        showTimedMessage("\u30e9\u30a4\u30d5\u30a2\u30c3\u30d7", "#ff8fb3", 120);
      }
    }
  }
}

function updatePowerups() {
  for (const item of powerups) {
    if (item.taken) continue;
    if (item.emerge > 0) {
      item.y -= 1.8;
      item.emerge--;
    } else {
      item.vy = Math.min(9, item.vy + GRAVITY * 0.55);
      item.x += item.vx;
      for (const solid of [...solids, ...movingPlatforms]) {
        if (solid.broken || solid.type === "ground") continue;
        if (!hit(item, solid)) continue;
        if (item.vx > 0) item.x = solid.x - item.w;
        if (item.vx < 0) item.x = solid.x + solid.w;
        item.vx *= -1;
      }
      item.y += item.vy;
      for (const solid of [...solids, ...movingPlatforms]) {
        if (solid.broken) continue;
        if (hit(item, solid)) {
          if (item.vy > 0) {
            item.y = solid.y - item.h;
            item.vy = 0;
          } else if (item.vy < 0) {
            item.y = solid.y + solid.h;
            item.vy = 0;
          }
        }
      }
    }
    if (hit(player, item)) {
      item.taken = true;
      setPlayerSize(true, true);
      player.invincible = Math.max(player.invincible, 90);
      state.score += 500;
      showTimedMessage("\u30d1\u30ef\u30fc\u30a2\u30c3\u30d7", "#ffe34a");
    }
  }
}

function getGoalHeightBonus() {
  const climbed = getPoleClimbedHeight();
  const maxClimb = getPoleMaxHeight();
  const rate = Math.max(0, Math.min(1, climbed / maxClimb));
  const tier = Math.min(5, Math.floor(rate * 5));
  return Math.round(climbed / 20) * 250 + tier * 1000;
}

function getGoalHeightRate() {
  const climbed = getPoleClimbedHeight();
  const maxClimb = getPoleMaxHeight();
  return Math.round(Math.max(0, Math.min(1, climbed / maxClimb)) * 100);
}

function getPoleBaseY() {
  return Math.min(GROUND_Y, flag.y + flag.h);
}

function getPoleTopY() {
  return flag.y + 2;
}

function getPlayerPoleTouchY() {
  return Math.max(getPoleTopY(), Math.min(getPoleBaseY(), player.y + player.h * 0.5));
}

function getPoleMaxHeight() {
  return Math.max(1, Math.round(getPoleBaseY() - getPoleTopY()));
}

function getPoleClimbedHeight() {
  return Math.max(0, Math.min(getPoleMaxHeight(), Math.round(getPoleBaseY() - getPlayerPoleTouchY())));
}

function getGoalHeightRank(rate) {
  if (rate >= 90) return "S";
  if (rate >= 70) return "A";
  if (rate >= 45) return "B";
  if (rate >= 20) return "C";
  return "D";
}

function updateCamera() {
  const playerCenterX = player.x + player.w / 2;
  state.camera = Math.max(0, Math.min(WORLD_W - W, playerCenterX - W * 0.5));
  const targetY = state.won ? Math.min(0, player.y + player.h / 2 - H / 2) : 0;
  const followSpeed = state.won ? 0.1 : 0.22;
  state.cameraY += (targetY - state.cameraY) * followSpeed;
  if (Math.abs(state.cameraY) < 0.2) state.cameraY = 0;
  state.cameraY = Math.max(-980, Math.min(0, state.cameraY));
}

function updateWorld() {
  if (!state.gameOver && !state.won && hit(player, flag)) {
    state.won = true;
    state.clearPhase = "poleReady";
    state.clearFlash = 26;
    state.fireworkClock = 0;
    state.poleTimer = 0;
    state.poleResultTimer = 0;
    state.poleCountdownEndAt = 0;
    state.poleResultEndAt = 0;
    state.nextStageMessageTimer = 0;
    state.poleStartY = player.y;
    state.poleResultBonus = 0;
    state.poleBonusAdded = false;
    player.x = flag.x + 40 - player.w;
    player.vx = 0;
    player.vy = 0;
    state.score += Math.max(0, state.time) * 10;
    state.message = "";
    state.messageColor = "#fff8df";
    spawnFirework(flag.x + 88, 190, 34);
    spawnFirework(flag.x - 55, 260, 24);
  }
  if (state.clearPhase === "poleClimb") {
    const remainingMs = Math.max(0, state.poleCountdownEndAt - gameNow);
    state.poleTimer = remainingMs;
    state.message = remainingMs > 0 ? String(Math.ceil(remainingMs / 1000)) : "0";
    state.messageColor = "#fff8df";
    if (remainingMs <= 0) {
      const heightBonus = getGoalHeightBonus();
      state.poleResultClimbed = getPoleClimbedHeight();
      state.poleResultRate = getGoalHeightRate();
      state.poleResultRank = getGoalHeightRank(state.poleResultRate);
      state.poleResultBonus = heightBonus;
      state.score += heightBonus;
      state.poleBonusAdded = true;
      state.clearPhase = "poleResult";
      state.poleResultEndAt = gameNow + 4000;
      state.poleResultTimer = 4000;
      state.message = "";
      spawnFirework(player.x + player.w / 2, player.y + player.h / 2, 42);
    }
  }
  if (state.clearPhase === "poleResult") {
    state.message = "";
    state.messageColor = "#fff8df";
    state.poleResultTimer = Math.max(0, state.poleResultEndAt - gameNow);
    if (state.poleResultTimer <= 0) advanceFromResult();
  }
  if (state.won && state.clearPhase !== "done") {
    state.fireworkClock++;
    if (state.fireworkClock % 24 === 0) {
      const burstX = player.x + 220 + (Math.sin(state.fireworkClock * 0.7) * 180);
      const burstY = 120 + ((state.fireworkClock * 37) % 210);
      spawnFirework(Math.min(flag.x + 160, Math.max(flag.x - 360, burstX)), burstY, 22);
    }
  }
  if (state.clearPhase === "done" && fireworks.length > 0) {
    updateFireworks();
    if (state.clearFlash > 0) state.clearFlash--;
    updateCamera();
    return;
  }
  if (state.clearPhase === "done") {
    if (state.stage < MAX_STAGE) {
      state.nextStageTimer++;
      state.message = "";
      state.messageColor = "#fff8df";
      if (state.nextStageTimer > 1) switchToStage(state.stage + 1);
      updateCamera();
      return;
    }
    state.message = "\u305c\u3093\u3081\u3093\u30af\u30ea\u30a2!";
    state.messageColor = "#fff8df";
  }
  updateFireworks();
  if (state.clearFlash > 0) state.clearFlash--;
  updateCamera();
}

function spawnFirework(x, y, count = 28) {
  const colors = ["#fff27a", "#ff4d6d", "#66e6ff", "#8cff66", "#ff9d2e", "#ffffff"];
  const actualCount = Math.max(6, Math.round(count * PARTICLE_SCALE));
  for (let i = 0; i < actualCount; i++) {
    const angle = (Math.PI * 2 * i) / actualCount;
    const speed = 2.2 + (i % 5) * 0.42;
    fireworks.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 44 + (i % 4) * 8,
      maxLife: 68,
      color: colors[i % colors.length],
      size: 3 + (i % 3),
    });
  }
}

function spawnEventParticles(kind, x, y, count = 14) {
  const palettes = {
    enemy: ["#fff27a", "#ffcf38", "#ffffff"],
    block: ["#c45d1e", "#f18a2b", "#6b310f"],
    hit: ["#ff3d3d", "#ffd861", "#ffffff"],
  };
  const colors = palettes[kind] || ["#ffffff"];
  const actualCount = Math.max(5, Math.round(count * PARTICLE_SCALE));
  for (let i = 0; i < actualCount; i++) {
    const angle = -Math.PI / 2 + (Math.PI * 2 * i) / actualCount;
    const spread = kind === "block" ? 3.8 : kind === "hit" ? 4.4 : 3.4;
    const speed = 1.4 + (i % 5) * 0.42;
    fireworks.push({
      x,
      y,
      vx: Math.cos(angle) * speed * spread / 3,
      vy: Math.sin(angle) * speed * spread / 3 - (kind === "block" ? 0.5 : 0.9),
      life: kind === "hit" ? 28 + (i % 3) * 5 : 38 + (i % 4) * 6,
      maxLife: kind === "hit" ? 42 : 56,
      color: colors[i % colors.length],
      size: kind === "block" ? 9 + (i % 3) * 2 : 12 + (i % 3) * 2,
      kind,
      spin: (i % 2 ? -1 : 1) * (0.12 + (i % 4) * 0.04),
      angle: i * 0.6,
    });
  }
}

function updateFireworks() {
  for (let i = fireworks.length - 1; i >= 0; i--) {
    const spark = fireworks[i];
    spark.x += spark.vx;
    spark.y += spark.vy;
    spark.vy += spark.kind === "block" ? 0.22 : spark.kind === "hit" ? 0.06 : 0.045;
    spark.vx *= 0.985;
    spark.angle = (spark.angle || 0) + (spark.spin || 0);
    spark.life--;
    if (spark.life <= 0) fireworks.splice(i, 1);
  }
}

function drawText(text, x, y, size = 36, align = "left", fill = "#fff8df", stroke = "#4f2b03") {
  ctx.save();
  ctx.font = `900 ${size}px ${UI_FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = "top";
  ctx.lineJoin = "round";
  ctx.lineWidth = Math.max(6, size * 0.14);
  ctx.strokeStyle = stroke;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
  ctx.restore();
}

function drawPopupMessage(text, x, y, size = 56) {
  const progress = 1 - Math.max(0, state.messageTimer) / 120;
  let scale = 1;
  if (progress < 0.34) {
    const popProgress = progress / 0.34;
    const pulse = Math.sin(popProgress * Math.PI * 2);
    scale = 1 + Math.max(0, pulse) * 0.18 - Math.max(0, -pulse) * 0.04;
  }
  ctx.save();
  ctx.translate(x, y + size * 0.5);
  ctx.scale(scale, scale);
  drawText(text, 0, -size * 0.5, size, "center", state.messageColor || "#fff8df", "#4f2b03");
  ctx.restore();
}

function rect(x, y, w, h, fill, stroke = "#101010", lw = 4) {
  ctx.fillStyle = fill;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  if (stroke) {
    ctx.lineWidth = lw;
    ctx.strokeStyle = stroke;
    ctx.strokeRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }
}

function drawBackground() {
  if (cityBackgroundSprite.complete && cityBackgroundSprite.naturalWidth > 0) {
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    const parallax = 0.32;
    const tileW = W;
    const offset = -((state.camera * parallax) % tileW);
    for (let x = offset - tileW; x < W + tileW; x += tileW) {
      ctx.drawImage(cityBackgroundSprite, Math.round(x), 0, tileW, H);
    }
    ctx.restore();
    return;
  }
  ctx.fillStyle = "#17a9f3";
  ctx.fillRect(0, 0, W, H);
}

function drawCloud(x, y, scale) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = "#dff7ff";
  const parts = [[0, 35, 80, 30], [45, 10, 74, 55], [95, 25, 95, 40], [155, 42, 70, 25], [-20, 55, 240, 24]];
  for (const [px, py, pw, ph] of parts) ctx.fillRect(px, py, pw, ph);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(58, 16, 44, 18);
  ctx.fillRect(20, 38, 62, 16);
  ctx.restore();
}

function drawHill(x, base, width, height, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, base);
  ctx.lineTo(x + width * 0.5, base - height);
  ctx.lineTo(x + width, base);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#16883a";
  ctx.lineWidth = 8;
  ctx.stroke();
  ctx.fillStyle = "rgba(0, 100, 54, 0.55)";
  ctx.fillRect(x + width * 0.37, base - height * 0.45, 14, 28);
  ctx.fillRect(x + width * 0.58, base - height * 0.27, 12, 18);
}

function drawBush(x, y) {
  ctx.fillStyle = "#8ded1b";
  ctx.fillRect(x, y + 28, 150, 26);
  ctx.fillRect(x + 24, y + 8, 45, 46);
  ctx.fillRect(x + 70, y, 50, 54);
  ctx.fillStyle = "#35c80b";
  ctx.fillRect(x + 14, y + 34, 118, 12);
}

function drawGround() {
  const cam = state.camera;
  if (grassSprite.complete && grassSprite.naturalWidth > 0 && groundSprite.complete && groundSprite.naturalWidth > 0) {
    for (const segment of groundSegments) {
      const start = Math.floor(segment.x / TILE) * TILE;
      const end = segment.x + segment.w;
      for (let worldX = start; worldX < end; worldX += TILE) {
        const drawX = worldX - cam;
        if (drawX < -TILE || drawX > W + TILE) continue;
        const visibleW = Math.min(TILE, end - worldX);
        ctx.drawImage(grassSprite, 0, 0, 88 * (visibleW / TILE), 88, Math.round(drawX), GROUND_Y, visibleW, TILE);
        ctx.drawImage(groundSprite, 0, 0, 88 * (visibleW / TILE), 88, Math.round(drawX), GROUND_Y + TILE, visibleW, TILE);
        ctx.drawImage(groundSprite, 0, 0, 88 * (visibleW / TILE), 88, Math.round(drawX), GROUND_Y + TILE * 2, visibleW, TILE);
      }
    }
    return;
  }
  for (const segment of groundSegments) {
    rect(segment.x - cam, GROUND_Y, segment.w, 34, "#69ee15", "#159211", 0);
  }
}

function drawBlock(block) {
  if (block.broken) return;
  const x = block.x - state.camera;
  if (block.type === "ground") return;
  if (block.type === "pipe") {
    rect(x, block.y + 42, block.w, block.h - 42, "#1fc81f", "#062b08", 5);
    rect(x - 10, block.y, block.w + 20, 48, "#23d825", "#062b08", 5);
    ctx.fillStyle = "#97ff62";
    ctx.fillRect(x + 20, block.y + 8, 18, block.h - 14);
    ctx.fillStyle = "#119812";
    ctx.fillRect(x + block.w - 30, block.y + 8, 14, block.h - 14);
    return;
  }
  const sprite = block.type === "question" ? questionSprite : block.type === "brick" || block.type === "used" ? brickSprite : null;
  if (sprite && sprite.complete && sprite.naturalWidth > 0) {
    ctx.drawImage(sprite, Math.round(x), Math.round(block.y), Math.round(block.w), Math.round(block.h));
    return;
  }
  const fill = block.type === "question" ? "#f5b90e" : block.type === "used" ? "#b9842d" : "#c55b16";
  rect(x, block.y, block.w, block.h, fill, "#121212", 5);
  if (block.type === "question") {
    drawText("?", x + block.w / 2, block.y + 3, 48, "center");
  } else {
    ctx.strokeStyle = "#77280a";
    ctx.lineWidth = 4;
    for (let yy = block.y + 20; yy < block.y + block.h; yy += 22) {
      ctx.beginPath();
      ctx.moveTo(x + 3, yy);
      ctx.lineTo(x + block.w - 3, yy);
      ctx.stroke();
    }
    for (let xx = x + 42; xx < x + block.w; xx += 84) {
      ctx.beginPath();
      ctx.moveTo(xx, block.y + 4);
      ctx.lineTo(xx, block.y + block.h - 4);
      ctx.stroke();
    }
  }
}

function drawCoin(coin) {
  if (coin.taken) return;
  const x = coin.x - state.camera;
  if (eggCoinSprite.complete && eggCoinSprite.naturalWidth > 0) {
    ctx.drawImage(eggCoinSprite, Math.round(x), Math.round(coin.y), 42, 42);
    return;
  }
  ctx.fillStyle = "#f7c800";
  ctx.strokeStyle = "#6e4200";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.ellipse(x + 19, coin.y + 27, 18, 27, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#fff27a";
  ctx.fillRect(x + 12, coin.y + 8, 6, 36);
}

function drawPowerup(item) {
  if (item.taken) return;
  const x = item.x - state.camera;
  if (chickenSprite.complete && chickenSprite.naturalWidth > 0) {
    ctx.drawImage(chickenSprite, Math.round(x), Math.round(item.y), item.w, item.h);
    return;
  }
  rect(x, item.y, item.w, item.h, "#c96b1d", "#111", 4);
}

function drawSpring(spring) {
  const x = spring.x - state.camera;
  const squash = spring.bounce > 0 ? 8 : 0;
  const y = spring.y + squash;
  const h = spring.h - squash;
  rect(x, y + h - 10, spring.w, 10, "#13b859", "#3b2200", 4);
  ctx.strokeStyle = "#fff27a";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(x + 8, y + h - 12);
  ctx.lineTo(x + 20, y + 10);
  ctx.lineTo(x + 32, y + h - 12);
  ctx.lineTo(x + 44, y + 10);
  ctx.lineTo(x + spring.w - 8, y + h - 12);
  ctx.stroke();
  rect(x + 4, y, spring.w - 8, 12, "#ffe34a", "#3b2200", 4);
}

function drawHazard(hazard) {
  const x = hazard.x - state.camera;
  const count = Math.max(1, Math.floor(hazard.w / 44));
  const spikeW = hazard.w / count;
  ctx.save();
  for (let i = 0; i < count; i++) {
    const sx = x + i * spikeW;
    const cx = sx + spikeW / 2;
    const cy = hazard.y + hazard.h / 2;
    ctx.fillStyle = i % 2 === 0 ? "#b6bac2" : "#8f949d";
    ctx.strokeStyle = "#3f434b";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx, hazard.y + 2);
    ctx.lineTo(sx + spikeW - 4, cy);
    ctx.lineTo(cx, hazard.y + hazard.h - 2);
    ctx.lineTo(sx + 4, cy);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#f3f6fa";
    ctx.fillRect(Math.round(cx - 4), Math.round(hazard.y + 10), 8, 10);
  }
  ctx.restore();
}

function drawMovingPlatform(platform) {
  const x = platform.x - state.camera;
  rect(x, platform.y, platform.w, platform.h, "#69c9ff", "#193a62", 5);
  ctx.fillStyle = "#e8fbff";
  ctx.fillRect(Math.round(x + 10), Math.round(platform.y + 6), Math.round(platform.w - 20), 6);
  ctx.fillStyle = "#2f78d8";
  ctx.fillRect(Math.round(x + 8), Math.round(platform.y + platform.h - 8), Math.round(platform.w - 16), 4);
}

function drawFireworks() {
  if (state.clearFlash > 0) {
    ctx.save();
    ctx.globalAlpha = state.clearFlash / 42;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  ctx.save();
  for (const spark of fireworks) {
    const alpha = Math.max(0, Math.min(1, spark.life / spark.maxLife));
    const x = spark.x - state.camera;
    ctx.globalAlpha = alpha;
    const sprite = spark.kind ? particleSprites[spark.kind] : null;
    if (sprite && sprite.complete && sprite.naturalWidth > 0) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(Math.round(x), Math.round(spark.y));
      ctx.rotate(spark.angle || 0);
      ctx.drawImage(sprite, -spark.size / 2, -spark.size / 2, spark.size, spark.size);
      ctx.restore();
    } else {
      ctx.fillStyle = spark.color;
      ctx.fillRect(Math.round(x), Math.round(spark.y), spark.size, spark.size);
      if (!MOBILE_LIGHT_MODE) {
        ctx.globalAlpha = alpha * 0.42;
        ctx.fillRect(Math.round(x - spark.vx * 3), Math.round(spark.y - spark.vy * 3), Math.max(2, spark.size - 1), Math.max(2, spark.size - 1));
      }
    }
  }
  ctx.restore();
}

function drawEnemy(enemy) {
  if (!enemy.alive) return;
  const x = enemy.x - state.camera;
  const y = enemy.y;
  const frame = Math.floor(enemy.walkClock || 0) % enemyWalkSprites.length;
  const sprite = enemyWalkSprites[frame] && enemyWalkSprites[frame].complete && enemyWalkSprites[frame].naturalWidth > 0
    ? enemyWalkSprites[frame]
    : enemySprite;
  if (sprite.complete && sprite.naturalWidth > 0) {
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    const bob = Math.sin((enemy.walkClock || 0) * Math.PI) * 1.5;
    const drawH = enemy.h;
    const drawW = drawH * (sprite.naturalWidth / sprite.naturalHeight);
    const drawX = x + (enemy.w - drawW) / 2;
    if (enemy.vx > 0) {
      ctx.translate(Math.round(drawX + drawW), Math.round(y + bob));
      ctx.scale(-1, 1);
      ctx.drawImage(sprite, 0, 0, drawW, drawH);
    } else {
      ctx.drawImage(sprite, Math.round(drawX), Math.round(y + bob), drawW, drawH);
    }
    ctx.restore();
    return;
  }
  const body = enemy.big ? "#b5581d" : "#aa4d16";
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(x + enemy.w * 0.5, y - (enemy.big ? 24 : 10));
  ctx.quadraticCurveTo(x + enemy.w, y + 4, x + enemy.w - 5, y + enemy.h - 12);
  ctx.lineTo(x + 5, y + enemy.h - 12);
  ctx.quadraticCurveTo(x - 2, y + 6, x + enemy.w * 0.5, y - (enemy.big ? 24 : 10));
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = "#181008";
  ctx.stroke();
  rect(x + 16, y + enemy.h - 12, 28, 14, "#733009", "#181008", 4);
  rect(x + enemy.w - 44, y + enemy.h - 12, 28, 14, "#733009", "#181008", 4);
  rect(x + 26, y + 26, 20, 28, "#ffffff", "#181008", 4);
  rect(x + enemy.w - 48, y + 26, 20, 28, "#ffffff", "#181008", 4);
  rect(x + 36, y + 35, 9, 14, "#111", null);
  rect(x + enemy.w - 46, y + 35, 9, 14, "#111", null);
  ctx.fillStyle = "#f4d16a";
  for (let i = 0; i < 8; i++) {
    ctx.beginPath();
    ctx.moveTo(x + 12 + i * 12, y + enemy.h - 22);
    ctx.lineTo(x + 20 + i * 12, y + enemy.h - 4);
    ctx.lineTo(x + 2 + i * 12, y + enemy.h - 4);
    ctx.fill();
  }
}

function drawPlayer() {
  const x = player.x - state.camera;
  const y = player.y;
  const blink = player.invincible > 0 && Math.floor(player.invincible / 6) % 2 === 0;
  if (blink) return;
  const moving = player.onGround && Math.abs(player.vx) > 1.1 && !state.paused && !state.won && !state.gameOver;
  const animatedSprite = moving ? playerRunSprites[player.runFrame] : playerRunSprites[2];
  const sprite = animatedSprite && animatedSprite.complete && animatedSprite.naturalWidth > 0 ? animatedSprite : playerSprite;
  if (sprite.complete && sprite.naturalWidth > 0) {
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    const drawH = player.h;
    const drawW = drawH * (sprite.naturalWidth / sprite.naturalHeight);
    const drawX = x + (player.w - drawW) / 2;
    if (player.facing < 0) {
      ctx.translate(Math.round(drawX + drawW), Math.round(y));
      ctx.scale(-1, 1);
      ctx.drawImage(sprite, 0, 0, drawW, drawH);
    } else {
      ctx.drawImage(sprite, Math.round(drawX), Math.round(y), drawW, drawH);
    }
    ctx.restore();
    return;
  }
  rect(x + 18, y + 4, 54, 52, "#ffd0a0", "#111", 5);
  rect(x + 16, y + 42, 48, 40, "#ffd21a", "#111", 5);
}

function drawFlag() {
  const x = flag.x - state.camera;
  rect(x + 40, flag.y + 5, 22, flag.h - 5, "#28d436", "#112c0a", 5);
  ctx.fillStyle = "#ffc125";
  ctx.strokeStyle = "#121212";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(x + 58, flag.y + 70);
  ctx.lineTo(x + 150, flag.y + 107);
  ctx.lineTo(x + 58, flag.y + 145);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  drawText("G", x + 96, flag.y + 95, 34, "center");
  ctx.fillStyle = "#ffd600";
  ctx.beginPath();
  ctx.arc(x + 51, flag.y + 2, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

function drawHud() {
  if (lifeHeartSprite.complete && lifeHeartSprite.naturalWidth > 0) {
    ctx.drawImage(lifeHeartSprite, 28, 20, 58, 58);
  } else {
    drawMiniHead(30, 24);
  }
  drawText(`ライフ×${state.gameOver ? 0 : Math.max(0, state.lives)}`, 100, 28, 34);
  drawCoin({ x: 34 + state.camera, y: 98, taken: false });
  drawText(`x${state.coins}`, 90, 96, 36);
  drawText("WORLD", W * 0.32, 28, 36, "center");
  drawText(`1-${state.stage}`, W * 0.32, 68, 36, "center");
  drawText("TIME", W * 0.5, 28, 36, "center");
  drawText(String(Math.max(0, state.time)).padStart(3, "0"), W * 0.5, 68, 36, "center");
  drawText("SCORE", W * 0.87, 28, 36, "center");
  drawText(String(state.score).padStart(7, "0"), W * 0.87, 68, 36, "center");
  if (state.message) {
    if (state.timedMessage && state.message === state.timedMessage) {
      drawPopupMessage(state.message, W / 2, 160, 56);
    } else {
      drawText(state.message, W / 2, 160, 56, "center", state.messageColor || "#fff8df", "#4f2b03");
    }
  }
  if (state.clearPhase === "poleReady" || state.clearPhase === "poleClimb") {
    drawText("\u30b8\u30e3\u30f3\u30d7\u30dc\u30bf\u30f3\u3092\u9023\u6253\u3057\u3066\uff01", W / 2, 224, 34, "center", "#ffe34a", "#4f2b03");
  }
  if (state.clearPhase === "poleResult") {
    drawText("\u30b3\u30fc\u30b9\u30af\u30ea\u30a2", W / 2, 160, 56, "center", "#fff8df", "#4f2b03");
    drawText(`\u306e\u307c\u3063\u305f\u9ad8\u3055 ${state.poleResultClimbed}px`, W / 2, 258, 34, "center", "#fff8df", "#4f2b03");
    drawText(`\u30dc\u30fc\u30ca\u30b9 +${state.poleResultBonus}`, W / 2, 316, 40, "center", "#ffe34a", "#4f2b03");
  }
  if (state.paused) {
    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.38)";
    ctx.fillRect(0, 0, W, H);
    drawText("PAUSE", W / 2, H / 2 - 52, 64, "center");
    drawText("P: RESUME", W / 2, H / 2 + 20, 28, "center");
    ctx.restore();
  }
}

function shouldShowTouchControls() {
  return touchInput.seen || navigator.maxTouchPoints > 0 || window.innerWidth <= 900;
}

function drawTouchControls() {
  if (!shouldShowTouchControls()) return;
  const rects = getTouchButtonRects();
  for (const [name, rect] of Object.entries(rects)) {
    const sprite = touchButtonSprites[name];
    ctx.save();
    ctx.globalAlpha = touchInput[name] ? 1 : 0.82;
    const scale = touchInput[name] ? 0.94 : 1;
    ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
    ctx.scale(scale, scale);
    if (sprite.complete && sprite.naturalWidth > 0) {
      ctx.drawImage(sprite, -rect.w / 2, -rect.h / 2, rect.w, rect.h);
    } else {
      rect(-rect.w / 2, -rect.h / 2, rect.w, rect.h, "rgba(255,255,255,0.55)", "#ffffff", 4);
      drawText(name === "jump" ? "^" : name === "left" ? "<" : ">", 0, -28, 46, "center");
    }
    ctx.restore();
  }
}

function drawStartScreen() {
  drawBackground();
  ctx.save();
  ctx.fillStyle = "rgba(5, 13, 28, 0.45)";
  ctx.fillRect(0, 0, W, H);
  if (titleSprite.complete && titleSprite.naturalWidth > 0) {
    ctx.drawImage(titleSprite, W / 2 - 380, 28, 760, 220);
  } else {
    drawText("ぐちおジャンプ", W / 2, 110, 58, "center");
  }
  drawText(`1-${state.stage}`, W / 2, 240, 34, "center");

  const panelX = W / 2 - 370;
  const panelY = 285;
  const panelW = 740;
  const panelH = 250;
  ctx.fillStyle = "rgba(255, 241, 176, 0.92)";
  ctx.fillRect(panelX, panelY, panelW, panelH);
  ctx.lineWidth = 6;
  ctx.strokeStyle = "#5b3300";
  ctx.strokeRect(panelX, panelY, panelW, panelH);

  drawText("あそびかた", W / 2, panelY + 24, 32, "center");
  drawText("いどう: A / D または やじるし", panelX + 58, panelY + 78, 24);
  drawText("ジャンプ: SPACE / W / うえ  にだんジャンプ", panelX + 58, panelY + 112, 24);
  drawText("いちじていし: P   やりなおし: R", panelX + 58, panelY + 146, 24);
  drawText("ちきんをとると おおきくなるよ", panelX + 58, panelY + 180, 24);

  drawText("えんたーをおして", W / 2, 574, 42, "center");
  drawText("すたーと", W / 2, 622, 34, "center");
  ctx.restore();
}

function drawMiniHead(x, y) {
  rect(x, y, 64, 58, "#ffd0a0", "#111", 4);
  rect(x, y - 2, 64, 18, "#7a421c", "#111", 4);
  rect(x + 21, y + 24, 13, 16, "#fff", "#111", 3);
  rect(x + 44, y + 24, 13, 16, "#fff", "#111", 3);
  ctx.fillStyle = "#f36b58";
  ctx.fillRect(x + 37, y + 42, 12, 8);
}

let last = performance.now();
let tick = 0;
function loop(now) {
  gameNow = now;
  const elapsedMs = Math.min(100, now - last);
  const dt = Math.min(2, elapsedMs / 16.667);
  last = now;
  ctx.setTransform(RENDER_SCALE, 0, 0, RENDER_SCALE, 0, 0);
  ctx.imageSmoothingEnabled = false;
  if (!state.started) {
    drawStartScreen();
    requestAnimationFrame(loop);
    return;
  }
  if (!state.paused) updateTimedMessage(dt);
  if (!state.paused) tick += elapsedMs;
  if (!state.paused && !state.won && !state.gameOver) {
    updateMovingPlatforms();
    updatePlayer();
    updateStageGimmicks();
    updateEnemies();
    updateCoins();
    updatePowerups();
    updateWorld();
    if (tick >= 1000) {
      state.time--;
      tick -= 1000;
      if (state.time <= 0) loseLife();
    }
  } else {
    if (!state.paused && state.won && !state.gameOver) {
      updatePlayer();
    }
    updateWorld();
  }

  drawBackground();
  ctx.save();
  ctx.translate(0, -Math.round(state.cameraY));
  for (const block of solids) drawBlock(block);
  for (const platform of movingPlatforms) drawMovingPlatform(platform);
  for (const coin of coins) drawCoin(coin);
  for (const item of powerups) drawPowerup(item);
  drawFlag();
  for (const enemy of enemies) drawEnemy(enemy);
  drawPlayer();
  drawGround();
  for (const spring of springs) drawSpring(spring);
  for (const hazard of hazards) drawHazard(hazard);
  drawFireworks();
  ctx.restore();
  drawHud();
  requestAnimationFrame(loop);
}

restart();
requestAnimationFrame(loop);
