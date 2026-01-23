/**
 * ==================== GEOMETRY DASH - LEVELS DATA ====================
 * Complete level definitions with obstacles, decorations, and metadata
 * Each level is inspired by the original Geometry Dash levels
 */

// Level difficulty enum
const DIFFICULTY = {
  AUTO: 0,
  EASY: 1,
  NORMAL: 2,
  HARD: 3,
  HARDER: 4,
  INSANE: 5,
  DEMON: 6
};

// Level length enum
const LENGTH = {
  TINY: 'Tiny',
  SHORT: 'Short',
  MEDIUM: 'Medium',
  LONG: 'Long',
  XL: 'XL'
};

// Obstacle types
const OBS_TYPE = {
  SPIKE: 'spike',
  SPIKE_SMALL: 'spike_small',
  SPIKE_DOUBLE: 'spike_double',
  SPIKE_TRIPLE: 'spike_triple',
  SPIKE_UP: 'spike_up',
  BLOCK: 'block',
  BLOCK_HALF: 'block_half',
  BLOCK_FADE: 'block_fade',
  COIN: 'coin',
  SECRET_COIN: 'secret_coin',
  ORB_YELLOW: 'orb_yellow',
  ORB_PINK: 'orb_pink',
  ORB_RED: 'orb_red',
  ORB_BLUE: 'orb_blue',
  ORB_GREEN: 'orb_green',
  PAD_YELLOW: 'pad_yellow',
  PAD_PINK: 'pad_pink',
  PAD_RED: 'pad_red',
  PAD_BLUE: 'pad_blue',
  PORTAL_GRAVITY: 'portal_gravity',
  PORTAL_GRAVITY_NORMAL: 'portal_gravity_normal',
  PORTAL_SHIP: 'portal_ship',
  PORTAL_CUBE: 'portal_cube',
  PORTAL_BALL: 'portal_ball',
  PORTAL_UFO: 'portal_ufo',
  PORTAL_WAVE: 'portal_wave',
  PORTAL_ROBOT: 'portal_robot',
  PORTAL_SPIDER: 'portal_spider',
  PORTAL_SPEED_SLOW: 'portal_speed_slow',
  PORTAL_SPEED_NORMAL: 'portal_speed_normal',
  PORTAL_SPEED_FAST: 'portal_speed_fast',
  PORTAL_SPEED_FASTER: 'portal_speed_faster',
  PORTAL_SPEED_FASTEST: 'portal_speed_fastest',
  PORTAL_SIZE_MINI: 'portal_size_mini',
  PORTAL_SIZE_NORMAL: 'portal_size_normal',
  SAWBLADE: 'sawblade',
  SAWBLADE_SMALL: 'sawblade_small',
  MOVING_SPIKE: 'moving_spike',
  MOVING_BLOCK: 'moving_block',
  CHAIN: 'chain',
  PILLAR: 'pillar',
  END: 'end'
};

// Decoration types
const DECO_TYPE = {
  GROUND_SPIKE: 'ground_spike',
  GROUND_LINE: 'ground_line',
  BG_PILLAR: 'bg_pillar',
  BG_BUILDING: 'bg_building',
  PARTICLES: 'particles',
  GLOW: 'glow',
  PULSE: 'pulse'
};

/**
 * Level 1: Stereo Madness
 * The iconic first level - introduces basic mechanics
 */
function generateLevel1() {
  const obstacles = [];
  const decorations = [];
  let x = 800;
  
  // === INTRO SECTION ===
  // Simple single spikes to learn timing
  for (let i = 0; i < 3; i++) {
    obstacles.push({ type: OBS_TYPE.SPIKE, x: x, y: 0 });
    x += 450;
  }
  
  // First block introduction
  obstacles.push({ type: OBS_TYPE.BLOCK, x: x, y: 0, width: 80, height: 40 });
  x += 200;
  obstacles.push({ type: OBS_TYPE.SPIKE, x: x, y: 0 });
  x += 400;
  
  // === FIRST CHALLENGE SECTION ===
  // Block-spike combinations
  for (let i = 0; i < 4; i++) {
    obstacles.push({ type: OBS_TYPE.BLOCK, x: x, y: 0, width: 80, height: 40 });
    obstacles.push({ type: OBS_TYPE.SPIKE, x: x + 120, y: 0 });
    x += 380;
  }
  
  // Double spikes
  for (let i = 0; i < 3; i++) {
    obstacles.push({ type: OBS_TYPE.SPIKE, x: x, y: 0 });
    obstacles.push({ type: OBS_TYPE.SPIKE, x: x + 50, y: 0 });
    x += 520;
  }
  
  // === PLATFORM SECTION ===
  // Stacked blocks
  for (let i = 0; i < 3; i++) {
    obstacles.push({ type: OBS_TYPE.BLOCK, x: x, y: 0, width: 120, height: 40 });
    obstacles.push({ type: OBS_TYPE.BLOCK, x: x + 40, y: 40, width: 40, height: 40 });
    obstacles.push({ type: OBS_TYPE.SPIKE, x: x + 160, y: 0 });
    x += 420;
  }
  
  // First coin opportunity
  obstacles.push({ type: OBS_TYPE.COIN, x: x + 100, y: 100 });
  
  // Triple spike challenge
  for (let i = 0; i < 2; i++) {
    obstacles.push({ type: OBS_TYPE.SPIKE, x: x, y: 0 });
    obstacles.push({ type: OBS_TYPE.SPIKE, x: x + 50, y: 0 });
    obstacles.push({ type: OBS_TYPE.SPIKE, x: x + 100, y: 0 });
    x += 650;
  }
  
  // === JUMP PAD SECTION ===
  obstacles.push({ type: OBS_TYPE.PAD_YELLOW, x: x, y: 0 });
  x += 200;
  obstacles.push({ type: OBS_TYPE.BLOCK, x: x, y: 80, width: 200, height: 40 });
  obstacles.push({ type: OBS_TYPE.SPIKE, x: x + 80, y: 120 });
  x += 450;
  
  // More challenging combinations
  for (let i = 0; i < 5; i++) {
    obstacles.push({ type: OBS_TYPE.BLOCK, x: x, y: 0, width: 40, height: 40 });
    obstacles.push({ type: OBS_TYPE.SPIKE, x: x + 80, y: 0 });
    x += 320;
  }
  
  // Second coin (harder to get)
  obstacles.push({ type: OBS_TYPE.SPIKE, x: x, y: 0 });
  obstacles.push({ type: OBS_TYPE.COIN, x: x + 25, y: 80 });
  obstacles.push({ type: OBS_TYPE.SPIKE, x: x + 50, y: 0 });
  x += 400;
  
  // === ORB SECTION ===
  obstacles.push({ type: OBS_TYPE.ORB_YELLOW, x: x + 50, y: 100 });
  obstacles.push({ type: OBS_TYPE.BLOCK, x: x + 180, y: 100, width: 120, height: 40 });
  obstacles.push({ type: OBS_TYPE.SPIKE, x: x + 220, y: 140 });
  x += 500;
  
  // === FINAL STRETCH ===
  // Rapid spike section
  for (let i = 0; i < 6; i++) {
    obstacles.push({ type: OBS_TYPE.SPIKE, x: x, y: 0 });
    x += 350;
  }
  
  // Final platforms
  for (let i = 0; i < 3; i++) {
    obstacles.push({ type: OBS_TYPE.BLOCK, x: x, y: 0, width: 100, height: 60 });
    obstacles.push({ type: OBS_TYPE.SPIKE, x: x + 50, y: 60 });
    x += 350;
  }
  
  // Third coin (secret path)
  obstacles.push({ type: OBS_TYPE.SECRET_COIN, x: x + 50, y: 150 });
  
  // Final challenge
  obstacles.push({ type: OBS_TYPE.PAD_YELLOW, x: x, y: 0 });
  obstacles.push({ type: OBS_TYPE.SPIKE, x: x + 150, y: 100 });
  obstacles.push({ type: OBS_TYPE.SPIKE, x: x + 200, y: 100 });
  obstacles.push({ type: OBS_TYPE.BLOCK, x: x + 300, y: 80, width: 150, height: 40 });
  x += 600;
  
  // Ending spikes
  for (let i = 0; i < 4; i++) {
    obstacles.push({ type: OBS_TYPE.SPIKE, x: x, y: 0 });
    x += 380;
  }
  
  obstacles.push({ type: OBS_TYPE.END, x: x + 250 });
  
  return { obstacles, decorations };
}

/**
 * Level 2: Back On Track
 * Second level - introduces more complex patterns
 */
function generateLevel2() {
  const obstacles = [];
  const decorations = [];
  let x = 800;
  
  // === OPENING ===
  // Block stairs
  for (let i = 0; i < 5; i++) {
    obstacles.push({ type: OBS_TYPE.BLOCK, x: x, y: 0, width: 60, height: 40 });
    x += 220;
  }
  
  // Spike gaps
  for (let i = 0; i < 4; i++) {
    obstacles.push({ type: OBS_TYPE.SPIKE, x: x, y: 0 });
    obstacles.push({ type: OBS_TYPE.BLOCK, x: x + 100, y: 0, width: 80, height: 60 });
    x += 380;
  }
  
  // === STAIRCASE SECTION ===
  // Ascending
  for (let i = 0; i < 4; i++) {
    obstacles.push({ type: OBS_TYPE.BLOCK, x: x, y: i * 30, width: 60, height: 30 + i * 30 });
    x += 100;
  }
  
  obstacles.push({ type: OBS_TYPE.SPIKE, x: x, y: 90 });
  x += 150;
  
  // Descending
  for (let i = 3; i >= 0; i--) {
    obstacles.push({ type: OBS_TYPE.BLOCK, x: x, y: i * 25, width: 60, height: 25 + (3-i) * 25 });
    x += 100;
  }
  x += 150;
  
  // === DOUBLE BLOCK JUMPS ===
  for (let i = 0; i < 4; i++) {
    obstacles.push({ type: OBS_TYPE.BLOCK, x: x, y: 0, width: 40, height: 40 });
    obstacles.push({ type: OBS_TYPE.BLOCK, x: x + 80, y: 0, width: 40, height: 40 });
    obstacles.push({ type: OBS_TYPE.SPIKE, x: x + 160, y: 0 });
    x += 420;
  }
  
  // Coin 1
  obstacles.push({ type: OBS_TYPE.COIN, x: x, y: 80 });
  x += 150;
  
  // === ORB SECTION ===
  obstacles.push({ type: OBS_TYPE.ORB_YELLOW, x: x + 50, y: 100 });
  obstacles.push({ type: OBS_TYPE.BLOCK, x: x + 180, y: 100, width: 100, height: 40 });
  x += 450;
  
  // Pink orb introduction
  obstacles.push({ type: OBS_TYPE.ORB_PINK, x: x + 50, y: 80 });
  obstacles.push({ type: OBS_TYPE.SPIKE, x: x + 130, y: 0 });
  obstacles.push({ type: OBS_TYPE.BLOCK, x: x + 200, y: 60, width: 100, height: 40 });
  x += 480;
  
  // === MIXED CHALLENGE ===
  for (let i = 0; i < 5; i++) {
    if (i % 2 === 0) {
      obstacles.push({ type: OBS_TYPE.SPIKE, x: x, y: 0 });
      obstacles.push({ type: OBS_TYPE.SPIKE, x: x + 50, y: 0 });
    } else {
      obstacles.push({ type: OBS_TYPE.BLOCK, x: x, y: 0, width: 60, height: 50 });
    }
    x += 280;
  }
  
  // Coin 2
  obstacles.push({ type: OBS_TYPE.COIN, x: x + 50, y: 120 });
  
  // === PAD SECTION ===
  for (let i = 0; i < 2; i++) {
    obstacles.push({ type: OBS_TYPE.PAD_YELLOW, x: x, y: 0 });
    obstacles.push({ type: OBS_TYPE.BLOCK, x: x + 220, y: 120, width: 100, height: 40 });
    obstacles.push({ type: OBS_TYPE.SPIKE, x: x + 250, y: 160 });
    x += 500;
  }
  
  // === FINAL RUN ===
  for (let i = 0; i < 8; i++) {
    if (i % 2 === 0) {
      obstacles.push({ type: OBS_TYPE.SPIKE, x: x, y: 0 });
    } else {
      obstacles.push({ type: OBS_TYPE.BLOCK, x: x, y: 0, width: 50, height: 35 });
    }
    x += 250;
  }
  
  // Coin 3
  obstacles.push({ type: OBS_TYPE.SECRET_COIN, x: x, y: 60 });
  x += 200;
  
  obstacles.push({ type: OBS_TYPE.END, x: x + 250 });
  
  return { obstacles, decorations };
}

/**
 * Level 3: Polargeist
 * Third level - introduces more height variation and tight jumps
 */
function generateLevel3() {
  const obstacles = [];
  const decorations = [];
  let x = 700;
  
  // === GHOST INTRO ===
  for (let i = 0; i < 4; i++) {
    obstacles.push({ type: OBS_TYPE.BLOCK, x: x, y: 0, width: 100, height: 50 });
    obstacles.push({ type: OBS_TYPE.SPIKE, x: x + 50, y: 50 });
    x += 320;
  }
  
  // === FLOATING PLATFORMS ===
  for (let i = 0; i < 5; i++) {
    const height = 40 + (i % 3) * 35;
    obstacles.push({ type: OBS_TYPE.BLOCK, x: x, y: height, width: 80, height: 20 });
    obstacles.push({ type: OBS_TYPE.SPIKE, x: x + 30, y: 0 });
    x += 300;
  }
  
  // Coin 1
  obstacles.push({ type: OBS_TYPE.COIN, x: x, y: 100 });
  x += 150;
  
  // === SPIKE CORRIDORS ===
  for (let i = 0; i < 4; i++) {
    obstacles.push({ type: OBS_TYPE.SPIKE, x: x, y: 0 });
    obstacles.push({ type: OBS_TYPE.SPIKE, x: x + 50, y: 0 });
    obstacles.push({ type: OBS_TYPE.BLOCK, x: x + 100, y: 0, width: 60, height: 80 });
    x += 380;
  }
  
  // === JUMP PAD ELEVATION ===
  obstacles.push({ type: OBS_TYPE.PAD_YELLOW, x: x, y: 0 });
  obstacles.push({ type: OBS_TYPE.BLOCK, x: x + 220, y: 120, width: 150, height: 30 });
  obstacles.push({ type: OBS_TYPE.SPIKE, x: x + 270, y: 150 });
  x += 550;
  
  // Pink pad introduction
  obstacles.push({ type: OBS_TYPE.PAD_PINK, x: x, y: 0 });
  obstacles.push({ type: OBS_TYPE.BLOCK, x: x + 280, y: 160, width: 120, height: 30 });
  obstacles.push({ type: OBS_TYPE.SPIKE, x: x + 320, y: 190 });
  x += 600;
  
  // === TRIPLE THREAT ===
  for (let i = 0; i < 3; i++) {
    obstacles.push({ type: OBS_TYPE.SPIKE, x: x, y: 0 });
    obstacles.push({ type: OBS_TYPE.SPIKE, x: x + 50, y: 0 });
    obstacles.push({ type: OBS_TYPE.SPIKE, x: x + 100, y: 0 });
    x += 550;
  }
  
  // Coin 2
  obstacles.push({ type: OBS_TYPE.COIN, x: x, y: 80 });
  x += 200;
  
  // === ORB CHAIN ===
  obstacles.push({ type: OBS_TYPE.ORB_YELLOW, x: x + 50, y: 80 });
  obstacles.push({ type: OBS_TYPE.ORB_YELLOW, x: x + 200, y: 120 });
  obstacles.push({ type: OBS_TYPE.BLOCK, x: x + 380, y: 100, width: 100, height: 40 });
  x += 650;
  
  // === TIGHT CORRIDORS ===
  for (let i = 0; i < 6; i++) {
    const yOffset = (i % 2) * 40;
    obstacles.push({ type: OBS_TYPE.BLOCK, x: x, y: yOffset, width: 50, height: 50 });
    obstacles.push({ type: OBS_TYPE.SPIKE, x: x + 70, y: 0 });
    x += 220;
  }
  
  // === FINAL GAUNTLET ===
  for (let i = 0; i < 10; i++) {
    if (i % 3 === 0) {
      obstacles.push({ type: OBS_TYPE.PAD_YELLOW, x: x, y: 0 });
    } else if (i % 3 === 1) {
      obstacles.push({ type: OBS_TYPE.SPIKE, x: x, y: 0 });
    } else {
      obstacles.push({ type: OBS_TYPE.BLOCK, x: x, y: 0, width: 45, height: 55 });
    }
    x += 200;
  }
  
  // Coin 3 (secret)
  obstacles.push({ type: OBS_TYPE.SECRET_COIN, x: x + 50, y: 180 });
  x += 250;
  
  obstacles.push({ type: OBS_TYPE.END, x: x + 300 });
  
  return { obstacles, decorations };
}

/**
 * Level 4: Dry Out
 * Fourth level - desert theme with pyramid-like structures
 */
function generateLevel4() {
  const obstacles = [];
  const decorations = [];
  let x = 700;
  
  // === DESERT INTRO ===
  for (let i = 0; i < 4; i++) {
    obstacles.push({ type: OBS_TYPE.BLOCK, x: x, y: 0, width: 150, height: 30 });
    obstacles.push({ type: OBS_TYPE.SPIKE, x: x + 170, y: 0 });
    x += 380;
  }
  
  // === PYRAMID STEPS (ASCENDING) ===
  for (let i = 0; i < 5; i++) {
    obstacles.push({ type: OBS_TYPE.BLOCK, x: x, y: 0, width: 40, height: 40 * (i + 1) });
    x += 60;
  }
  x += 120;
  
  // === PYRAMID STEPS (DESCENDING) ===
  for (let i = 4; i >= 0; i--) {
    obstacles.push({ type: OBS_TYPE.BLOCK, x: x, y: 0, width: 40, height: 40 * (i + 1) });
    obstacles.push({ type: OBS_TYPE.SPIKE, x: x, y: 40 * (i + 1) });
    x += 60;
  }
  x += 180;
  
  // === SAND DUNES (Wavy blocks) ===
  for (let i = 0; i < 7; i++) {
    const height = 35 + Math.sin(i * 0.9) * 50;
    obstacles.push({ type: OBS_TYPE.BLOCK, x: x, y: 0, width: 55, height: Math.max(35, height) });
    x += 100;
  }
  x += 120;
  
  // Coin 1
  obstacles.push({ type: OBS_TYPE.COIN, x: x, y: 70 });
  x += 150;
  
  // === OASIS SECTION ===
  obstacles.push({ type: OBS_TYPE.PAD_YELLOW, x: x, y: 0 });
  obstacles.push({ type: OBS_TYPE.COIN, x: x + 150, y: 150 });
  obstacles.push({ type: OBS_TYPE.BLOCK, x: x + 250, y: 100, width: 150, height: 40 });
  x += 550;
  
  // === CACTUS SPIKES ===
  for (let i = 0; i < 5; i++) {
    obstacles.push({ type: OBS_TYPE.SPIKE, x: x, y: 0 });
    obstacles.push({ type: OBS_TYPE.SPIKE, x: x + 30, y: 35 });
    x += 320;
  }
  
  // === QUICKSAND PLATFORMS ===
  for (let i = 0; i < 4; i++) {
    obstacles.push({ type: OBS_TYPE.BLOCK_FADE, x: x, y: 0, width: 80, height: 40 });
    obstacles.push({ type: OBS_TYPE.SPIKE, x: x + 100, y: 0 });
    x += 300;
  }
  
  // === ORB DESERT ===
  obstacles.push({ type: OBS_TYPE.ORB_YELLOW, x: x, y: 70 });
  obstacles.push({ type: OBS_TYPE.ORB_PINK, x: x + 150, y: 100 });
  obstacles.push({ type: OBS_TYPE.BLOCK, x: x + 320, y: 80, width: 100, height: 40 });
  x += 550;
  
  // Coin 2
  obstacles.push({ type: OBS_TYPE.SECRET_COIN, x: x, y: 40 });
  
  // === FINAL DESERT RUN ===
  for (let i = 0; i < 6; i++) {
    obstacles.push({ type: OBS_TYPE.BLOCK, x: x, y: 0, width: 80, height: 40 });
    obstacles.push({ type: OBS_TYPE.SPIKE, x: x + 100, y: 0 });
    obstacles.push({ type: OBS_TYPE.SPIKE, x: x + 150, y: 0 });
    x += 420;
  }
  
  // === SUNSET SPIKES ===
  for (let i = 0; i < 8; i++) {
    obstacles.push({ type: OBS_TYPE.SPIKE, x: x, y: 0 });
    x += 250;
  }
  
  // Coin 3
  obstacles.push({ type: OBS_TYPE.COIN, x: x + 80, y: 90 });
  x += 300;
  
  obstacles.push({ type: OBS_TYPE.END, x: x + 300 });
  
  return { obstacles, decorations };
}

/**
 * Level 5: Base After Base
 * Fifth level - base jumping theme with platforms
 */
function generateLevel5() {
  const obstacles = [];
  const decorations = [];
  let x = 700;
  
  // === BASE JUMPING INTRO ===
  for (let i = 0; i < 4; i++) {
    obstacles.push({ type: OBS_TYPE.BLOCK, x: x, y: 0, width: 100, height: 60 });
    obstacles.push({ type: OBS_TYPE.BLOCK, x: x + 200, y: 60, width: 100, height: 60 });
    x += 480;
  }
  
  // === GAP JUMPS WITH SPIKES ===
  for (let i = 0; i < 5; i++) {
    obstacles.push({ type: OBS_TYPE.SPIKE, x: x, y: 0 });
    obstacles.push({ type: OBS_TYPE.BLOCK, x: x + 90, y: 0, width: 65, height: 45 });
    x += 300;
  }
  
  // Coin 1
  obstacles.push({ type: OBS_TYPE.COIN, x: x + 50, y: 100 });
  
  // === ELEVATED PLATFORMS ===
  for (let i = 0; i < 5; i++) {
    obstacles.push({ type: OBS_TYPE.BLOCK, x: x, y: 55 + i * 22, width: 85, height: 32 });
    obstacles.push({ type: OBS_TYPE.SPIKE, x: x + 110, y: 0 });
    x += 320;
  }
  
  // === ORB CHAIN CHALLENGE ===
  obstacles.push({ type: OBS_TYPE.ORB_YELLOW, x: x, y: 85 });
  obstacles.push({ type: OBS_TYPE.ORB_YELLOW, x: x + 160, y: 110 });
  obstacles.push({ type: OBS_TYPE.ORB_PINK, x: x + 320, y: 85 });
  obstacles.push({ type: OBS_TYPE.BLOCK, x: x + 500, y: 70, width: 110, height: 45 });
  x += 780;
  
  // === COIN TRAIL ===
  for (let i = 0; i < 3; i++) {
    obstacles.push({ type: OBS_TYPE.COIN, x: x + i * 110, y: 65 + Math.sin(i * 1.1) * 35 });
  }
  x += 450;
  
  // === SPEED SECTION ===
  for (let i = 0; i < 10; i++) {
    obstacles.push({ type: OBS_TYPE.SPIKE, x: x, y: 0 });
    x += 200;
  }
  
  // === FINAL BASES ===
  for (let i = 0; i < 4; i++) {
    obstacles.push({ type: OBS_TYPE.BLOCK, x: x, y: 0, width: 130, height: 85 });
    obstacles.push({ type: OBS_TYPE.SPIKE, x: x + 55, y: 85 });
    obstacles.push({ type: OBS_TYPE.PAD_YELLOW, x: x + 155, y: 0 });
    x += 420;
  }
  
  // Coin 2
  obstacles.push({ type: OBS_TYPE.COIN, x: x + 50, y: 160 });
  
  // === LANDING ZONE ===
  for (let i = 0; i < 6; i++) {
    obstacles.push({ type: OBS_TYPE.BLOCK, x: x, y: 0, width: 60, height: 40 });
    x += 200;
  }
  
  // Coin 3 (secret)
  obstacles.push({ type: OBS_TYPE.SECRET_COIN, x: x, y: 50 });
  x += 200;
  
  obstacles.push({ type: OBS_TYPE.END, x: x + 300 });
  
  return { obstacles, decorations };
}

/**
 * Level 6: Can't Let Go
 * Sixth level - intense and fast-paced
 */
function generateLevel6() {
  const obstacles = [];
  const decorations = [];
  let x = 600;
  
  // === INTENSE OPENING ===
  for (let i = 0; i < 6; i++) {
    obstacles.push({ type: OBS_TYPE.SPIKE, x: x, y: 0 });
    x += 260;
  }
  
  // === BLOCK MAZE ===
  for (let i = 0; i < 5; i++) {
    obstacles.push({ type: OBS_TYPE.BLOCK, x: x, y: 0, width: 55, height: 45 });
    obstacles.push({ type: OBS_TYPE.BLOCK, x: x, y: 85, width: 55, height: 45 });
    obstacles.push({ type: OBS_TYPE.SPIKE, x: x + 75, y: 45 });
    x += 260;
  }
  
  // === PAD FRENZY ===
  for (let i = 0; i < 4; i++) {
    obstacles.push({ type: OBS_TYPE.PAD_YELLOW, x: x, y: 0 });
    obstacles.push({ type: OBS_TYPE.SPIKE, x: x + 160, y: 110 });
    obstacles.push({ type: OBS_TYPE.BLOCK, x: x + 220, y: 90, width: 90, height: 35 });
    x += 420;
  }
  
  // Coin 1
  obstacles.push({ type: OBS_TYPE.COIN, x: x + 50, y: 80 });
  
  // === TIGHT CORRIDORS ===
  for (let i = 0; i < 7; i++) {
    obstacles.push({ type: OBS_TYPE.BLOCK, x: x, y: 0, width: 45, height: 35 + (i % 3) * 22 });
    obstacles.push({ type: OBS_TYPE.SPIKE, x: x + 65, y: 0 });
    x += 190;
  }
  
  // === ORB SEQUENCES ===
  obstacles.push({ type: OBS_TYPE.ORB_YELLOW, x: x, y: 65 });
  obstacles.push({ type: OBS_TYPE.SPIKE, x: x + 90, y: 0 });
  obstacles.push({ type: OBS_TYPE.ORB_PINK, x: x + 170, y: 90 });
  obstacles.push({ type: OBS_TYPE.SPIKE, x: x + 260, y: 0 });
  obstacles.push({ type: OBS_TYPE.ORB_YELLOW, x: x + 340, y: 65 });
  x += 520;
  
  // Coin 2 (in danger zone)
  obstacles.push({ type: OBS_TYPE.SPIKE, x: x, y: 0 });
  obstacles.push({ type: OBS_TYPE.COIN, x: x + 25, y: 70 });
  obstacles.push({ type: OBS_TYPE.SPIKE, x: x + 50, y: 0 });
  x += 320;
  
  // === MIXED CHAOS ===
  for (let i = 0; i < 12; i++) {
    const type = i % 4;
    if (type === 0) {
      obstacles.push({ type: OBS_TYPE.PAD_YELLOW, x: x, y: 0 });
    } else if (type === 1) {
      obstacles.push({ type: OBS_TYPE.SPIKE, x: x, y: 0 });
      obstacles.push({ type: OBS_TYPE.SPIKE, x: x + 50, y: 0 });
    } else if (type === 2) {
      obstacles.push({ type: OBS_TYPE.BLOCK, x: x, y: 0, width: 65, height: 55 });
    } else {
      obstacles.push({ type: OBS_TYPE.ORB_YELLOW, x: x + 30, y: 70 });
    }
    x += 210;
  }
  
  // Coin 3 (secret)
  obstacles.push({ type: OBS_TYPE.SECRET_COIN, x: x, y: 150 });
  x += 200;
  
  obstacles.push({ type: OBS_TYPE.END, x: x + 300 });
  
  return { obstacles, decorations };
}

/**
 * Level 7: Jumper
 * Seventh level - all about precision timing
 */
function generateLevel7() {
  const obstacles = [];
  const decorations = [];
  let x = 600;
  
  // === OPENING PLATFORMS ===
  for (let i = 0; i < 7; i++) {
    obstacles.push({ type: OBS_TYPE.BLOCK, x: x, y: 0, width: 45, height: 45 });
    obstacles.push({ type: OBS_TYPE.BLOCK, x: x + 90, y: 0, width: 45, height: 45 });
    x += 300;
  }
  
  // === SPIKE TUNNELS ===
  for (let i = 0; i < 5; i++) {
    obstacles.push({ type: OBS_TYPE.SPIKE, x: x, y: 0 });
    obstacles.push({ type: OBS_TYPE.SPIKE, x: x + 50, y: 0 });
    obstacles.push({ type: OBS_TYPE.SPIKE, x: x + 100, y: 0 });
    x += 420;
  }
  
  // === ASCENDING PLATFORMS ===
  for (let i = 0; i < 6; i++) {
    obstacles.push({ type: OBS_TYPE.BLOCK, x: x, y: i * 28, width: 65, height: 28 });
    obstacles.push({ type: OBS_TYPE.SPIKE, x: x + 85, y: 0 });
    x += 210;
  }
  
  // Coin 1
  obstacles.push({ type: OBS_TYPE.COIN, x: x + 50, y: 180 });
  
  // === AIR SECTION WITH ORBS ===
  obstacles.push({ type: OBS_TYPE.ORB_YELLOW, x: x, y: 110 });
  obstacles.push({ type: OBS_TYPE.COIN, x: x + 110, y: 150 });
  obstacles.push({ type: OBS_TYPE.ORB_PINK, x: x + 220, y: 130 });
  obstacles.push({ type: OBS_TYPE.BLOCK, x: x + 380, y: 110, width: 110, height: 35 });
  x += 650;
  
  // === RAPID JUMPS ===
  for (let i = 0; i < 10; i++) {
    obstacles.push({ type: OBS_TYPE.BLOCK, x: x, y: 0, width: 35, height: 35 });
    x += 130;
  }
  
  // === FINAL CHALLENGE ===
  for (let i = 0; i < 7; i++) {
    obstacles.push({ type: OBS_TYPE.SPIKE, x: x, y: 0 });
    if (i % 2 === 0) {
      obstacles.push({ type: OBS_TYPE.PAD_YELLOW, x: x + 70, y: 0 });
    }
    x += 210;
  }
  
  // Coin 2
  obstacles.push({ type: OBS_TYPE.COIN, x: x, y: 100 });
  
  // === LANDING ZONE ===
  obstacles.push({ type: OBS_TYPE.BLOCK, x: x + 100, y: 70, width: 220, height: 45 });
  obstacles.push({ type: OBS_TYPE.SPIKE, x: x + 180, y: 115 });
  x += 450;
  
  // Final spikes
  for (let i = 0; i < 5; i++) {
    obstacles.push({ type: OBS_TYPE.SPIKE, x: x, y: 0 });
    x += 250;
  }
  
  // Coin 3 (secret)
  obstacles.push({ type: OBS_TYPE.SECRET_COIN, x: x, y: 60 });
  x += 200;
  
  obstacles.push({ type: OBS_TYPE.END, x: x + 300 });
  
  return { obstacles, decorations };
}

/**
 * Level 8: Time Machine
 * Eighth level - complex synchronized patterns
 */
function generateLevel8() {
  const obstacles = [];
  const decorations = [];
  let x = 600;
  
  // === TIME INTRO ===
  for (let i = 0; i < 5; i++) {
    obstacles.push({ type: OBS_TYPE.BLOCK, x: x, y: 0, width: 85, height: 45 + i * 12 });
    obstacles.push({ type: OBS_TYPE.SPIKE, x: x + 110, y: 0 });
    x += 300;
  }
  
  // === TIME PORTALS (blocks with orbs) ===
  for (let i = 0; i < 4; i++) {
    obstacles.push({ type: OBS_TYPE.BLOCK, x: x, y: 0, width: 110, height: 110 });
    obstacles.push({ type: OBS_TYPE.ORB_YELLOW, x: x + 55, y: 130 });
    x += 380;
  }
  
  // Coin 1
  obstacles.push({ type: OBS_TYPE.COIN, x: x, y: 80 });
  
  // === SYNCHRONIZED SPIKES ===
  for (let i = 0; i < 7; i++) {
    obstacles.push({ type: OBS_TYPE.SPIKE, x: x, y: 0 });
    obstacles.push({ type: OBS_TYPE.SPIKE, x: x, y: 65 });
    x += 260;
  }
  
  // === PLATFORM MAZE ===
  for (let i = 0; i < 5; i++) {
    obstacles.push({ type: OBS_TYPE.BLOCK, x: x, y: (i % 2) * 55, width: 65, height: 45 });
    obstacles.push({ type: OBS_TYPE.SPIKE, x: x + 85, y: 0 });
    x += 230;
  }
  
  // === COIN CONSTELLATION ===
  for (let i = 0; i < 3; i++) {
    obstacles.push({ type: OBS_TYPE.COIN, x: x + i * 90, y: 55 + Math.sin(i * 1.6) * 35 });
  }
  x += 380;
  
  // === PAD TELEPORTS ===
  obstacles.push({ type: OBS_TYPE.PAD_YELLOW, x: x, y: 0 });
  obstacles.push({ type: OBS_TYPE.BLOCK, x: x + 270, y: 130, width: 110, height: 35 });
  obstacles.push({ type: OBS_TYPE.PAD_PINK, x: x + 300, y: 165 });
  x += 580;
  
  // === TIME WARP BLOCKS ===
  for (let i = 0; i < 9; i++) {
    const yOffset = Math.sin(i * 0.8) * 35;
    obstacles.push({ type: OBS_TYPE.BLOCK, x: x, y: Math.max(0, yOffset), width: 45, height: 45 });
    x += 160;
  }
  
  // Coin 2
  obstacles.push({ type: OBS_TYPE.COIN, x: x + 50, y: 120 });
  
  // === ENDING SPIKES ===
  for (let i = 0; i < 6; i++) {
    obstacles.push({ type: OBS_TYPE.SPIKE, x: x, y: 0 });
    x += 210;
  }
  
  // Coin 3 (secret)
  obstacles.push({ type: OBS_TYPE.SECRET_COIN, x: x, y: 45 });
  x += 200;
  
  obstacles.push({ type: OBS_TYPE.END, x: x + 300 });
  
  return { obstacles, decorations };
}

/**
 * Level 9: Cycles
 * Ninth level - repeating cyclical patterns
 */
function generateLevel9() {
  const obstacles = [];
  const decorations = [];
  let x = 500;
  
  // === CYCLE 1: BASIC ===
  for (let cycle = 0; cycle < 3; cycle++) {
    obstacles.push({ type: OBS_TYPE.SPIKE, x: x, y: 0 });
    obstacles.push({ type: OBS_TYPE.BLOCK, x: x + 90, y: 0, width: 55, height: 45 });
    obstacles.push({ type: OBS_TYPE.SPIKE, x: x + 165, y: 0 });
    obstacles.push({ type: OBS_TYPE.SPIKE, x: x + 215, y: 0 });
    x += 420;
  }
  
  // === CYCLE 2: ELEVATED ===
  for (let cycle = 0; cycle < 3; cycle++) {
    obstacles.push({ type: OBS_TYPE.BLOCK, x: x, y: 45, width: 85, height: 45 });
    obstacles.push({ type: OBS_TYPE.SPIKE, x: x + 35, y: 90 });
    obstacles.push({ type: OBS_TYPE.SPIKE, x: x + 110, y: 0 });
    x += 370;
  }
  
  // Coin 1
  obstacles.push({ type: OBS_TYPE.COIN, x: x, y: 70 });
  
  // === CYCLE 3: ORBS ===
  for (let cycle = 0; cycle < 3; cycle++) {
    obstacles.push({ type: OBS_TYPE.ORB_YELLOW, x: x, y: 75 });
    obstacles.push({ type: OBS_TYPE.SPIKE, x: x + 90, y: 0 });
    obstacles.push({ type: OBS_TYPE.BLOCK, x: x + 165, y: 0, width: 65, height: 65 });
    x += 400;
  }
  
  // === CYCLE 4: PADS ===
  for (let cycle = 0; cycle < 2; cycle++) {
    obstacles.push({ type: OBS_TYPE.PAD_YELLOW, x: x, y: 0 });
    obstacles.push({ type: OBS_TYPE.BLOCK, x: x + 200, y: 110, width: 110, height: 35 });
    obstacles.push({ type: OBS_TYPE.SPIKE, x: x + 240, y: 145 });
    obstacles.push({ type: OBS_TYPE.COIN, x: x + 250, y: 195 });
    x += 480;
  }
  
  // === BREAKING THE CYCLE - CHAOS ===
  for (let i = 0; i < 12; i++) {
    const rand = i % 4;
    if (rand === 0) {
      obstacles.push({ type: OBS_TYPE.SPIKE, x: x, y: 0 });
    } else if (rand === 1) {
      obstacles.push({ type: OBS_TYPE.BLOCK, x: x, y: 0, width: 45, height: 55 });
    } else if (rand === 2) {
      obstacles.push({ type: OBS_TYPE.SPIKE, x: x, y: 0 });
      obstacles.push({ type: OBS_TYPE.SPIKE, x: x + 50, y: 0 });
    } else {
      obstacles.push({ type: OBS_TYPE.ORB_YELLOW, x: x, y: 65 });
    }
    x += 210;
  }
  
  // Coin 2
  obstacles.push({ type: OBS_TYPE.COIN, x: x, y: 100 });
  
  // Coin 3 (secret)
  obstacles.push({ type: OBS_TYPE.SECRET_COIN, x: x + 100, y: 40 });
  x += 250;
  
  obstacles.push({ type: OBS_TYPE.END, x: x + 300 });
  
  return { obstacles, decorations };
}

/**
 * Level 10: xStep
 * Tenth level - dubstep energy with intense patterns
 */
function generateLevel10() {
  const obstacles = [];
  const decorations = [];
  let x = 500;
  
  // === DROP INTRO ===
  for (let i = 0; i < 5; i++) {
    obstacles.push({ type: OBS_TYPE.BLOCK, x: x, y: 0, width: 35 + i * 12, height: 35 + i * 12 });
    x += 160;
  }
  
  // === BASS DROP SPIKES ===
  for (let i = 0; i < 10; i++) {
    obstacles.push({ type: OBS_TYPE.SPIKE, x: x, y: 0 });
    if (i % 2 === 0) {
      obstacles.push({ type: OBS_TYPE.SPIKE, x: x + 50, y: 0 });
    }
    x += 210;
  }
  
  // Coin 1
  obstacles.push({ type: OBS_TYPE.COIN, x: x, y: 80 });
  
  // === SYNTH PLATFORMS ===
  for (let i = 0; i < 6; i++) {
    const height = 45 + Math.abs(Math.sin(i * 1.3)) * 65;
    obstacles.push({ type: OBS_TYPE.BLOCK, x: x, y: 0, width: 65, height: height });
    obstacles.push({ type: OBS_TYPE.SPIKE, x: x + 90, y: 0 });
    x += 265;
  }
  
  // === WUB WUB SECTION (Orbs) ===
  obstacles.push({ type: OBS_TYPE.ORB_YELLOW, x: x, y: 65 });
  obstacles.push({ type: OBS_TYPE.ORB_PINK, x: x + 110, y: 90 });
  obstacles.push({ type: OBS_TYPE.ORB_YELLOW, x: x + 220, y: 65 });
  obstacles.push({ type: OBS_TYPE.ORB_PINK, x: x + 330, y: 110 });
  obstacles.push({ type: OBS_TYPE.BLOCK, x: x + 460, y: 90, width: 130, height: 45 });
  x += 750;
  
  // === COIN DROPS ===
  obstacles.push({ type: OBS_TYPE.COIN, x: x, y: 45 });
  obstacles.push({ type: OBS_TYPE.SPIKE, x: x + 55, y: 0 });
  obstacles.push({ type: OBS_TYPE.COIN, x: x + 110, y: 90 });
  obstacles.push({ type: OBS_TYPE.SPIKE, x: x + 165, y: 0 });
  x += 380;
  
  // === BUILD UP ===
  for (let i = 0; i < 7; i++) {
    obstacles.push({ type: OBS_TYPE.BLOCK, x: x, y: 0, width: 45, height: 45 + i * 10 });
    x += 130;
  }
  
  // === FINAL DROP ===
  for (let i = 0; i < 15; i++) {
    if (i % 3 === 0) {
      obstacles.push({ type: OBS_TYPE.PAD_YELLOW, x: x, y: 0 });
    } else {
      obstacles.push({ type: OBS_TYPE.SPIKE, x: x, y: 0 });
    }
    x += 160;
  }
  
  // Coin 3 (secret)
  obstacles.push({ type: OBS_TYPE.SECRET_COIN, x: x, y: 130 });
  x += 200;
  
  obstacles.push({ type: OBS_TYPE.END, x: x + 300 });
  
  return { obstacles, decorations };
}

/**
 * Level 11: Clutterfunk
 * Eleventh level - pure chaos and complexity
 */
function generateLevel11() {
  const obstacles = [];
  const decorations = [];
  let x = 500;
  
  // === CLUTTERED INTRO ===
  for (let i = 0; i < 7; i++) {
    obstacles.push({ type: OBS_TYPE.BLOCK, x: x, y: 0, width: 35, height: 35 + (i % 3) * 22 });
    obstacles.push({ type: OBS_TYPE.SPIKE, x: x + 55, y: (i % 2) * 35 });
    x += 190;
  }
  
  // === FUNKY PLATFORMS ===
  for (let i = 0; i < 6; i++) {
    obstacles.push({ type: OBS_TYPE.BLOCK, x: x, y: Math.abs(Math.sin(i)) * 55, width: 75, height: 35 });
    obstacles.push({ type: OBS_TYPE.SPIKE, x: x + 35, y: 0 });
    obstacles.push({ type: OBS_TYPE.ORB_YELLOW, x: x + 110, y: 65 });
    x += 320;
  }
  
  // Coin 1
  obstacles.push({ type: OBS_TYPE.COIN, x: x, y: 100 });
  
  // === CHAOS ZONE ===
  for (let i = 0; i < 10; i++) {
    const type = i % 4;
    if (type === 0) {
      obstacles.push({ type: OBS_TYPE.SPIKE, x: x, y: 0 });
      obstacles.push({ type: OBS_TYPE.SPIKE, x: x + 50, y: 0 });
      obstacles.push({ type: OBS_TYPE.SPIKE, x: x + 100, y: 0 });
    } else if (type === 1) {
      obstacles.push({ type: OBS_TYPE.BLOCK, x: x, y: 0, width: 110, height: 75 });
      obstacles.push({ type: OBS_TYPE.SPIKE, x: x + 45, y: 75 });
    } else if (type === 2) {
      obstacles.push({ type: OBS_TYPE.PAD_YELLOW, x: x, y: 0 });
      obstacles.push({ type: OBS_TYPE.SPIKE, x: x + 110, y: 90 });
    } else {
      obstacles.push({ type: OBS_TYPE.ORB_PINK, x: x + 35, y: 90 });
      obstacles.push({ type: OBS_TYPE.SPIKE, x: x + 110, y: 0 });
    }
    x += 265;
  }
  
  // === HIDDEN COINS ===
  obstacles.push({ type: OBS_TYPE.COIN, x: x, y: 35 });
  obstacles.push({ type: OBS_TYPE.COIN, x: x + 110, y: 65 });
  obstacles.push({ type: OBS_TYPE.SECRET_COIN, x: x + 220, y: 100 });
  x += 420;
  
  // === FINAL CLUTTER ===
  for (let i = 0; i < 12; i++) {
    obstacles.push({ type: OBS_TYPE.SPIKE, x: x, y: 0 });
    if (i % 2 === 0) {
      obstacles.push({ type: OBS_TYPE.BLOCK, x: x + 65, y: 0, width: 45, height: 45 });
    }
    x += 190;
  }
  
  obstacles.push({ type: OBS_TYPE.END, x: x + 300 });
  
  return { obstacles, decorations };
}

/**
 * Level 12: Theory of Everything
 * Twelfth level - the ultimate test of skill
 */
function generateLevel12() {
  const obstacles = [];
  const decorations = [];
  let x = 400;
  
  // === OPENING THEORY ===
  for (let i = 0; i < 6; i++) {
    obstacles.push({ type: OBS_TYPE.BLOCK, x: x, y: 0, width: 55, height: 55 });
    obstacles.push({ type: OBS_TYPE.SPIKE, x: x + 75, y: 0 });
    obstacles.push({ type: OBS_TYPE.SPIKE, x: x + 130, y: 0 });
    x += 320;
  }
  
  // Coin 1
  obstacles.push({ type: OBS_TYPE.COIN, x: x, y: 80 });
  
  // === QUANTUM LEAPS ===
  for (let i = 0; i < 5; i++) {
    obstacles.push({ type: OBS_TYPE.PAD_YELLOW, x: x, y: 0 });
    obstacles.push({ type: OBS_TYPE.BLOCK, x: x + 220, y: 110 + i * 12, width: 90, height: 35 });
    obstacles.push({ type: OBS_TYPE.ORB_PINK, x: x + 380, y: 130 });
    obstacles.push({ type: OBS_TYPE.SPIKE, x: x + 490, y: 0 });
    x += 580;
  }
  
  // === WAVE THEORY (Wavy platforms) ===
  for (let i = 0; i < 7; i++) {
    const y = Math.sin(i * 0.9) * 45 + 55;
    obstacles.push({ type: OBS_TYPE.BLOCK, x: x, y: Math.max(0, y), width: 65, height: 35 });
    obstacles.push({ type: OBS_TYPE.SPIKE, x: x + 90, y: 0 });
    x += 210;
  }
  
  // === STRING THEORY (Orb chains) ===
  obstacles.push({ type: OBS_TYPE.ORB_YELLOW, x: x, y: 65 });
  obstacles.push({ type: OBS_TYPE.ORB_PINK, x: x + 130, y: 90 });
  obstacles.push({ type: OBS_TYPE.ORB_YELLOW, x: x + 260, y: 65 });
  obstacles.push({ type: OBS_TYPE.ORB_PINK, x: x + 390, y: 110 });
  obstacles.push({ type: OBS_TYPE.ORB_YELLOW, x: x + 520, y: 90 });
  obstacles.push({ type: OBS_TYPE.BLOCK, x: x + 660, y: 65, width: 110, height: 45 });
  x += 920;
  
  // Coin 2
  obstacles.push({ type: OBS_TYPE.COIN, x: x, y: 120 });
  
  // === RELATIVITY (Speed section) ===
  for (let i = 0; i < 15; i++) {
    obstacles.push({ type: OBS_TYPE.SPIKE, x: x, y: 0 });
    x += 160;
  }
  
  // === COIN UNIVERSE ===
  obstacles.push({ type: OBS_TYPE.COIN, x: x, y: 55 });
  obstacles.push({ type: OBS_TYPE.COIN, x: x + 90, y: 90 });
  obstacles.push({ type: OBS_TYPE.SECRET_COIN, x: x + 180, y: 55 });
  x += 380;
  
  // === FINAL THEOREM ===
  for (let i = 0; i < 10; i++) {
    obstacles.push({ type: OBS_TYPE.BLOCK, x: x, y: 0, width: 45, height: 45 + i * 6 });
    obstacles.push({ type: OBS_TYPE.SPIKE, x: x + 65, y: 0 });
    if (i % 2 === 0) {
      obstacles.push({ type: OBS_TYPE.ORB_YELLOW, x: x + 110, y: 65 });
    }
    x += 210;
  }
  
  // === ULTIMATE CHALLENGE ===
  for (let i = 0; i < 8; i++) {
    obstacles.push({ type: OBS_TYPE.SPIKE, x: x, y: 0 });
    obstacles.push({ type: OBS_TYPE.SPIKE, x: x + 50, y: 0 });
    obstacles.push({ type: OBS_TYPE.SPIKE, x: x + 100, y: 0 });
    obstacles.push({ type: OBS_TYPE.PAD_PINK, x: x + 200, y: 0 });
    x += 380;
  }
  
  obstacles.push({ type: OBS_TYPE.END, x: x + 400 });
  
  return { obstacles, decorations };
}

// ==================== LEVELS COLLECTION ====================
const LEVELS = [
  {
    id: 1,
    name: "Stereo Madness",
    difficulty: DIFFICULTY.EASY,
    stars: 1,
    description: "The classic first level. Perfect for beginners learning the basics!",
    author: "RobTop",
    color: "#00d4ff",
    secondaryColor: "#0099cc",
    bpm: 140,
    length: LENGTH.MEDIUM,
    unlocked: true,
    bestProgress: 0,
    attempts: 0,
    coinsCollected: [false, false, false],
    generator: generateLevel1
  },
  {
    id: 2,
    name: "Back On Track",
    difficulty: DIFFICULTY.EASY,
    stars: 1,
    description: "Keep the rhythm and stay on track! Watch your timing.",
    author: "RobTop",
    color: "#4ecdc4",
    secondaryColor: "#26a69a",
    bpm: 130,
    length: LENGTH.MEDIUM,
    unlocked: true,
    bestProgress: 0,
    attempts: 0,
    coinsCollected: [false, false, false],
    generator: generateLevel2
  },
  {
    id: 3,
    name: "Polargeist",
    difficulty: DIFFICULTY.NORMAL,
    stars: 2,
    description: "Things are getting spooky... Watch for the floating platforms!",
    author: "RobTop",
    color: "#9b59b6",
    secondaryColor: "#7d3c98",
    bpm: 145,
    length: LENGTH.MEDIUM,
    unlocked: true,
    bestProgress: 0,
    attempts: 0,
    coinsCollected: [false, false, false],
    generator: generateLevel3
  },
  {
    id: 4,
    name: "Dry Out",
    difficulty: DIFFICULTY.NORMAL,
    stars: 2,
    description: "The desert awaits with pyramid challenges and sand dunes!",
    author: "RobTop",
    color: "#e67e22",
    secondaryColor: "#d35400",
    bpm: 150,
    length: LENGTH.MEDIUM,
    unlocked: true,
    bestProgress: 0,
    attempts: 0,
    coinsCollected: [false, false, false],
    generator: generateLevel4
  },
  {
    id: 5,
    name: "Base After Base",
    difficulty: DIFFICULTY.NORMAL,
    stars: 2,
    description: "Jump from base to base! Master the elevated platforms.",
    author: "RobTop",
    color: "#27ae60",
    secondaryColor: "#1e8449",
    bpm: 155,
    length: LENGTH.LONG,
    unlocked: true,
    bestProgress: 0,
    attempts: 0,
    coinsCollected: [false, false, false],
    generator: generateLevel5
  },
  {
    id: 6,
    name: "Can't Let Go",
    difficulty: DIFFICULTY.HARD,
    stars: 3,
    description: "Hold on tight, this one's intense! Fast-paced action awaits.",
    author: "RobTop",
    color: "#e74c3c",
    secondaryColor: "#c0392b",
    bpm: 160,
    length: LENGTH.LONG,
    unlocked: true,
    bestProgress: 0,
    attempts: 0,
    coinsCollected: [false, false, false],
    generator: generateLevel6
  },
  {
    id: 7,
    name: "Jumper",
    difficulty: DIFFICULTY.HARD,
    stars: 3,
    description: "Jump, jump, and jump some more! Precision is key.",
    author: "RobTop",
    color: "#3498db",
    secondaryColor: "#2980b9",
    bpm: 165,
    length: LENGTH.LONG,
    unlocked: true,
    bestProgress: 0,
    attempts: 0,
    coinsCollected: [false, false, false],
    generator: generateLevel7
  },
  {
    id: 8,
    name: "Time Machine",
    difficulty: DIFFICULTY.HARDER,
    stars: 4,
    description: "Travel through time with perfectly synchronized jumps!",
    author: "RobTop",
    color: "#1abc9c",
    secondaryColor: "#16a085",
    bpm: 170,
    length: LENGTH.LONG,
    unlocked: true,
    bestProgress: 0,
    attempts: 0,
    coinsCollected: [false, false, false],
    generator: generateLevel8
  },
  {
    id: 9,
    name: "Cycles",
    difficulty: DIFFICULTY.HARDER,
    stars: 4,
    description: "The cycles never end... Learn the patterns and break free!",
    author: "RobTop",
    color: "#8e44ad",
    secondaryColor: "#6c3483",
    bpm: 175,
    length: LENGTH.LONG,
    unlocked: true,
    bestProgress: 0,
    attempts: 0,
    coinsCollected: [false, false, false],
    generator: generateLevel9
  },
  {
    id: 10,
    name: "xStep",
    difficulty: DIFFICULTY.INSANE,
    stars: 5,
    description: "Experience the classic dubstep level! Feel the bass drop.",
    author: "RobTop",
    color: "#c0392b",
    secondaryColor: "#922b21",
    bpm: 180,
    length: LENGTH.XL,
    unlocked: true,
    bestProgress: 0,
    attempts: 0,
    coinsCollected: [false, false, false],
    generator: generateLevel10
  },
  {
    id: 11,
    name: "Clutterfunk",
    difficulty: DIFFICULTY.INSANE,
    stars: 5,
    description: "Chaos and funk combined! Navigate through the clutter.",
    author: "RobTop",
    color: "#d35400",
    secondaryColor: "#a04000",
    bpm: 185,
    length: LENGTH.XL,
    unlocked: true,
    bestProgress: 0,
    attempts: 0,
    coinsCollected: [false, false, false],
    generator: generateLevel11
  },
  {
    id: 12,
    name: "Theory of Everything",
    difficulty: DIFFICULTY.DEMON,
    stars: 6,
    description: "The ultimate test of skill! Prove you've mastered everything.",
    author: "RobTop",
    color: "#2980b9",
    secondaryColor: "#1a5276",
    bpm: 190,
    length: LENGTH.XL,
    unlocked: true,
    bestProgress: 0,
    attempts: 0,
    coinsCollected: [false, false, false],
    generator: generateLevel12
  }
];

// Get difficulty name
function getDifficultyName(difficulty) {
  const names = ['Auto', 'Easy', 'Normal', 'Hard', 'Harder', 'Insane', 'Demon'];
  return names[difficulty] || 'Unknown';
}

// Get difficulty icon
function getDifficultyIcon(difficulty) {
  const icons = ['🤖', '😊', '😐', '😤', '😠', '😈', '👿'];
  return icons[difficulty] || '❓';
}

// Export for use in main game
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { LEVELS, DIFFICULTY, LENGTH, OBS_TYPE, DECO_TYPE, getDifficultyName, getDifficultyIcon };
}
