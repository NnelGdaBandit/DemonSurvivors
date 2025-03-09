let player;
let enemies = [];
let pickups = [];
let projectiles = [];
let particles = [];
let gameOver = false;
let survivalTime = 0;
let startTime;
let lastSpawnTime = 0;
let score = 0;
let level = 1;
let experience = 0;
let experienceToNextLevel = 100;
let upgradeScreen = false;
let upgradeOptions = [];
let titleScreen = true;
let upgradeHistory = []; // Track all upgrades chosen during the game
let playerName = ""; // Store player name for leaderboard
let isEnteringName = false; // Track if player is entering name
let leaderboardData = []; // Store leaderboard data
let scoreSubmitted = false; // Track if the current score has been submitted
let enemyTypes = [
  { name: "Grunt", health: 20, speed: 1, damage: 5, color: [255, 0, 0], size: 20, expValue: 10, spriteIndex: 0, collisionHeight: 40 },
  { name: "Speeder", health: 10, speed: 2, damage: 3, color: [255, 100, 0], size: 16, expValue: 15, spriteIndex: 1, collisionHeight: 35 },
  { name: "Tank", health: 50, speed: 0.5, damage: 10, color: [150, 0, 0], size: 25, expValue: 25, spriteIndex: 2, collisionHeight: 45 },
  { name: "Boss", health: 200, speed: 0.7, damage: 15, color: [100, 0, 100], size: 35, expValue: 100, spriteIndex: 3, collisionHeight: 50 }
];
let weapons = [
  { name: "Sword", damage: 10, range: 80, angle: Math.PI/2, cooldown: 800, projectile: false, level: 1, maxLevel: 5 },
  { name: "Throwing Knife", damage: 5, range: 1000, angle: Math.PI/4, cooldown: 1000, projectile: true, speed: 8, level: 0, maxLevel: 5 },
  { name: "Whip", damage: 8, range: 150, angle: Math.PI, cooldown: 1200, projectile: false, level: 0, maxLevel: 5 },
  { name: "Magic Orb", damage: 15, range: Infinity, angle: Math.PI * 2, cooldown: 2000, projectile: true, speed: 4, level: 0, maxLevel: 5, explosionRadius: 80 },
  { name: "Meteor", damage: 25, range: Infinity, angle: Math.PI * 2, cooldown: 3000, projectile: true, speed: 7, level: 0, maxLevel: 5, impactRadius: 120 }
];
let images = {};
let sounds = {};
let killCount = 0;
let waveNumber = 1;
let waveTimer = 0;
let waveDuration = 30000; // 30 seconds per wave
let difficultyMultiplier = 1;
let useSprites = true; // Enable sprites
let loadingTimeout;

// Add loading state variables at the top with other global variables
let isLoading = true;
let loadingProgress = 0;
let loadingErrors = [];

// Add new state variable at the top with other globals
let showingLeaderboard = false;

function preload() {
  console.log("Starting preload...");
  isLoading = true;
  loadingProgress = 0;
  loadingErrors = [];
  
  let loadedCount = 0;
  let totalImages = 11; // Total number of images to load
  
  function updateProgress() {
    loadedCount++;
    loadingProgress = (loadedCount / totalImages) * 100;
    console.log(`Loading progress: ${Math.floor(loadingProgress)}% (${loadedCount}/${totalImages})`);
    
    if (loadedCount >= totalImages) {
      console.log("All images processed, starting game");
      console.log("Final image status:", images);
      isLoading = false;
      if (!startTime) {
        setup();
      }
    }
  }

  function handleLoadError(filename, error) {
    console.error(`Failed to load: ${filename}`, error);
    loadingErrors.push(filename);
    updateProgress();
  }
  
  // Initialize images object
  images = {};
  images.enemies = [];
  
  // Load player sprite
  console.log("Loading player.png...");
  loadImage('images/player.png?' + new Date().getTime(), 
    img => {
      console.log("Successfully loaded player.png", img.width, "x", img.height);
      images.player = img;
      updateProgress();
    }, 
    error => {
      handleLoadError('player.png', error);
      useSprites = false;
    }
  );
  
  // Load enemy sprites
  ['demon1', 'demon2', 'demon3', 'demon4'].forEach((type, index) => {
    console.log(`Loading ${type}.png...`);
    loadImage(`images/${type}.png?` + new Date().getTime(), 
      img => {
        console.log(`Successfully loaded ${type}.png`, img.width, "x", img.height);
        images.enemies[index] = img;
        updateProgress();
      }, 
      error => {
        console.error(`Failed to load ${type}.png:`, error);
        handleLoadError(`${type}.png`, error);
        // Don't disable sprites completely, just mark this one as failed
        images.enemies[index] = null;
      }
    );
  });
  
  // Load weapon sprites
  ['sword', 'knife', 'whip', 'orb', 'meteor'].forEach(weapon => {
    console.log(`Loading ${weapon}.png...`);
    loadImage(`images/${weapon}.png?` + new Date().getTime(), 
      img => {
        console.log(`Successfully loaded ${weapon}.png`, img.width, "x", img.height);
        images[weapon] = img;
        updateProgress();
      }, 
      error => {
        handleLoadError(`${weapon}.png`, error);
        useSprites = false;
      }
    );
  });
  
  // Load pickup sprites
  console.log("Loading health.png...");
  loadImage('images/health.png', 
    img => {
      console.log("Successfully loaded health.png", img.width, "x", img.height);
      images.healthPickup = img;
      updateProgress();
    }, 
    error => {
      handleLoadError('health.png', error);
      useSprites = false;
    }
  );
  
  console.log("Loading exp.png...");
  loadImage('images/exp.png', 
    img => {
      console.log("Successfully loaded exp.png", img.width, "x", img.height);
      images.expPickup = img;
      updateProgress();
    }, 
    error => {
      handleLoadError('exp.png', error);
      useSprites = false;
    }
  );
  
  // Set a shorter timeout as backup
  loadingTimeout = setTimeout(() => {
    console.log("Loading timeout reached, starting game anyway");
    console.log("Final loading status:", {
      loadedCount,
      totalImages,
      loadingErrors,
      images
    });
    useSprites = false;
    isLoading = false;
    if (!startTime) {
      setup();
    }
  }, 2000);
}

// Add error handler for p5.js
window.addEventListener('error', function(e) {
  console.error('p5.js Error:', e.error);
});

// Modify setup to ensure it runs
function setup() {
  console.log("Setting up game...");
  
  // Set window title
  document.title = "Demon Survivors";
  
  // Clear the loading timeout if it exists
  if (loadingTimeout) {
    clearTimeout(loadingTimeout);
    loadingTimeout = null;
  }
  
  let canvas = createCanvas(800, 600);
  canvas.parent('game-container');
  
  // Initialize game state
  startTime = millis();
  
  // Create sprites directly in the code if needed
  if (!useSprites) {
    console.log("Using fallback sprites");
    createGameSprites();
  }
  
  // Initialize player
  player = {
    pos: createVector(width / 2, height / 2),
    vel: createVector(0, 0),
    facing: createVector(1, 0),
    health: 100,
    maxHealth: 100,
    speed: 3,
    weapons: [weapons[0]], // Start with sword
    invincibleTime: 500,
    lastDamageTime: 0,
    size: 32,              // Increased size for better visibility
    dashCooldown: 2000,
    lastDashTime: 0,
    dashDuration: 200,
    isDashing: false,
    dashStartTime: 0,
    dashSpeed: 10,
    dashDirection: createVector(0, 0),
    magnetRange: 100
  };
  
  // Initialize weapon cooldowns
  for (let weapon of player.weapons) {
    weapon.lastUseTime = 0;
  }
  
  // Initialize leaderboard data
  updateLeaderboard();
  
  console.log("Game setup complete");
  console.log("Player initialized:", player);
  console.log("Weapons initialized:", weapons);
}

function createGameSprites() {
  // Create player sprite with higher resolution for pixel art detail
  images.player = createGraphics(256, 256);
  drawPlayerSprite(images.player);
  
  // Create enemy sprites with larger resolution
  images.enemies = [];
  
  // Grunt demon
  images.enemies[0] = createGraphics(128, 128);
  drawGruntSprite(images.enemies[0]);
  
  // Speeder demon
  images.enemies[1] = createGraphics(128, 128);
  drawSpeederSprite(images.enemies[1]);
  
  // Tank demon
  images.enemies[2] = createGraphics(128, 128);
  drawTankSprite(images.enemies[2]);
  
  // Boss demon
  images.enemies[3] = createGraphics(128, 128);
  drawBossSprite(images.enemies[3]);
  
  // Create weapon sprites with larger resolution
  images.sword = createGraphics(128, 128);
  drawSwordSprite(images.sword);
  
  images.knife = createGraphics(128, 128);
  drawKnifeSprite(images.knife);
  
  images.whip = createGraphics(128, 128);
  drawWhipSprite(images.whip);
  
  images.orb = createGraphics(128, 128);
  drawOrbSprite(images.orb);
  
  images.meteor = createGraphics(128, 128);
  drawMeteorSprite(images.meteor);
  
  // Create pickup sprites
  images.healthPickup = createGraphics(64, 64);
  drawHealthSprite(images.healthPickup);
  
  images.expPickup = createGraphics(64, 64);
  drawExpSprite(images.expPickup);
}

// Add new function for drawing meteor sprite
function drawMeteorSprite(pg) {
  pg.clear();
  
  // Set up colors
  const colors = {
    core: '#FF6600',
    coreLight: '#FF9933',
    outer: '#CC3300',
    glow: '#FF3300',
    trail: '#FF0000'
  };
  
  // Draw outer glow
  pg.noStroke();
  for (let i = 0; i < 20; i++) {
    let alpha = map(i, 0, 20, 255, 0);
    pg.fill(255, 100, 0, alpha);
    pg.ellipse(64, 64, 100 - i * 2, 100 - i * 2);
  }
  
  // Draw meteor body
  pg.push();
  pg.translate(64, 64);
  pg.rotate(-PI/4); // Angle for dynamic look
  
  // Main body
  pg.fill(colors.outer);
  pg.beginShape();
  pg.vertex(0, -30);
  pg.vertex(20, 10);
  pg.vertex(0, 20);
  pg.vertex(-20, 10);
  pg.endShape(CLOSE);
  
  // Inner core
  pg.fill(colors.core);
  pg.beginShape();
  pg.vertex(0, -20);
  pg.vertex(15, 5);
  pg.vertex(0, 15);
  pg.vertex(-15, 5);
  pg.endShape(CLOSE);
  
  // Highlights
  pg.fill(colors.coreLight);
  pg.beginShape();
  pg.vertex(0, -15);
  pg.vertex(8, 0);
  pg.vertex(0, 5);
  pg.vertex(-8, 0);
  pg.endShape(CLOSE);
  
  // Add surface details (cracks/texture)
  pg.stroke(colors.glow);
  pg.strokeWeight(2);
  pg.line(-10, -10, 5, -5);
  pg.line(10, -10, -5, -5);
  pg.line(-8, 5, 8, 5);
  
  pg.pop();
  
  // Add trailing particles
  for (let i = 0; i < 5; i++) {
    let x = random(44, 84);
    let y = random(74, 94);
    let size = random(4, 8);
    pg.fill(colors.trail);
    pg.noStroke();
    pg.ellipse(x, y, size, size);
  }
}

function drawPlayerSprite(pg) {
  pg.clear();
  
  // Set up colors for pixel art style
  const colors = {
    skin: '#FBD5BC',
    skinShade: '#D4A389',
    hair: '#362B48',
    hairLight: '#4A3E5C',
    coat: '#4A5B9B',
    coatShade: '#2E3B75',
    coatLight: '#6B79B3',
    pants: '#2E2543',
    pantsLight: '#3D3459',
    boots: '#1A1628',
    bootsLight: '#2E2543',
    belt: '#C28D47',
    beltLight: '#E0A962',
    armor: '#8B92AD',
    armorShade: '#6A6F86',
    armorLight: '#A8ADCB'
  };
  
  pg.noStroke();
  
  // Draw boots (angled for dynamic pose)
  pg.fill(colors.boots);
  pg.rect(116, 200, 20, 16); // Right boot
  pg.rect(92, 208, 20, 16); // Left boot (slightly back)
  
  // Boot highlights
  pg.fill(colors.bootsLight);
  pg.rect(116, 200, 20, 4);
  pg.rect(92, 208, 20, 4);
  
  // Draw legs in dynamic pose
  pg.fill(colors.pants);
  pg.rect(116, 176, 20, 24); // Right leg
  pg.rect(92, 184, 20, 24); // Left leg (slightly back)
  
  // Pants highlights
  pg.fill(colors.pantsLight);
  pg.rect(116, 176, 20, 6);
  pg.rect(92, 184, 20, 6);
  
  // Draw armor/coat in action pose
  pg.fill(colors.coat);
  // Main body (angled)
  pg.rect(108, 96, 40, 80);
  // Shoulder plates
  pg.fill(colors.armor);
  pg.rect(100, 96, 16, 24); // Left shoulder
  pg.rect(140, 96, 16, 24); // Right shoulder
  
  // Armor highlights
  pg.fill(colors.armorLight);
  pg.rect(100, 96, 16, 4);
  pg.rect(140, 96, 16, 4);
  
  // Coat details (flowing effect)
  pg.fill(colors.coatShade);
  pg.rect(108, 140, 40, 36);
  pg.rect(100, 120, 8, 56); // Left side flow
  pg.rect(148, 120, 8, 56); // Right side flow
  
  // Belt with decorative buckle
  pg.fill(colors.belt);
  pg.rect(104, 140, 48, 12);
  pg.fill(colors.beltLight);
  pg.rect(120, 140, 16, 12);
  
  // Draw arms in action pose
  pg.fill(colors.coat);
  // Left arm (raised back)
  pg.rect(88, 96, 12, 32);
  // Right arm (forward)
  pg.rect(156, 96, 12, 40);
  
  // Hands
  pg.fill(colors.skin);
  pg.rect(84, 128, 16, 16); // Left hand
  pg.rect(152, 136, 16, 16); // Right hand
  
  // Head (tilted for action pose)
  pg.fill(colors.skin);
  pg.rect(112, 48, 32, 32);
  
  // Face shading
  pg.fill(colors.skinShade);
  pg.rect(112, 72, 32, 8);
  
  // Hair (dynamic style)
  pg.fill(colors.hair);
  // Back hair
  pg.rect(108, 40, 40, 16);
  // Top hair with spiky style
  pg.rect(112, 32, 32, 8);
  pg.rect(116, 24, 24, 8);
  // Side bangs
  pg.rect(108, 48, 8, 16);
  pg.rect(136, 48, 8, 16);
  
  // Hair highlights
  pg.fill(colors.hairLight);
  pg.rect(116, 24, 24, 4);
  
  // Face details
  pg.fill(colors.hair);
  // Eye (side view, only one visible)
  pg.rect(128, 56, 8, 8);
  
  // Add armor details
  pg.fill(colors.armor);
  // Shoulder guards
  pg.rect(96, 96, 20, 8);
  pg.rect(136, 96, 20, 8);
  // Chest plate
  pg.rect(108, 104, 40, 16);
  
  // Armor highlights
  pg.fill(colors.armorLight);
  pg.rect(108, 104, 40, 4);
  pg.rect(96, 96, 20, 2);
  pg.rect(136, 96, 20, 2);
}

function drawGruntSprite(pg) {
  pg.clear();
  
  // Body - darker red for more menacing look
  pg.fill('#800000');
  pg.noStroke();
  pg.ellipse(32, 32, 40, 40);
  
  // Muscle definition
  pg.stroke('#600000');
  pg.strokeWeight(1);
  pg.noFill();
  pg.arc(32, 32, 35, 35, PI/6, PI/2);
  pg.arc(32, 32, 35, 35, PI + PI/6, PI + PI/2);
  
  // Eyes - glowing red
  pg.fill('#FF0000');
  pg.noStroke();
  pg.ellipse(24, 24, 12, 12);
  pg.ellipse(40, 24, 12, 12);
  
  // Eye shine
  pg.fill('#FF9999');
  pg.ellipse(22, 22, 4, 4);
  pg.ellipse(38, 22, 4, 4);
  
  // Fanged mouth
  pg.stroke('#400000');
  pg.strokeWeight(2);
  pg.noFill();
  pg.beginShape();
  pg.vertex(26, 38);
  pg.vertex(32, 42);
  pg.vertex(38, 38);
  pg.endShape();
  
  // Fangs
  pg.fill('#FFFFFF');
  pg.noStroke();
  pg.triangle(28, 38, 31, 38, 29.5, 41);
  pg.triangle(35, 38, 38, 38, 36.5, 41);
  
  // Horns - larger and more curved
  pg.fill('#400000');
  pg.beginShape();
  pg.vertex(20, 18);
  pg.bezierVertex(15, 10, 10, 15, 15, 5);
  pg.bezierVertex(20, 0, 25, 10, 25, 15);
  pg.endShape(CLOSE);
  
  pg.beginShape();
  pg.vertex(44, 18);
  pg.bezierVertex(49, 10, 54, 15, 49, 5);
  pg.bezierVertex(44, 0, 39, 10, 39, 15);
  pg.endShape(CLOSE);
}

function drawSpeederSprite(pg) {
  pg.clear();
  
  // Body (sleek demon)
  pg.fill('#CC3300');
  pg.noStroke();
  pg.beginShape();
  pg.vertex(32, 10);
  pg.bezierVertex(10, 30, 10, 40, 32, 54);
  pg.bezierVertex(54, 40, 54, 30, 32, 10);
  pg.endShape(CLOSE);
  
  // Armor plates
  pg.stroke('#8B1A00');
  pg.strokeWeight(1);
  pg.line(32, 15, 20, 35);
  pg.line(32, 15, 44, 35);
  pg.line(20, 35, 44, 35);
  
  // Eyes (glowing)
  pg.fill('#FF3300');
  pg.noStroke();
  pg.ellipse(26, 30, 8, 8);
  pg.ellipse(38, 30, 8, 8);
  
  // Eye shine
  pg.fill('#FFCC00');
  pg.ellipse(25, 29, 3, 3);
  pg.ellipse(37, 29, 3, 3);
  
  // Spikes along back
  pg.fill('#8B1A00');
  for(let i = 0; i < 3; i++) {
    pg.triangle(32, 20 + i * 10, 28, 25 + i * 10, 36, 25 + i * 10);
  }
}

function drawTankSprite(pg) {
  pg.clear();
  
  // Armored body
  pg.fill('#660000');
  pg.stroke('#330000');
  pg.strokeWeight(2);
  pg.rect(12, 12, 40, 40, 5);
  
  // Additional armor plates
  pg.fill('#800000');
  pg.noStroke();
  pg.rect(10, 20, 44, 8);
  pg.rect(10, 36, 44, 8);
  
  // Rivets on armor
  pg.fill('#8B4513');
  pg.noStroke();
  for(let x = 16; x <= 48; x += 8) {
    pg.ellipse(x, 24, 4, 4);
    pg.ellipse(x, 40, 4, 4);
  }
  
  // Demonic eyes
  pg.fill('#FF0000');
  pg.ellipse(24, 24, 10, 10);
  pg.ellipse(40, 24, 10, 10);
  
  // Eye glow
  pg.fill('#FF9999');
  pg.ellipse(22, 22, 4, 4);
  pg.ellipse(38, 22, 4, 4);
  
  // Jaw plate
  pg.fill('#4D0000');
  pg.rect(20, 38, 24, 8);
  
  // Teeth on jaw
  pg.fill('#CCCCCC');
  for(let x = 22; x <= 40; x += 4) {
    pg.triangle(x, 38, x + 2, 38, x + 1, 41);
  }
}

function drawBossSprite(pg) {
  pg.clear();
  
  // Main body (pentagram shape)
  pg.fill('#330033');
  pg.noStroke();
  pg.beginShape();
  for(let i = 0; i < 5; i++) {
    let angle = (TWO_PI * i / 5) - HALF_PI;
    let x = 32 + cos(angle) * 25;
    let y = 32 + sin(angle) * 25;
    pg.vertex(x, y);
    
    angle += TWO_PI / 10;
    let x2 = 32 + cos(angle) * 15;
    let y2 = 32 + sin(angle) * 15;
    pg.vertex(x2, y2);
  }
  pg.endShape(CLOSE);
  
  // Demonic runes
  pg.stroke('#FF00FF');
  pg.strokeWeight(1);
  pg.noFill();
  for(let i = 0; i < 5; i++) {
    let angle = (TWO_PI * i / 5) - HALF_PI;
    let x = 32 + cos(angle) * 20;
    let y = 32 + sin(angle) * 20;
    pg.arc(x, y, 8, 8, 0, PI);
  }
  
  // Eyes (large and glowing)
  pg.fill('#FF0000');
  pg.noStroke();
  pg.ellipse(24, 28, 12, 12);
  pg.ellipse(40, 28, 12, 12);
  
  // Eye detail
  pg.fill('#FF00FF');
  pg.ellipse(24, 28, 6, 6);
  pg.ellipse(40, 28, 6, 6);
  
  // Eye shine
  pg.fill('#FFFFFF');
  pg.ellipse(22, 26, 3, 3);
  pg.ellipse(38, 26, 3, 3);
  
  // Demonic mouth
  pg.fill('#FF0000');
  pg.beginShape();
  pg.vertex(27, 38);
  pg.vertex(37, 38);
  pg.vertex(32, 45);
  pg.endShape(CLOSE);
  
  // Aura effect
  pg.stroke('#660066');
  pg.strokeWeight(1);
  for(let i = 0; i < 8; i++) {
    let angle = TWO_PI * i / 8;
    let x = 32 + cos(angle) * 30;
    let y = 32 + sin(angle) * 30;
    pg.line(32, 32, x, y);
  }
}

function drawSwordSprite(pg) {
  pg.clear();
  
  // Blade
  pg.fill('#CCCCCC');
  pg.noStroke();
  pg.beginShape();
  pg.vertex(32, 5);
  pg.vertex(36, 40);
  pg.vertex(32, 50);
  pg.vertex(28, 40);
  pg.endShape(CLOSE);
  
  // Handle
  pg.fill('#8B4513');
  pg.rect(28, 50, 8, 10);
  
  // Guard
  pg.fill('#DDDDDD');
  pg.rect(24, 45, 16, 5);
  
  // Highlight
  pg.stroke(255);
  pg.strokeWeight(1);
  pg.line(30, 10, 30, 40);
}

function drawKnifeSprite(pg) {
  pg.clear();
  
  // Blade - made larger
  pg.fill('#CCCCCC');
  pg.noStroke();
  pg.beginShape();
  pg.vertex(20, 25);
  pg.vertex(70, 42);
  pg.vertex(20, 59);
  pg.vertex(28, 42);
  pg.endShape(CLOSE);
  
  // Handle - adjusted for larger size
  pg.fill('#8B4513');
  pg.rect(8, 36, 15, 12);
  
  // Highlight
  pg.stroke(255);
  pg.strokeWeight(2);
  pg.line(20, 32, 65, 42);
}

function drawWhipSprite(pg) {
  pg.clear();
  
  // Whip body (curved line)
  pg.stroke('#8B4513');
  pg.strokeWeight(3);
  pg.noFill();
  pg.bezier(10, 32, 20, 10, 40, 10, 50, 32);
  
  // Handle
  pg.fill('#8B4513');
  pg.noStroke();
  pg.rect(5, 28, 10, 8);
  
  // Whip end
  pg.fill('#AA7744');
  pg.ellipse(50, 32, 8, 8);
}

function drawOrbSprite(pg) {
  pg.clear();
  
  // Outer glow
  for (let i = 25; i > 0; i--) {
    let alpha = map(i, 0, 25, 0, 255);
    pg.fill(100, 100, 255, alpha);
    pg.noStroke();
    pg.ellipse(32, 32, i * 2, i * 2);
  }
  
  // Inner orb
  pg.fill('#6666FF');
  pg.ellipse(32, 32, 20, 20);
  
  // Highlight
  pg.fill(255);
  pg.ellipse(28, 28, 8, 8);
}

function drawHealthSprite(pg) {
  pg.clear();
  
  // Green cross
  pg.fill('#00CC00');
  
  // Horizontal bar
  pg.rect(12, 24, 40, 16);
  
  // Vertical bar
  pg.rect(24, 12, 16, 40);
  
  // White outline
  pg.stroke(255);
  pg.strokeWeight(2);
  pg.noFill();
  pg.rect(12, 24, 40, 16);
  pg.rect(24, 12, 16, 40);
  
  // Glow effect
  pg.stroke('rgba(0, 255, 0, 0.5)');
  pg.strokeWeight(4);
  pg.rect(10, 22, 44, 20);
  pg.rect(22, 10, 20, 44);
}

function drawExpSprite(pg) {
  pg.clear();
  
  // Blue gem
  pg.fill('#0088FF');
  pg.noStroke();
  pg.beginShape();
  pg.vertex(32, 10);
  pg.vertex(50, 25);
  pg.vertex(42, 50);
  pg.vertex(22, 50);
  pg.vertex(14, 25);
  pg.endShape(CLOSE);
  
  // Highlight
  pg.fill('#AADDFF');
  pg.beginShape();
  pg.vertex(32, 15);
  pg.vertex(40, 25);
  pg.vertex(32, 45);
  pg.vertex(24, 25);
  pg.endShape(CLOSE);
  
  // Outline
  pg.stroke('#0044AA');
  pg.strokeWeight(2);
  pg.noFill();
  pg.beginShape();
  pg.vertex(32, 10);
  pg.vertex(50, 25);
  pg.vertex(42, 50);
  pg.vertex(22, 50);
  pg.vertex(14, 25);
  pg.endShape(CLOSE);
}

function draw() {
  if (isLoading) {
    // Draw loading screen
    background(0);
    fill(255);
    textSize(32);
    textAlign(CENTER, CENTER);
    text('Loading...', width/2, height/2 - 50);
    
    // Draw progress bar
    let barWidth = 300;
    let barHeight = 20;
    stroke(255);
    noFill();
    rect(width/2 - barWidth/2, height/2, barWidth, barHeight);
    fill(255);
    noStroke();
    rect(width/2 - barWidth/2, height/2, (barWidth * loadingProgress/100), barHeight);
    
    // Show loading percentage
    textSize(16);
    text(`${Math.floor(loadingProgress)}%`, width/2, height/2 + 40);
    
    // Show any errors
    if (loadingErrors.length > 0) {
      fill(255, 0, 0);
      textSize(14);
      text('Some assets failed to load. Game will use fallback graphics.', width/2, height/2 + 80);
    }
    return;
  }

  if (titleScreen) {
    drawTitleScreen();
    return;
  }

  if (gameOver) {
    drawGameOver();
    return;
  }

  if (upgradeScreen) {
    drawUpgradeScreen();
    return;
  }
  
  // Very dark background for Berserk feel
  background(10);
  
  // Draw blood-like particle effects in background
  for(let i = 0; i < particles.length; i++) {
    let p = particles[i];
    if(p.type === 'blood') {
      fill(100, 0, 0, p.life * 2);
      noStroke();
      ellipse(p.pos.x, p.pos.y, p.size * 2, p.size * 2);
    }
  }
  
  // Add subtle pentagram pattern in background
  push();
  stroke(30, 0, 0);
  strokeWeight(1);
  noFill();
  translate(width/2, height/2);
  for(let i = 0; i < 5; i++) {
    let angle = TWO_PI * i / 5 - HALF_PI;
    let x = cos(angle) * width * 0.4;
    let y = sin(angle) * height * 0.4;
    line(0, 0, x, y);
  }
  pop();

  survivalTime = millis() - startTime;
  waveTimer = survivalTime % waveDuration;
  
  // Update wave number with demonic effect
  let newWaveNumber = Math.floor(survivalTime / waveDuration) + 1;
  if (newWaveNumber > waveNumber) {
    waveNumber = newWaveNumber;
    difficultyMultiplier += 0.2;
    // Add demonic effect when wave changes
    for(let i = 0; i < 50; i++) {
      let angle = random(TWO_PI);
      let speed = random(2, 5);
      let vel = p5.Vector.fromAngle(angle).mult(speed);
      particles.push({
        pos: createVector(width/2, height/2),
        vel: vel,
        type: 'blood',
        color: [100, 0, 0],
        life: random(30, 60),
        size: random(3, 8)
      });
    }
  }

  updatePlayer();
  updateWeapons();
  updateEnemies();
  updatePickups();
  updateProjectiles();
  updateParticles();
  
  // Spawn enemies with increasing rate based on wave
  let baseSpawnRate = 2000;
  let minSpawnRate = 300;
  let spawnRate = max(minSpawnRate, baseSpawnRate - (waveNumber * 200));
  if (millis() - lastSpawnTime > spawnRate) {
    spawnEnemy();
    lastSpawnTime = millis();
  }

  drawGame();
  drawHUD();
  
  // Add vignette effect for darker corners
  drawVignette();
}

// Add new function for vignette effect
function drawVignette() {
  let gradient = drawingContext.createRadialGradient(
    width/2, height/2, 100,
    width/2, height/2, width/2
  );
  gradient.addColorStop(0, 'rgba(0,0,0,0)');
  gradient.addColorStop(1, 'rgba(0,0,0,0.7)');
  
  drawingContext.fillStyle = gradient;
  drawingContext.fillRect(0, 0, width, height);
}

// Update createParticles to include blood effects
function createParticles(x, y, count, color, speed, type = 'normal') {
  for (let i = 0; i < count; i++) {
    let angle = random(TWO_PI);
    let vel = p5.Vector.fromAngle(angle).mult(random(1, speed));
    particles.push({
      pos: createVector(x, y),
      vel: vel,
      type: type,
      color: color,
      life: random(20, 40),
      size: random(2, 5)
    });
  }
}

function updatePlayer() {
  // Handle player movement
  if (!player.isDashing) {
  player.vel.set(0, 0);
    if (keyIsDown(65) || keyIsDown(LEFT_ARROW)) player.vel.x = -player.speed; // A or LEFT
    if (keyIsDown(68) || keyIsDown(RIGHT_ARROW)) player.vel.x = player.speed; // D or RIGHT
    if (keyIsDown(87) || keyIsDown(UP_ARROW)) player.vel.y = -player.speed; // W or UP
    if (keyIsDown(83) || keyIsDown(DOWN_ARROW)) player.vel.y = player.speed; // S or DOWN

  // Update facing direction when moving
  if (player.vel.mag() > 0) {
    player.facing = player.vel.copy().normalize();
  }
  } else {
    // Handle dashing
    if (millis() - player.dashStartTime > player.dashDuration) {
      player.isDashing = false;
    }
  }
  
  player.pos.add(player.vel);
  player.pos.x = constrain(player.pos.x, 0, width);
  player.pos.y = constrain(player.pos.y, 0, height);
}

function updateWeapons() {
  // Debug output of player's weapons
  if (frameCount % 60 === 0) { // Once per second
    console.log("Player has these weapons:");
    for (let weapon of player.weapons) {
      console.log(`- ${weapon.name} (Level ${weapon.level}, Cooldown: ${weapon.cooldown}ms)`);
    }
  }
  
  // Auto-attack with all equipped weapons
  for (let weapon of weapons) {  // Check all weapons in the main weapons array
    // Find if the player has this weapon
    let playerWeapon = player.weapons.find(w => w.name === weapon.name);
    if (playerWeapon && weapon.level > 0) {  // Check level in the main weapons array
      if (millis() - weapon.lastUseTime > weapon.cooldown) {
        console.log(`Using weapon: ${weapon.name} (Level ${weapon.level})`);
        useWeapon(weapon);
        weapon.lastUseTime = millis();
      }
    }
  }
}

function useWeapon(weapon) {
  if (weapon.projectile) {
    if (weapon.name === "Magic Orb") {
      // Find the furthest enemy
      let furthestEnemy = null;
      let maxDist = 0;
  for (let enemy of enemies) {
        let dist = p5.Vector.dist(player.pos, enemy.pos);
        if (dist > maxDist) {
          maxDist = dist;
          furthestEnemy = enemy;
        }
      }

      if (furthestEnemy) {
        let direction = p5.Vector.sub(furthestEnemy.pos, player.pos).normalize();
        let proj = {
          pos: player.pos.copy(),
          vel: direction.mult(weapon.speed),
          damage: weapon.damage * (1 + (weapon.level - 1) * 0.2),
          range: weapon.range,
          startPos: player.pos.copy(),
          weapon: weapon,
          size: 20,
          creationTime: millis(),
          targetPos: furthestEnemy.pos.copy(),
          hasExploded: false,
          explosionRadius: weapon.explosionRadius * (1 + (weapon.level - 1) * 0.3) // 30% increase per level
        };
        projectiles.push(proj);
        createParticles(player.pos.x, player.pos.y, 10, [100, 100, 255], 10);
      }
    } else if (weapon.name === "Throwing Knife") {
      // Calculate number of knives based on level (level 1 = 1 knife, level 2 = 3 knives, level 3 = 5 knives, etc.)
      let knifeCount = 1 + (weapon.level - 1) * 2;
      
      // Calculate spread angle for multiple knives
      let totalSpread = weapon.angle; // 45 degrees total spread
      let angleStep = knifeCount > 1 ? totalSpread / (knifeCount - 1) : 0;
      
      // For single knife, shoot straight in the direction player is facing
      // For multiple knives, shoot in an arc behind the player
      let startAngle;
      if (weapon.level === 1) {
        // Single knife shoots in the opposite direction of where player is facing
        let direction = player.facing.copy().normalize().mult(-1); // Multiply by -1 to reverse direction
        let proj = {
          pos: player.pos.copy(),
          vel: direction.mult(weapon.speed),
          damage: weapon.damage,
          range: weapon.range,
          startPos: player.pos.copy(),
          weapon: weapon,
          size: 10,
          creationTime: millis()
        };
        projectiles.push(proj);
        createParticles(player.pos.x, player.pos.y, 3, [255, 255, 100], 5);
      } else {
        // Multiple knives shoot in an arc behind the player
        startAngle = player.facing.heading() + PI + totalSpread/2;
        for (let i = 0; i < knifeCount; i++) {
          let angle = startAngle - (angleStep * i); // Subtract to go clockwise
          let direction = p5.Vector.fromAngle(angle);
          
          let proj = {
            pos: player.pos.copy(),
            vel: direction.mult(weapon.speed),
            damage: weapon.damage * (1 + (weapon.level - 1) * 0.2),
            range: weapon.range,
            startPos: player.pos.copy(),
            weapon: weapon,
            size: 10,
            creationTime: millis()
          };
          projectiles.push(proj);
          createParticles(player.pos.x, player.pos.y, 3, [255, 255, 100], 5);
        }
      }
    } else if (weapon.name === "Meteor") {
      // Find a random enemy to target
      if (enemies.length > 0) {
        let targetEnemy = enemies[Math.floor(Math.random() * enemies.length)];
        let targetPos = targetEnemy.pos.copy();
        
        // Create meteor starting from above the target
        let startPos = createVector(targetPos.x, targetPos.y - height);
        let direction = p5.Vector.sub(targetPos, startPos).normalize();
        
        let proj = {
          pos: startPos,
          vel: direction.mult(weapon.speed),
          damage: weapon.damage * (1 + (weapon.level - 1) * 0.2),
          range: weapon.range,
          startPos: startPos,
          weapon: weapon,
          size: 30,
          creationTime: millis(),
          targetPos: targetPos,
          hasImpacted: false,
          impactRadius: weapon.impactRadius * (1 + (weapon.level - 1) * 0.3), // 30% increase per level
          meteorTrail: []
        };
        projectiles.push(proj);
        
        // Initial meteor spawn effect
        createParticles(startPos.x, startPos.y, 20, [255, 100, 0], 15);
      }
    } else {
      // Original projectile code for other weapons
      let targetVel = player.facing.copy();
      let proj = {
        pos: player.pos.copy(),
        vel: targetVel.mult(weapon.speed),
        damage: weapon.damage * (1 + (weapon.level - 1) * 0.2),
        range: weapon.range,
        startPos: player.pos.copy(),
        weapon: weapon,
        size: weapon.name === "Magic Orb" ? 20 : 10,
        creationTime: millis()
      };
      projectiles.push(proj);
      createParticles(player.pos.x, player.pos.y, 10, [255, 255, 100], 10);
    }
    
    console.log("Using projectile weapon: " + weapon.name);
  } else {
    // Create a visible weapon effect that lasts longer
    let weaponEffect = {
      weapon: weapon,
      startTime: millis(),
      duration: 500, // 500ms duration for better visibility
      player: player,
      angle: player.facing.heading(),
      hit: false,
      hitEnemies: [] // Track which enemies have been hit during this swing
    };
    
    if (!window.weaponEffects) window.weaponEffects = [];
    window.weaponEffects.push(weaponEffect);
    
    console.log("Using melee weapon: " + weapon.name);
    
    // For non-sword melee weapons
    if (weapon.name !== "Sword") {
      // Other melee weapons hit detection
      for (let enemy of enemies) {
        let toEnemy = p5.Vector.sub(enemy.pos, player.pos);
        let angleDiff = Math.abs(player.facing.angleBetween(toEnemy));
        
        // Increase the effective angle for whip
        let effectiveAngle = weapon.name === "Whip" ? weapon.angle * 1.5 : weapon.angle;
        
        if (angleDiff < effectiveAngle / 2 && toEnemy.mag() < weapon.range * (1 + (weapon.level - 1) * 0.15)) {
          // Apply damage
          enemy.health -= weapon.damage * (1 + (weapon.level - 1) * 0.2);
          enemy.lastHitTime = millis(); // Add hit flash effect
          weaponEffect.hitEnemies.push(enemy);
          
          // Knockback
          let knockback = toEnemy.normalize().mult(3);
          enemy.pos.add(knockback);
          
          // Visual effect
          createParticles(enemy.pos.x, enemy.pos.y, 5, [255, 0, 0], 5);
          
          // Mark the weapon effect as having hit something
          weaponEffect.hit = true;
        }
      }
    }
    
    // Visual effect for the swing
    let swingPoints = 30; // More points for smoother effect
    let swingAngle = weapon.angle;
    let baseAngle = player.facing.heading() - swingAngle / 2;
    let swingColor;
    
    // Different colors for different weapons
    if (weapon.name === "Sword") {
      swingColor = [200, 200, 255, 150];
    } else if (weapon.name === "Whip") {
      swingColor = [200, 150, 100, 150];
    } else if (weapon.name === "Magic Orb") {
      swingColor = [100, 100, 255, 150];
    } else if (weapon.name === "Throwing Knife") {
      swingColor = [200, 200, 200, 150];
    } else {
      swingColor = [200, 200, 255, 150];
    }
    
    for (let i = 0; i <= swingPoints; i++) {
      let angle = baseAngle + (swingAngle * i / swingPoints);
      let x = player.pos.x + Math.cos(angle) * weapon.range * (1 + (weapon.level - 1) * 0.15);
      let y = player.pos.y + Math.sin(angle) * weapon.range * (1 + (weapon.level - 1) * 0.15);
      createParticles(x, y, 2, swingColor, 15);
    }
  }
}

function updateEnemies() {
  // Update existing enemies
  for (let i = enemies.length - 1; i >= 0; i--) {
    let enemy = enemies[i];
    
    // Move towards player
    let dir = p5.Vector.sub(player.pos, enemy.pos).normalize();
    enemy.pos.add(dir.mult(enemy.speed));

    // Check for player collision using rectangular collision detection
    if (!player.isDashing) {
      // Calculate a tighter collision box for the player that matches the sprite
      let playerHitboxWidth = player.size * 0.4;  // 40% of sprite width
      let playerHitboxHeight = player.size * 0.6; // 60% of sprite height
      let playerVerticalOffset = -player.size * 0.2; // Move hitbox up to match character's body position
      
      let playerLeft = player.pos.x - playerHitboxWidth/2;
      let playerRight = player.pos.x + playerHitboxWidth/2;
      let playerTop = player.pos.y + playerVerticalOffset - playerHitboxHeight/2;
      let playerBottom = player.pos.y + playerVerticalOffset + playerHitboxHeight/2;
      
      let enemyLeft = enemy.pos.x - enemy.size/2;
      let enemyRight = enemy.pos.x + enemy.size/2;
      let enemyTop = enemy.pos.y - enemy.collisionHeight/2;
      let enemyBottom = enemy.pos.y + enemy.collisionHeight/2;
      
      // Check for collision
      if (playerRight > enemyLeft && 
          playerLeft < enemyRight && 
          playerBottom > enemyTop && 
          playerTop < enemyBottom) {
      if (millis() - player.lastDamageTime > player.invincibleTime) {
        player.health -= enemy.damage;
        player.lastDamageTime = millis();
          
          // Blood splash effect when player is hit
          createParticles(player.pos.x, player.pos.y, 15, [150, 0, 0], 8, 'blood');
          
          // Knockback player
          let knockback = dir.mult(-5);
          player.pos.add(knockback);
          
        if (player.health <= 0) {
          gameOver = true;
            // Create dramatic death effect
            createParticles(player.pos.x, player.pos.y, 50, [200, 0, 0], 10, 'blood');
          }
        }
      }
    }
    
    // Remove dead enemies
    if (enemy.health <= 0) {
      // Add experience
      experience += enemy.expValue;
      score += enemy.expValue;
      killCount++;
      
      // Create dramatic death effects based on enemy type
      let particleCount = enemy.type === "Boss" ? 100 :
                         enemy.type === "Tank" ? 40 :
                         enemy.type === "Speeder" ? 20 : 30;
      
      // Blood explosion
      createParticles(enemy.pos.x, enemy.pos.y, particleCount, [100, 0, 0], 8, 'blood');
      
      // Demonic energy dissipation
      for(let j = 0; j < particleCount/2; j++) {
        let angle = TWO_PI * j / (particleCount/2);
        let speed = random(2, 6);
        let vel = p5.Vector.fromAngle(angle).mult(speed);
        particles.push({
          pos: enemy.pos.copy(),
          vel: vel,
          type: 'energy',
          color: enemy.type === "Boss" ? [255, 0, 255] :
                 enemy.type === "Tank" ? [150, 0, 0] :
                 enemy.type === "Speeder" ? [255, 100, 0] : [200, 0, 0],
          life: random(30, 60),
          size: random(3, 8)
        });
      }
      
      // Spawn pickup with demonic effect
      if (random() < 0.2) { // 20% chance for health pickup
        pickups.push({ 
          pos: enemy.pos.copy(), 
          type: "health",
          value: 10,
          size: 15
        });
        // Add pickup spawn effect
        createParticles(enemy.pos.x, enemy.pos.y, 10, [0, 255, 0], 5);
      } else if (random() < 0.3) { // 30% chance for experience pickup
        pickups.push({ 
          pos: enemy.pos.copy(), 
          type: "experience",
          value: Math.floor(random(5, 15)),
          size: 12
        });
        // Add pickup spawn effect
        createParticles(enemy.pos.x, enemy.pos.y, 10, [0, 100, 255], 5);
      }
      
      enemies.splice(i, 1);
    }
  }

  // Check for level up
  if (experience >= experienceToNextLevel) {
    levelUp();
  }
}

function updatePickups() {
  for (let i = pickups.length - 1; i >= 0; i--) {
    let pickup = pickups[i];
    
    // Move pickups toward player if in magnet range
    let distToPlayer = dist(pickup.pos.x, pickup.pos.y, player.pos.x, player.pos.y);
    if (distToPlayer < player.magnetRange) {
      let dir = p5.Vector.sub(player.pos, pickup.pos).normalize();
      pickup.pos.add(dir.mult(3));
    }
    
    // Check for collection
    if (distToPlayer < (player.size + pickup.size) / 2) {
      if (pickup.type === "health") {
        player.health = min(player.health + pickup.value, player.maxHealth);
        createParticles(player.pos.x, player.pos.y, 5, [0, 255, 0], 15);
      } else if (pickup.type === "experience") {
        experience += pickup.value;
        score += pickup.value;
        createParticles(player.pos.x, player.pos.y, 5, [0, 100, 255], 15);
      }
      pickups.splice(i, 1);
    }
  }
}

function updateProjectiles() {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    let proj = projectiles[i];
    
    // Add homing behavior for Magic Orb
    if (proj.weapon.name === "Magic Orb" && !proj.hasExploded) {
      // Find the closest enemy
      let closestEnemy = null;
      let closestDist = Infinity;
      
      for (let enemy of enemies) {
        let dist = p5.Vector.dist(proj.pos, enemy.pos);
        if (dist < closestDist) {
          closestDist = dist;
          closestEnemy = enemy;
        }
      }
      
      if (closestEnemy) {
        // Calculate direction to enemy
        let targetDir = p5.Vector.sub(closestEnemy.pos, proj.pos).normalize();
        // Gradually turn towards target (higher number = slower turning)
        let turnSpeed = 0.15;
        let currentDir = proj.vel.copy().normalize();
        let newDir = p5.Vector.lerp(currentDir, targetDir, turnSpeed);
        
        // Update velocity while maintaining speed
        proj.vel = newDir.mult(proj.weapon.speed);
      }
    }
    
    // Update position
    proj.pos.add(proj.vel);
    
    // Check if projectile has exceeded its range
    let distTraveled = p5.Vector.dist(proj.pos, proj.startPos);
    if (distTraveled > proj.range) {
      // For Magic Orb, explode when reaching max range
      if (proj.weapon.name === "Magic Orb" && !proj.hasExploded) {
        proj.hasExploded = true;
        // Create explosion effect
        for (let i = 0; i < 20; i++) {
          let angle = random(TWO_PI);
          let speed = random(2, 5);
          createParticles(proj.pos.x, proj.pos.y, 1, [100, 100, 255], speed, 'magic');
        }
        // Check for enemies in explosion radius
        for (let enemy of enemies) {
          let dist = p5.Vector.dist(proj.pos, enemy.pos);
          if (dist <= proj.explosionRadius) {
            // Calculate damage falloff based on distance
            let damageMultiplier = 1 - (dist / proj.explosionRadius);
            let damage = proj.damage * damageMultiplier;
            enemy.health -= damage;
            enemy.lastHitTime = millis();
            
            // Add knockback effect
            let knockback = p5.Vector.sub(enemy.pos, proj.pos).normalize().mult(5 * damageMultiplier);
            enemy.pos.add(knockback);
          }
        }
        projectiles.splice(i, 1);
  } else {
        projectiles.splice(i, 1);
      }
      continue;
    }
    
    // Add trail effect for projectiles
    if (proj.weapon.name === "Throwing Knife") {
      createParticles(proj.pos.x, proj.pos.y, 1, [200, 200, 200, 100], 3);
      
      // Add collision detection for knives
  for (let enemy of enemies) {
        let dist = p5.Vector.dist(proj.pos, enemy.pos);
        if (dist < enemy.size/2 + 5) {
          enemy.health -= proj.damage;
          enemy.lastHitTime = millis();
          createParticles(enemy.pos.x, enemy.pos.y, 10, [255, 255, 255], 5);
          projectiles.splice(i, 1);
          break;
        }
      }
    } else if (proj.weapon.name === "Magic Orb") {
      // Add pulsing magical trail
      let pulseSize = 2 + sin(millis() * 0.01) * 1;
      createParticles(proj.pos.x, proj.pos.y, 2, [100, 100, 255, 150], 5 * pulseSize);
      
      // Check for collision with enemies
      for (let enemy of enemies) {
        let dist = p5.Vector.dist(proj.pos, enemy.pos);
        if (dist < enemy.size/2 + proj.size/2) {
          // Create explosion effect
          for (let j = 0; j < 30; j++) {
            let angle = random(TWO_PI);
            let speed = random(2, 6);
            particles.push({
              pos: proj.pos.copy(),
              vel: p5.Vector.fromAngle(angle).mult(speed),
              type: 'magic',
              color: [100, 100, 255],
              life: random(30, 50),
              size: random(5, 10)
            });
          }
          
          // Create magical runes
          for (let j = 0; j < 8; j++) {
            let angle = TWO_PI * j / 8;
            particles.push({
              pos: proj.pos.copy(),
              vel: p5.Vector.fromAngle(angle).mult(1),
              type: 'rune',
              angle: angle,
              radius: proj.weapon.explosionRadius,
              life: 40,
              size: 15
            });
          }
          
          // Damage enemies in explosion radius
          for (let otherEnemy of enemies) {
            let distToExplosion = p5.Vector.dist(proj.pos, otherEnemy.pos);
            if (distToExplosion <= proj.weapon.explosionRadius) {
              let damageMultiplier = map(distToExplosion, 0, proj.weapon.explosionRadius, 1, 0.4);
              otherEnemy.health -= proj.damage * damageMultiplier;
              otherEnemy.lastHitTime = millis();
              
              // Knockback from explosion
              let knockbackDir = p5.Vector.sub(otherEnemy.pos, proj.pos).normalize();
              let knockbackForce = map(distToExplosion, 0, proj.weapon.explosionRadius, 8, 2);
              otherEnemy.pos.add(knockbackDir.mult(knockbackForce));
            }
          }
          
          projectiles.splice(i, 1);
          break;
        }
      }
    } else if (proj.weapon.name === "Meteor") {
      // Add trail effect
      if (frameCount % 2 === 0) {
        proj.meteorTrail.push({
          pos: proj.pos.copy(),
          life: 20
        });
      }
      
      // Update trail
      for (let i = proj.meteorTrail.length - 1; i >= 0; i--) {
        proj.meteorTrail[i].life--;
        if (proj.meteorTrail[i].life <= 0) {
          proj.meteorTrail.splice(i, 1);
        }
      }
      
      // Check for impact
      if (p5.Vector.dist(proj.pos, proj.targetPos) < 10 && !proj.hasImpacted) {
        proj.hasImpacted = true;
        
        // Create impact explosion effect
        for (let i = 0; i < 50; i++) {
          let angle = random(TWO_PI);
          let speed = random(2, 8);
          let radius = random(proj.impactRadius * 0.2, proj.impactRadius * 0.5);
          let pos = p5.Vector.fromAngle(angle).mult(radius).add(proj.pos);
          
          particles.push({
            pos: pos,
            vel: p5.Vector.fromAngle(angle).mult(speed),
            type: 'meteor',
            color: [255, random(50, 150), 0],
            life: random(30, 60),
            size: random(5, 15)
          });
        }
        
        // Create ground cracks effect
        for (let i = 0; i < 8; i++) {
          let angle = TWO_PI * i / 8;
          let crackLength = random(proj.impactRadius * 0.5, proj.impactRadius * 0.8);
          particles.push({
            pos: proj.pos.copy(),
            vel: p5.Vector.fromAngle(angle).mult(2),
            type: 'crack',
            angle: angle,
            length: crackLength,
            life: 60,
            size: 3
          });
        }
        
        // Damage enemies in radius
  for (let enemy of enemies) {
          let distToImpact = p5.Vector.dist(proj.pos, enemy.pos);
          if (distToImpact < proj.impactRadius) {
            // Calculate damage falloff based on distance
            let damageMultiplier = map(distToImpact, 0, proj.impactRadius, 1, 0.4);
            enemy.health -= proj.damage * damageMultiplier;
            enemy.lastHitTime = millis(); // Add hit flash effect
            
            // Strong knockback from center
            let knockbackDir = p5.Vector.sub(enemy.pos, proj.pos).normalize();
            let knockbackForce = map(distToImpact, 0, proj.impactRadius, 15, 5);
            enemy.pos.add(knockbackDir.mult(knockbackForce));
            
            // Add hit effect
            createParticles(enemy.pos.x, enemy.pos.y, 10, [255, 100, 0], 8);
          }
        }
        
        // Screen shake effect
        // (You'll need to implement this in the draw function)
        window.screenShake = 20;
        
        projectiles.splice(i, 1);
        continue;
      }
    } else {
      // ... existing projectile hit detection code for other weapons ...
    }
    
    // Remove if out of range (except Magic Orb which has infinite range)
    if (i >= 0 && proj.weapon.name !== "Magic Orb" && p5.Vector.dist(proj.pos, proj.startPos) > proj.range) {
      projectiles.splice(i, 1);
    }
  }
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    let p = particles[i];
    p.pos.add(p.vel);
    p.life -= 1;
    
    if (p.life <= 0) {
      particles.splice(i, 1);
    }
  }
}

function spawnEnemy() {
  // Determine spawn position (outside screen)
  let side = Math.floor(random(4)); // 0: top, 1: right, 2: bottom, 3: left
  let pos;
  switch (side) {
    case 0: pos = createVector(random(width), -20); break;        // Top
    case 1: pos = createVector(width + 20, random(height)); break;   // Right
    case 2: pos = createVector(random(width), height + 20); break;   // Bottom
    case 3: pos = createVector(-20, random(height)); break;       // Left
  }
  
  // Determine enemy type based on wave
  let typeIndex;
  if (waveNumber >= 10 && random() < 0.05) {
    typeIndex = 3; // Boss (rare)
  } else if (waveNumber >= 5) {
    typeIndex = Math.floor(random(3)); // Any of the first three types
  } else if (waveNumber >= 3) {
    typeIndex = Math.floor(random(2)); // Grunt or Speeder
  } else {
    typeIndex = 0; // Just Grunts in the beginning
  }
  
  let type = enemyTypes[typeIndex];
  
  // Create enemy with scaled difficulty
  let enemy = {
    pos: pos,
    health: type.health * difficultyMultiplier,
    speed: type.speed,
    damage: type.damage * difficultyMultiplier,
    color: type.color,
    size: type.size,
    expValue: type.expValue,
    type: type.name,
    spriteIndex: type.spriteIndex,
    collisionHeight: type.collisionHeight,
    lastHitTime: 0, // Add this property to track hit timing
    hitFlashDuration: 200, // Duration of the hit flash effect in milliseconds
    frozen: false,
    frozenUntil: 0
  };
  
  enemies.push(enemy);
}

function levelUp() {
  level++;
  experience -= experienceToNextLevel;
  experienceToNextLevel = Math.floor(experienceToNextLevel * 1.2);
  upgradeScreen = true;
  generateUpgradeOptions();
}

function generateUpgradeOptions() {
  upgradeOptions = [];
  
  // Add health upgrade
  upgradeOptions.push({
    name: "Max Health +20",
    description: "Increase your maximum health by 20",
    apply: function() {
      player.maxHealth += 20;
      player.health += 20;
      console.log("Applied health upgrade");
    }
  });
  
  // Add speed upgrade
  upgradeOptions.push({
    name: "Movement Speed +10%",
    description: "Increase your movement speed",
    apply: function() {
      player.speed *= 1.1;
      console.log("Applied speed upgrade");
    }
  });
  
  // Add magnet range upgrade
  upgradeOptions.push({
    name: "Pickup Range +20%",
    description: "Increase your pickup collection range",
    apply: function() {
      player.magnetRange *= 1.2;
      console.log("Applied magnet range upgrade");
    }
  });
  
  // Add dash cooldown reduction
  upgradeOptions.push({
    name: "Dash Cooldown -15%",
    description: "Reduce the cooldown of your dash ability",
    apply: function() {
      player.dashCooldown *= 0.85;
      console.log("Applied dash cooldown upgrade");
    }
  });
  
  // Add weapon upgrades with detailed descriptions
  let weaponUpgrades = [];
  
  for (let i = 0; i < weapons.length; i++) {
    let weapon = weapons[i];
    
    // Check if player already has this weapon
    let playerHasWeapon = false;
    for (let j = 0; j < player.weapons.length; j++) {
      if (player.weapons[j].name === weapon.name) {
        playerHasWeapon = true;
        break;
      }
    }
    
    // Only add weapons player has or new weapons
    if ((playerHasWeapon && weapon.level < weapon.maxLevel) || 
        (!playerHasWeapon && weapon.level === 0)) {
      
      let upgradeDescription;
      
      if (weapon.level === 0) {
        // New weapon descriptions
        if (weapon.name === "Throwing Knife") {
          upgradeDescription = "A projectile that shoots away from your movement direction";
        } else if (weapon.name === "Whip") {
          upgradeDescription = "A wide-arc melee weapon with extended range";
        } else if (weapon.name === "Magic Orb") {
          upgradeDescription = "A homing projectile that explodes on impact";
        } else if (weapon.name === "Meteor") {
          upgradeDescription = "Calls down meteors that create explosions on impact";
        }
      } else {
        // Upgrade descriptions
        if (weapon.name === "Sword") {
          upgradeDescription = `Increase damage by 20% and reduce cooldown by 10%`;
        } else if (weapon.name === "Throwing Knife") {
          upgradeDescription = `Add 2 more knives that shoot in an arc behind you`;
        } else if (weapon.name === "Whip") {
          upgradeDescription = `Increase damage by 20%, range by 15%, and reduce cooldown by 10%`;
        } else if (weapon.name === "Magic Orb") {
          upgradeDescription = `Increase damage by 20% and explosion radius by 30%`;
        } else if (weapon.name === "Meteor") {
          upgradeDescription = `Increase damage by 20% and impact radius by 30%`;
        }
      }
      
      let weaponIndex = i;
      
      weaponUpgrades.push({
        name: weapon.level === 0 ? `New Weapon: ${weapon.name}` : `Upgrade ${weapon.name} (Lvl ${weapon.level} → ${weapon.level + 1})`,
        description: upgradeDescription,
        apply: function() {
          if (weapon.level === 0) {
            // For new weapons
            weapons[weaponIndex].level = 1;
            weapons[weaponIndex].lastUseTime = 0;
            let weaponRef = weapons[weaponIndex];
            
            let alreadyHas = false;
            for (let j = 0; j < player.weapons.length; j++) {
              if (player.weapons[j].name === weaponRef.name) {
                alreadyHas = true;
                break;
              }
            }
            
            if (!alreadyHas) {
              player.weapons.push(weaponRef);
            }
          } else {
            // For existing weapons
            weapons[weaponIndex].level++;
            weapons[weaponIndex].damage *= 1.2; // 20% damage increase for all weapons
            
            // Range/effect increases based on weapon type
            if (weapons[weaponIndex].name === "Whip") {
              weapons[weaponIndex].range *= 1.15; // 15% range increase
            } else if (weapons[weaponIndex].name === "Magic Orb") {
              weapons[weaponIndex].explosionRadius *= 1.3; // 30% explosion radius increase
            } else if (weapons[weaponIndex].name === "Meteor") {
              weapons[weaponIndex].impactRadius *= 1.3; // 30% impact radius increase
            }
            
            // Cooldown reduction for all weapons except Ice Burst and Meteor
            if (weapons[weaponIndex].name !== "Ice Burst" && weapons[weaponIndex].name !== "Meteor" && weapons[weaponIndex].cooldown > 300) {
              weapons[weaponIndex].cooldown *= 0.9;
            }
          }
        }
      });
    }
  }
  
  // Always include at least one weapon upgrade if available
  if (weaponUpgrades.length > 0) {
    // Sort weapon upgrades to prioritize new weapons, then by level
    weaponUpgrades.sort((a, b) => {
      if (a.name.includes("New Weapon") && !b.name.includes("New Weapon")) return -1;
      if (!a.name.includes("New Weapon") && b.name.includes("New Weapon")) return 1;
      return 0;
    });
    
    // Add at least one weapon upgrade
    upgradeOptions.push(weaponUpgrades[0]);
    
    // Add a second weapon upgrade if available
    if (weaponUpgrades.length > 1) {
      upgradeOptions.push(weaponUpgrades[1]);
    }
  }
  
  // Shuffle and pick 3 random upgrades
  shuffleArray(upgradeOptions);
  upgradeOptions = upgradeOptions.slice(0, 3);
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function drawGame() {
  // Draw pickups
  for (let pickup of pickups) {
    if (pickup.type === "health") {
      if (useSprites && images.healthPickup && images.healthPickup.width > 0) {
        image(images.healthPickup, pickup.pos.x - pickup.size/2, pickup.pos.y - pickup.size/2, pickup.size, pickup.size);
      } else {
        fill(0, 255, 0);
        stroke(0, 100, 0);
        rect(pickup.pos.x - pickup.size/2, pickup.pos.y - pickup.size/2, pickup.size, pickup.size);
      }
    } else if (pickup.type === "experience") {
      if (useSprites && images.expPickup && images.expPickup.width > 0) {
        image(images.expPickup, pickup.pos.x - pickup.size/2, pickup.pos.y - pickup.size/2, pickup.size, pickup.size);
      } else {
        fill(0, 100, 255);
        stroke(0, 50, 150);
        ellipse(pickup.pos.x, pickup.pos.y, pickup.size, pickup.size);
      }
    }
  }
  
  // Draw projectiles
  noStroke();
  for (let proj of projectiles) {
    if (proj.weapon.name === "Throwing Knife") {
      if (useSprites && images.knife && images.knife.width > 0) {
        push();
        translate(proj.pos.x, proj.pos.y);
        rotate(proj.vel.heading());
        image(images.knife, -20, -8, 40, 16); // Increased size
        pop();
      } else {
        fill(200, 200, 200);
        push();
        translate(proj.pos.x, proj.pos.y);
        rotate(proj.vel.heading());
        rect(-16, -4, 32, 8); // Increased size
        pop();
      }
    } else if (proj.weapon.name === "Magic Orb") {
      if (useSprites && images.orb && images.orb.width > 0) {
        // Add pulsing effect
        let scale = 1 + 0.2 * sin((millis() - proj.creationTime) * 0.01);
        let size = proj.size * scale;
        image(images.orb, proj.pos.x - size/2, proj.pos.y - size/2, size, size);
        
        // Add glow effect
        noFill();
        stroke(100, 100, 255, 100);
        strokeWeight(2);
        ellipse(proj.pos.x, proj.pos.y, size * 1.5, size * 1.5);
        strokeWeight(1);
      } else {
        fill(100, 100, 255, 200);
        ellipse(proj.pos.x, proj.pos.y, 15, 15);
      }
    } else if (proj.weapon.name === "Meteor") {
      // Draw meteor trail
      for (let trail of proj.meteorTrail) {
        let alpha = map(trail.life, 0, 20, 0, 255);
        fill(255, 100, 0, alpha);
        noStroke();
        let trailSize = 20 * (trail.life / 20);
        ellipse(trail.pos.x, trail.pos.y, trailSize, trailSize);
      }
      
      // Draw the meteor
      push();
      translate(proj.pos.x, proj.pos.y);
      rotate(proj.vel.heading() + PI/2);
      
      // Meteor body
      fill(255, 150, 0);
      noStroke();
      beginShape();
      vertex(0, -20);
      vertex(15, 10);
      vertex(0, 5);
      vertex(-15, 10);
      endShape(CLOSE);
      
      // Meteor glow
      drawingContext.shadowBlur = 20;
      drawingContext.shadowColor = 'rgba(255, 100, 0, 0.5)';
      ellipse(0, 0, 30, 30);
      drawingContext.shadowBlur = 0;
      
      pop();
    }
  }
  
  // Draw active weapon effects
  drawWeaponEffects();
  
  // Draw enemies
  for (let enemy of enemies) {
    push();
    if (useSprites && images.enemies && images.enemies[enemy.spriteIndex] && images.enemies[enemy.spriteIndex].width > 0) {
      let spriteSize = enemy.size * 2.5;
      let spriteOffset = spriteSize * 0.1;
      
      // Normal hit flash effect
      if (millis() - enemy.lastHitTime < enemy.hitFlashDuration) {
        let flashIntensity = 1 - (millis() - enemy.lastHitTime) / enemy.hitFlashDuration;
        tint(255, 255, 255, 255 * flashIntensity);
      }
      
      // Draw the enemy sprite
      image(images.enemies[enemy.spriteIndex], 
            enemy.pos.x - spriteSize/2, 
            enemy.pos.y - spriteSize/2 + spriteOffset, 
            spriteSize, 
            spriteSize);
    } else {
      // Fallback shape drawing
      if (millis() - enemy.lastHitTime < enemy.hitFlashDuration) {
        let flashIntensity = 1 - (millis() - enemy.lastHitTime) / enemy.hitFlashDuration;
        let r = lerp(enemy.color[0], 255, flashIntensity);
        let g = lerp(enemy.color[1], 255, flashIntensity);
        let b = lerp(enemy.color[2], 255, flashIntensity);
        fill(r, g, b);
      } else {
        fill(enemy.color);
      }
      noStroke();
      ellipse(enemy.pos.x, enemy.pos.y, enemy.size, enemy.size);
    }
    pop();
    
    // Health bar - positioned just above the enemy
    let maxHealth = enemy.type === "Boss" ? 200 * difficultyMultiplier : 
                   enemy.type === "Tank" ? 50 * difficultyMultiplier : 
                   enemy.type === "Speeder" ? 10 * difficultyMultiplier : 
                   20 * difficultyMultiplier;
    
    let healthPercent = enemy.health / maxHealth;
    stroke(0);
    fill(100);
    rect(enemy.pos.x - 15, enemy.pos.y - enemy.size/2 - 15, 30, 5); // Moved up 5 pixels
    fill(255, 0, 0);
    rect(enemy.pos.x - 15, enemy.pos.y - enemy.size/2 - 15, 30 * healthPercent, 5);
  }
  
  // Draw player
  if (useSprites && images.player && images.player.width > 0) {
    // Calculate player sprite size (using 64x64 base size)
    let spriteSize = player.size * 2; // Adjusted multiplier for better proportions
    
    // Save current drawing state
    push();
    
    // Move to player position
    translate(player.pos.x, player.pos.y);
    
    // Scale based on facing direction (flip sprite)
    scale(player.facing.x >= 0 ? 1 : -1, 1);
    
    // Apply visual effects
    if (millis() - player.lastDamageTime < player.invincibleTime) {
      // Flashing when hit
      tint(255, 0, 0, 100 + 100 * Math.sin(millis() * 0.02));
    } else if (player.isDashing) {
      // Blue tint when dashing
      tint(100, 100, 255, 200);
    }
    
    // Draw the player sprite - adjusted offset for 64x64 sprite
    image(images.player, 
          -spriteSize/2,           // Center horizontally
          -spriteSize * 0.75,      // Adjusted upward offset to better center attacks
          spriteSize,              // Width
          spriteSize);             // Height
    
    // Restore drawing state
    pop();
    
    // Draw weapon
    drawPlayerWeapon();
  } else {
    // Fallback to simple circle if sprite not available
    // Determine player color based on state
    if (millis() - player.lastDamageTime < player.invincibleTime) {
      fill(255, 0, 0, 100 + 100 * Math.sin(millis() * 0.02)); // Flashing when hit
    } else if (player.isDashing) {
      fill(100, 100, 255, 150); // Blue when dashing
    } else {
      fill(200, 200, 200); // Normal color
    }
    
    // Draw player body
    stroke(0);
    ellipse(player.pos.x, player.pos.y, player.size, player.size);
    
    // Draw player details to make it look like a person with a sword
    push();
    translate(player.pos.x, player.pos.y);
    rotate(player.facing.heading());
    
    // Draw sword/weapon
    stroke(255);
    strokeWeight(2);
    line(0, 0, 20, 0); // Sword
    
    // Draw a small circle for the head
    fill(255);
    noStroke();
    ellipse(0, -5, 10, 10);
    
    pop();
    strokeWeight(1);
  }
  
  // Draw particles
  noStroke();
  for (let p of particles) {
    if (p.type === 'blood') {
      // Blood particles
      fill(p.color[0], p.color[1], p.color[2], p.life * 3);
      let size = p.size * (1 + sin(millis() * 0.01 + p.life) * 0.2);
      ellipse(p.pos.x, p.pos.y, size, size);
      
      // Add drip effect
      if (p.life > 20) {
        let drip = p.size * 0.5;
        beginShape();
        vertex(p.pos.x - drip, p.pos.y);
        vertex(p.pos.x + drip, p.pos.y);
        vertex(p.pos.x, p.pos.y + drip * 2);
        endShape(CLOSE);
      }
    } else if (p.type === 'energy') {
      // Demonic energy particles
      fill(p.color[0], p.color[1], p.color[2], p.life * 4);
      push();
      translate(p.pos.x, p.pos.y);
      rotate(millis() * 0.01);
      // Draw pentagram shape
      beginShape();
      for(let i = 0; i < 5; i++) {
        let angle = TWO_PI * i / 5 - HALF_PI;
        let x = cos(angle) * p.size;
        let y = sin(angle) * p.size;
        vertex(x, y);
      }
      endShape(CLOSE);
      pop();
      
      // Add glow effect
      drawingContext.shadowBlur = 10;
      drawingContext.shadowColor = `rgb(${p.color[0]}, ${p.color[1]}, ${p.color[2]})`;
      ellipse(p.pos.x, p.pos.y, p.size * 1.5, p.size * 1.5);
      drawingContext.shadowBlur = 0;
    } else if (p.type === 'meteor') {
      // Meteor particle effect
      fill(p.color[0], p.color[1], p.color[2], p.life * 4);
      let size = p.size * (1 + sin(millis() * 0.01 + p.life) * 0.2);
      ellipse(p.pos.x, p.pos.y, size, size);
      
      // Add glow effect
      drawingContext.shadowBlur = 10;
      drawingContext.shadowColor = `rgb(${p.color[0]}, ${p.color[1]}, 0)`;
      ellipse(p.pos.x, p.pos.y, size * 1.5, size * 1.5);
      drawingContext.shadowBlur = 0;
    } else if (p.type === 'crack') {
      // Ground crack effect
      stroke(255, 100, 0, p.life * 4);
      strokeWeight(p.size);
      let endX = p.pos.x + cos(p.angle) * p.length;
      let endY = p.pos.y + sin(p.angle) * p.length;
      line(p.pos.x, p.pos.y, endX, endY);
    } else if (p.type === 'magic') {
      fill(p.color[0], p.color[1], p.color[2], p.life * 4);
      let size = p.size * (1 + sin(millis() * 0.01 + p.life) * 0.2);
      ellipse(p.pos.x, p.pos.y, size, size);
      
      // Add glow effect
      drawingContext.shadowBlur = 10;
      drawingContext.shadowColor = `rgb(${p.color[0]}, ${p.color[1]}, ${p.color[2]})`;
      ellipse(p.pos.x, p.pos.y, size * 1.5, size * 1.5);
      drawingContext.shadowBlur = 0;
    } else if (p.type === 'rune') {
      stroke(100, 100, 255, p.life * 5);
      strokeWeight(2);
      noFill();
      push();
      translate(p.pos.x, p.pos.y);
      rotate(p.angle + millis() * 0.002);
      // Draw magical rune
      beginShape();
      for (let i = 0; i < 5; i++) {
        let angle = TWO_PI * i / 5;
        let x = cos(angle) * p.radius * 0.2;
        let y = sin(angle) * p.radius * 0.2;
        vertex(x, y);
      }
      endShape(CLOSE);
      pop();
    }
  }
}

function drawWeaponEffects() {
  if (!window.weaponEffects) window.weaponEffects = [];
  
  // Remove expired effects
  for (let i = window.weaponEffects.length - 1; i >= 0; i--) {
    if (millis() - window.weaponEffects[i].startTime > window.weaponEffects[i].duration) {
      window.weaponEffects.splice(i, 1);
    }
  }
  
  // Draw active effects
  for (let effect of window.weaponEffects) {
    let progress = (millis() - effect.startTime) / effect.duration; // 0 to 1
    let weapon = effect.weapon;
    
    // Different drawing based on weapon type
    if (weapon.name === "Sword") {
      drawSwordEffect(effect, progress);
    } else if (weapon.name === "Whip") {
      drawWhipEffect(effect, progress);
    } else if (weapon.name === "Magic Orb" && !weapon.projectile) {
      drawMagicOrbEffect(effect, progress);
    } else if (weapon.name === "Throwing Knife" && !weapon.projectile) {
      drawKnifeEffect(effect, progress);
    } else {
      drawDefaultMeleeEffect(effect, progress);
    }
  }
}

function drawSwordEffect(effect, progress) {
  let player = effect.player;
  let weapon = effect.weapon;
  
  // Draw a sword slash arc
  let swingAngle = weapon.angle;
  let startAngle = effect.angle - swingAngle / 2;
  let endAngle = effect.angle + swingAngle / 2;
  let currentAngle = startAngle + (endAngle - startAngle) * progress;
  
  // Calculate current sword position - remove range scaling for sword
  let swordLength = weapon.range;
  let swordX = cos(currentAngle) * swordLength * 0.8;
  let swordY = sin(currentAngle) * swordLength * 0.8;
  let swordWidth = 20; // Width of the sword hitbox
  
  // Initialize hitEnemies array if it doesn't exist
  if (!effect.hitEnemies) {
    effect.hitEnemies = [];
  }
  
  // Check for hits with the current sword position
  for (let enemy of enemies) {
    // Skip if this enemy has already been hit during this swing
    if (effect.hitEnemies.includes(enemy)) {
      continue;
    }
    
    let toEnemy = p5.Vector.sub(enemy.pos, player.pos);
    let distToEnemy = toEnemy.mag();
    
    // Check if enemy is within sword's reach - use constant range
    if (distToEnemy <= swordLength + enemy.size/2) {
      let angleToEnemy = atan2(enemy.pos.y - player.pos.y, enemy.pos.x - player.pos.x);
      let angleDiff = Math.abs(angleToEnemy - currentAngle);
      angleDiff = min(angleDiff, TWO_PI - angleDiff);
      
      if (angleDiff < swordWidth / swordLength) {
        let damage = weapon.damage * (1 + (weapon.level - 1) * 0.2);
        enemy.health -= damage;
        enemy.lastHitTime = millis();
        
        let knockback = p5.Vector.fromAngle(currentAngle).mult(3);
        enemy.pos.add(knockback);
        
        createParticles(enemy.pos.x, enemy.pos.y, 5, [255, 255, 255], 5);
        
        effect.hitEnemies.push(enemy);
        effect.hit = true;
      }
    }
  }
  
  // Draw the sword
  push();
  translate(player.pos.x, player.pos.y);
  
  // Draw the slash arc
  noFill();
  stroke(200, 200, 255, 200 * (1 - progress));
  strokeWeight(5);
  arc(0, 0, weapon.range * 2, weapon.range * 2, startAngle, currentAngle);
  
  // Draw the sword sprite
  if (useSprites && images.sword && images.sword.width > 0) {
    push();
    translate(swordX, swordY);
    rotate(currentAngle + PI/2);
    image(images.sword, -15, -30, 30, 60);
    pop();
  } else {
    // Fallback sword drawing
    stroke(200, 200, 255);
    strokeWeight(3);
    line(0, 0, swordX, swordY);
  }
  
  pop();
  strokeWeight(1);
}

function drawWhipEffect(effect, progress) {
  let player = effect.player;
  let weapon = effect.weapon;
  
  // Find closest enemy at the start of the effect if we haven't stored one yet
  if (!effect.targetEnemy) {
    let closestEnemy = null;
    let closestDist = Infinity;
    
    for (let enemy of enemies) {
      let dist = p5.Vector.dist(player.pos, enemy.pos);
      if (dist < closestDist) {
        closestDist = dist;
        closestEnemy = enemy;
      }
    }
    effect.targetEnemy = closestEnemy;
    
    // Store the angle to the target
    if (closestEnemy) {
      effect.targetAngle = atan2(closestEnemy.pos.y - player.pos.y, closestEnemy.pos.x - player.pos.x);
    } else {
      effect.targetAngle = player.facing.heading();
    }
  }

  push();
  translate(player.pos.x, player.pos.y);
  
  // Use the stored target angle
  let endAngle = effect.targetAngle;
  let endDist = weapon.range * (1 + (weapon.level - 1) * 0.25);
  
  // Whip extends outward and then retracts
  let whipProgress = progress < 0.5 ? progress * 2 : 2 - progress * 2;
  
  // Calculate the end point of the whip
  let endX = cos(endAngle) * endDist * whipProgress;
  let endY = sin(endAngle) * endDist * whipProgress;
  
  // Calculate control points for the curve
  let ctrl1Angle = endAngle - PI/6;
  let ctrl2Angle = endAngle + PI/6;
  let controlDist = endDist * 0.7;
  let ctrl1X = cos(ctrl1Angle) * controlDist * whipProgress;
  let ctrl1Y = sin(ctrl1Angle) * controlDist * whipProgress;
  let ctrl2X = cos(ctrl2Angle) * controlDist * whipProgress;
  let ctrl2Y = sin(ctrl2Angle) * controlDist * whipProgress;
  
  // Draw the whip
  if (useSprites && images.whip && images.whip.width > 0) {
    // Draw the whip chain
    stroke(200, 150, 100);
    strokeWeight(3);
    noFill();
    beginShape();
    vertex(0, 0);
    bezierVertex(ctrl1X/3, ctrl1Y/3, ctrl2X/3, ctrl2Y/3, endX, endY);
    endShape();
    
    // Draw the whip end
    let whipSize = 30;
    image(images.whip, endX - whipSize/2, endY - whipSize/2, whipSize, whipSize);
    
    // Add a glow effect
    noFill();
    stroke(200, 150, 100, 100);
    strokeWeight(6);
    beginShape();
    vertex(0, 0);
    bezierVertex(ctrl1X/3, ctrl1Y/3, ctrl2X/3, ctrl2Y/3, endX, endY);
    endShape();
  } else {
    // Fallback whip drawing
    stroke(200, 150, 100);
    strokeWeight(3);
    noFill();
    beginShape();
    vertex(0, 0);
    bezierVertex(ctrl1X/3, ctrl1Y/3, ctrl2X/3, ctrl2Y/3, endX, endY);
    endShape();
    
    fill(200, 150, 100);
    noStroke();
    ellipse(endX, endY, 8, 8);
  }
  
  // Only check for hits during the extension phase (first half of animation)
  if (progress < 0.5) {
    // Initialize hitEnemies array if it doesn't exist
    if (!effect.hitEnemies) effect.hitEnemies = [];
    
    // Check for hits along the whip's path
    for (let enemy of enemies) {
      if (!effect.hitEnemies.includes(enemy)) {
        // Check multiple points along the whip's curve
        for (let t = 0; t <= 1; t += 0.1) {
          let x = bezierPoint(0, ctrl1X/3, ctrl2X/3, endX, t);
          let y = bezierPoint(0, ctrl1Y/3, ctrl2Y/3, endY, t);
          let whipPoint = createVector(player.pos.x + x, player.pos.y + y);
          
          if (p5.Vector.dist(whipPoint, enemy.pos) < enemy.size/2 + 10) {
            // Apply full damage regardless of distance
            let damage = weapon.damage * (1 + (weapon.level - 1) * 0.2);
            enemy.health -= damage;
            enemy.lastHitTime = millis();
            effect.hitEnemies.push(enemy);
            
            // Visual effect at point of impact
            createParticles(enemy.pos.x, enemy.pos.y, 5, [200, 150, 100], 5);
            
            // Knockback in the whip's direction
            let knockback = p5.Vector.fromAngle(endAngle).mult(2);
            enemy.pos.add(knockback);
            
            break;
          }
        }
      }
    }
  }
  
  // Add particles along the whip
  if (frameCount % 2 === 0) {
    for (let i = 0; i < 5; i++) {
      let t = i / 5;
      let x = bezierPoint(0, ctrl1X/3, ctrl2X/3, endX, t);
      let y = bezierPoint(0, ctrl1Y/3, ctrl2Y/3, endY, t);
      createParticles(player.pos.x + x, player.pos.y + y, 1, [200, 150, 100, 150], 5);
    }
  }
  
  pop();
  strokeWeight(1);
}

function drawMagicOrbEffect(effect, progress) {
  let player = effect.player;
  let weapon = effect.weapon;
  
  push();
  translate(player.pos.x, player.pos.y);
  
  // Draw expanding circles
  for (let i = 0; i < 3; i++) {
    let radius = weapon.range * progress * (0.5 + i * 0.25);
    noFill();
    stroke(100, 100, 255, 200 * (1 - progress));
    strokeWeight(3);
    ellipse(0, 0, radius * 2, radius * 2);
  }
  
  // Draw orbs rotating around the player
  let orbCount = 5;
  for (let i = 0; i < orbCount; i++) {
    let angle = effect.angle + TWO_PI * i / orbCount + progress * TWO_PI;
    let x = cos(angle) * weapon.range * 0.7 * progress;
    let y = sin(angle) * weapon.range * 0.7 * progress;
    
    if (useSprites && images.orb && images.orb.width > 0) {
      let orbSize = 20;
      image(images.orb, x - orbSize/2, y - orbSize/2, orbSize, orbSize);
    } else {
      fill(100, 100, 255);
      noStroke();
      ellipse(x, y, 15, 15);
    }
    
    // Add particles
    if (frameCount % 2 === 0) {
      createParticles(player.pos.x + x, player.pos.y + y, 2, [100, 100, 255, 150], 8);
    }
  }
  
  pop();
  strokeWeight(1);
}

function drawKnifeEffect(effect, progress) {
  let player = effect.player;
  let weapon = effect.weapon;
  
  push();
  translate(player.pos.x, player.pos.y);
  
  // Draw multiple knives in a fan pattern
  let knifeCount = 5;
  let baseAngle = effect.angle - weapon.angle / 2;
  let angleStep = weapon.angle / (knifeCount - 1);
  
  for (let i = 0; i < knifeCount; i++) {
    let angle = baseAngle + angleStep * i;
    let dist = weapon.range * progress;
    let x = cos(angle) * dist;
    let y = sin(angle) * dist;
    
    if (useSprites && images.knife && images.knife.width > 0) {
      push();
      translate(x, y);
      rotate(angle + PI/2);
      image(images.knife, -10, -20, 20, 40);
      pop();
    } else {
      stroke(200, 200, 200);
      strokeWeight(2);
      line(0, 0, x, y);
      
      // Draw knife tip
      fill(200, 200, 200);
      noStroke();
      ellipse(x, y, 5, 5);
    }
    
    // Add particles
    if (frameCount % 2 === 0) {
      createParticles(player.pos.x + x, player.pos.y + y, 1, [200, 200, 200, 150], 5);
    }
  }
  
  pop();
  strokeWeight(1);
}

function drawDefaultMeleeEffect(effect, progress) {
  let player = effect.player;
  let weapon = effect.weapon;
  
  // Draw a simple arc
  push();
  translate(player.pos.x, player.pos.y);
  
  noFill();
  stroke(200, 200, 255, 200 * (1 - progress));
  strokeWeight(3);
  arc(0, 0, weapon.range * 2, weapon.range * 2, effect.angle - weapon.angle / 2, effect.angle + weapon.angle / 2);
  
  pop();
  strokeWeight(1);
}

function drawPlayerWeapon() {
  // Only draw if we're using sprites and not currently showing a weapon effect
  if (!useSprites) return;
  
  // Don't show the weapon if there's an active weapon effect
  if (window.weaponEffects && window.weaponEffects.length > 0) {
    return;
  }
  
  // Find the active weapon
  let activeWeapon = player.weapons[0]; // Default to first weapon
  
  // Get the most recently used weapon
  let mostRecentTime = 0;
  for (let weapon of player.weapons) {
    if (weapon.lastUseTime > mostRecentTime) {
      mostRecentTime = weapon.lastUseTime;
      activeWeapon = weapon;
    }
  }
  
  // Only show weapon during attack animation (200ms after use)
  if (millis() - mostRecentTime > 200) return;
  
  // Calculate animation progress (0 to 1)
  let progress = Math.min(1, (millis() - mostRecentTime) / 200);
  
  // Save current drawing state
  push();
  
  // Move to player position
  translate(player.pos.x, player.pos.y);
  
  // Get weapon image based on type
  let weaponImg;
  let weaponSize = 30;
  let weaponDistance = 20;
  
  if (activeWeapon.name === "Sword" && images.sword && images.sword.width > 0) {
    weaponImg = images.sword;
    weaponSize = 40;
  } else if (activeWeapon.name === "Throwing Knife" && images.knife && images.knife.width > 0) {
    weaponImg = images.knife;
    weaponSize = 20;
  } else if (activeWeapon.name === "Whip" && images.whip && images.whip.width > 0) {
    weaponImg = images.whip;
    weaponSize = 50;
  } else if (activeWeapon.name === "Magic Orb" && images.orb && images.orb.width > 0) {
    weaponImg = images.orb;
    weaponSize = 25;
  }
  
  if (weaponImg) {
    // For melee weapons, swing in an arc
    if (!activeWeapon.projectile) {
      // Calculate swing angle based on progress
      let swingAngle = player.facing.heading() - Math.PI/4 + (Math.PI/2 * progress);
      
      // Position at the end of the swing
      let x = Math.cos(swingAngle) * weaponDistance;
      let y = Math.sin(swingAngle) * weaponDistance;
      
      // Rotate to face the swing direction
      rotate(swingAngle + Math.PI/2);
      
      // Draw the weapon
      image(weaponImg, x - weaponSize/2, y - weaponSize/2, weaponSize, weaponSize);
    }
    // For projectile weapons, just show briefly at player position
    else if (progress < 0.3) {
      rotate(player.facing.heading() + Math.PI/2);
      image(weaponImg, 0, -weaponDistance, weaponSize, weaponSize);
    }
  }
  
  // Restore drawing state
  pop();
}

function drawHUD() {
  // Health bar
  stroke(0);
  fill(100);
  rect(20, 10, 200, 20);
  fill(255, 0, 0);
  rect(20, 10, 200 * (player.health / player.maxHealth), 20);
  fill(255);
  noStroke();
  textAlign(CENTER);
  text(`${Math.floor(player.health)}/${player.maxHealth}`, 120, 25);
  
  // Experience bar
  stroke(0);
  fill(100);
  rect(20, 40, 200, 10);
  fill(0, 100, 255);
  rect(20, 40, 200 * (experience / experienceToNextLevel), 10);
  
  // Level and score
  textAlign(LEFT);
  fill(255);
  noStroke();
  textSize(16);
  text(`Level: ${level}`, 240, 25);
  text(`Score: ${score}`, 320, 25);
  
  // Wave info
  text(`Wave: ${waveNumber}`, 20, 70);
  
  // Wave timer
  let waveTimeLeft = (waveDuration - waveTimer) / 1000;
  text(`Next wave: ${Math.floor(waveTimeLeft)}s`, 110, 70);
  
  // Kill count
  text(`Kills: ${killCount}`, 240, 70);
  
  // Controls hint
  fill(200);
  textSize(12);
  text("WASD/Arrows: Move | Space: Dash", 20, height - 30);
  
  // Dash cooldown indicator
  if (millis() - player.lastDashTime < player.dashCooldown) {
    fill(100);
    rect(20, height - 20, 100, 10);
    let cooldownPercent = (millis() - player.lastDashTime) / player.dashCooldown;
    fill(0, 200, 255);
    rect(20, height - 20, 100 * cooldownPercent, 10);
  } else {
    fill(0, 200, 255);
    rect(20, height - 20, 100, 10);
    fill(0);
    textAlign(CENTER);
    text("DASH READY", 70, height - 12);
  }
  
  textAlign(LEFT); // Reset text alignment to default
}

function drawUpgradeScreen() {
  background(0, 0, 0, 200);
  
  fill(255);
  textSize(32);
  textAlign(CENTER);
  text("LEVEL UP!", width/2, 100);
  textSize(20);
  text("Choose an upgrade:", width/2, 150);
  
  textAlign(LEFT);
  rectMode(CENTER);
  
  for (let i = 0; i < upgradeOptions.length; i++) {
    let option = upgradeOptions[i];
    let y = 220 + i * 120;
    
    // Check if mouse is over this option
    let isHovered = mouseX > width/2 - 200 && mouseX < width/2 + 200 && 
                    mouseY > y - 40 && mouseY < y + 40;
    
    // Draw option box
    stroke(255);
    fill(isHovered ? color(100, 100, 150) : color(50, 50, 100));
    rect(width/2, y, 400, 80);
    
    // Draw option text
    fill(255);
    noStroke();
    textSize(18);
    text(option.name, width/2 - 190, y - 15);
    textSize(14);
    text(option.description, width/2 - 190, y + 15);
  }
  
  rectMode(CORNER);
  textAlign(LEFT);
}

function drawGameOver() {
  background(0);
  
  // Title
  textAlign(CENTER);
  textSize(48);
  fill(255, 0, 0);
  text("GAME OVER", width/2, 100);
  
  // Create three columns
  const colWidth = width/3;
  
  // Stats section (left column)
  textAlign(LEFT);
  fill(255);
  textSize(28);
  text("STATS", colWidth/2 - 100, 160);
  textSize(20);
  fill(200);
  let statsY = 200;
  let statsSpacing = 35;
  text(`Survival Time: ${Math.floor(survivalTime / 1000)} seconds`, colWidth/2 - 100, statsY);
  text(`Score: ${score}`, colWidth/2 - 100, statsY + statsSpacing);
  text(`Kills: ${killCount}`, colWidth/2 - 100, statsY + statsSpacing * 2);
  text(`Level: ${level}`, colWidth/2 - 100, statsY + statsSpacing * 3);
  
  // Leaderboard section (middle column)
  drawLeaderboard(colWidth + 50, 160);
  
  // Upgrades section (right column)
  textAlign(LEFT);
  textSize(28);
  fill(255);
  text("UPGRADES", colWidth * 2 + 50, 160);
  textSize(16);
  fill(200);
  let upgradeY = 200;
  let upgradeSpacing = 25;
  let visibleUpgrades = Math.min(8, upgradeHistory.length);
  for (let i = Math.max(0, upgradeHistory.length - visibleUpgrades); i < upgradeHistory.length; i++) {
    let upgrade = upgradeHistory[i];
    text(`Level ${upgrade.level}: ${upgrade.name}`, colWidth * 2 + 50, upgradeY + (i % visibleUpgrades) * upgradeSpacing);
  }
  
  // Name Input or Submission Status (centered, below columns)
  textAlign(CENTER);
  textSize(20);
  let inputY = height - 150;
  
  if (!scoreSubmitted) {
    if (!isEnteringName) {
      fill(200);
      text("Click here to enter your name for the leaderboard", width/2, inputY);
      
      if (mouseIsPressed && 
          mouseY > inputY - 20 && 
          mouseY < inputY + 20 && 
          mouseX > width/2 - 200 && 
          mouseX < width/2 + 200) {
        isEnteringName = true;
      }
    } else {
      // Input box background
      fill(30);
      rect(width/2 - 100, inputY - 25, 200, 40, 5);
      // Input text
      fill(255);
      text(playerName + (frameCount % 60 < 30 ? "|" : ""), width/2, inputY);
    }
  } else {
    fill(0, 255, 0);
    text("Score submitted!", width/2, inputY);
  }
  
  // Play Again button
  let buttonY = height - 80;
  let buttonWidth = 200;
  let buttonHeight = 50;
  let isHovered = mouseX > width/2 - buttonWidth/2 && 
                  mouseX < width/2 + buttonWidth/2 && 
                  mouseY > buttonY && 
                  mouseY < buttonY + buttonHeight;
  
  // Button background with rounded corners
  stroke(200, 0, 0);
  strokeWeight(2);
  fill(isHovered ? color(100, 0, 0) : color(50, 0, 0));
  rect(width/2 - buttonWidth/2, buttonY, buttonWidth, buttonHeight, 10);
  
  // Button text
  fill(255);
  noStroke();
  textSize(24);
  text("PLAY AGAIN", width/2, buttonY + 32);
}

// Update keyPressed function to handle score submission
function keyPressed() {
  // Handle name input during game over
  if (gameOver && isEnteringName && !scoreSubmitted) {
    if (keyCode === ENTER || keyCode === RETURN) {
      if (playerName.trim().length > 0) {
        isEnteringName = false;
        scoreSubmitted = true;
        // Submit score to leaderboard
        submitScore(playerName, score, survivalTime, level, killCount).then(() => {
          updateLeaderboard(); // Refresh leaderboard data
        });
      }
    } else if (keyCode === BACKSPACE) {
      playerName = playerName.slice(0, -1);
    }
    return;
  }

  // Dash on spacebar
  if (keyCode === 32) { // Space
    if (gameOver) {
      // Return to title screen
      titleScreen = true;
      gameOver = false;
    } else if (!upgradeScreen && millis() - player.lastDashTime > player.dashCooldown) {
      player.isDashing = true;
      player.dashStartTime = millis();
      player.lastDashTime = millis();
      player.dashDirection = player.vel.mag() > 0 ? player.vel.copy().normalize() : player.facing.copy();
      player.vel = player.dashDirection.copy().mult(player.dashSpeed);
      
      // Dash effect
      createParticles(player.pos.x, player.pos.y, 20, [100, 100, 255], 8);
    }
  }
}

function keyTyped() {
  // Handle name input during game over
  if (gameOver && isEnteringName && playerName.length < 15) {
    // Only allow letters, numbers, and basic punctuation
    if (/^[a-zA-Z0-9 _-]$/.test(key)) {
      playerName += key;
    }
  }
}

// Add to resetGame function
function resetGame() {
  player = null;
  enemies = [];
  pickups = [];
  projectiles = [];
  particles = [];
  gameOver = false;
  survivalTime = 0;
  startTime = millis();
  lastSpawnTime = 0;
  score = 0;
  level = 1;
  experience = 0;
  experienceToNextLevel = 100;
  upgradeScreen = false;
  killCount = 0;
  waveNumber = 1;
  difficultyMultiplier = 1;
  upgradeHistory = [];
  playerName = "";
  isEnteringName = false;
  scoreSubmitted = false; // Reset score submitted flag
  
  // Clear weapon effects
  if (window.weaponEffects) {
    window.weaponEffects = [];
  }
  
  // Reset weapons
  for (let weapon of weapons) {
    if (weapon.name === "Sword") {
      weapon.level = 1;
    } else {
      weapon.level = 0;
    }
    weapon.damage = weapon.name === "Sword" ? 10 :
                   weapon.name === "Throwing Knife" ? 5 :
                   weapon.name === "Whip" ? 8 : 15;
    weapon.range = weapon.name === "Sword" ? 80 :
                  weapon.name === "Throwing Knife" ? 1000 :
                  weapon.name === "Whip" ? 150 :
                  weapon.name === "Magic Orb" ? Infinity : 180;
    weapon.cooldown = weapon.name === "Sword" ? 800 :
                     weapon.name === "Throwing Knife" ? 1000 :
                     weapon.name === "Whip" ? 1200 : 2000;
    weapon.lastUseTime = 0;
  }
  
  setup();
}

function drawTitleScreen() {
  // Dark background with pentagram
  background(10);
  
  // Add subtle pentagram pattern
  push();
  stroke(30, 0, 0);
  strokeWeight(1);
  noFill();
  translate(width/2, height/2);
  for(let i = 0; i < 5; i++) {
    let angle = TWO_PI * i / 5 - HALF_PI;
    let x = cos(angle) * width * 0.4;
    let y = sin(angle) * height * 0.4;
    line(0, 0, x, y);
  }
  pop();

  if (showingLeaderboard) {
    drawLeaderboardScreen();
    return;
  }
  
  // Title
  textAlign(CENTER, CENTER);
  textSize(64);
  fill(150, 0, 0);
  text("DEMON", width/2, height/3 - 40);
  textSize(48);
  fill(200, 0, 0);
  text("SURVIVORS", width/2, height/3 + 20);
  
  // Description
  textSize(18);
  fill(150);
  text("Endless hordes of demons hunt you through the night.", width/2, height/2);
  text("How long can you survive their relentless pursuit?", width/2, height/2 + 30);
  
  // Play button
  let buttonWidth = 200;
  let buttonHeight = 60;
  let buttonX = width/2 - buttonWidth/2;
  let buttonY = height * 0.7;
  
  // Check if mouse is over play button
  let isPlayHovered = mouseX > buttonX && mouseX < buttonX + buttonWidth &&
                     mouseY > buttonY && mouseY < buttonY + buttonHeight;
  
  // Draw play button
  stroke(200, 0, 0);
  strokeWeight(2);
  fill(isPlayHovered ? color(100, 0, 0) : color(50, 0, 0));
  rect(buttonX, buttonY, buttonWidth, buttonHeight, 10);
  
  // Play button text
  textSize(24);
  fill(255);
  noStroke();
  text("PLAY", width/2, buttonY + buttonHeight/2);

  // Leaderboard button
  let leaderboardButtonWidth = 180;
  let leaderboardButtonHeight = 40;
  let leaderboardButtonX = width/2 - leaderboardButtonWidth/2;
  let leaderboardButtonY = buttonY + buttonHeight + 20;
  
  // Check if mouse is over leaderboard button
  let isLeaderboardHovered = mouseX > leaderboardButtonX && mouseX < leaderboardButtonX + leaderboardButtonWidth &&
                            mouseY > leaderboardButtonY && mouseY < leaderboardButtonY + leaderboardButtonHeight;
  
  // Draw leaderboard button
  stroke(150, 0, 0);
  strokeWeight(2);
  fill(isLeaderboardHovered ? color(80, 0, 0) : color(40, 0, 0));
  rect(leaderboardButtonX, leaderboardButtonY, leaderboardButtonWidth, leaderboardButtonHeight, 8);
  
  // Leaderboard button text
  textSize(18);
  fill(200);
  noStroke();
  text("LEADERBOARD", width/2, leaderboardButtonY + leaderboardButtonHeight/2);
}

function drawLeaderboardScreen() {
  // Title
  textAlign(CENTER, CENTER);
  textSize(48);
  fill(200, 0, 0);
  text("LEADERBOARD", width/2, 100);
  
  // Draw the leaderboard
  drawLeaderboard(width/2 - 150, 160);
  
  // Back button
  let buttonWidth = 160;
  let buttonHeight = 40;
  let buttonX = width/2 - buttonWidth/2;
  let buttonY = height - 100;
  
  // Check if mouse is over button
  let isHovered = mouseX > buttonX && mouseX < buttonX + buttonWidth &&
                  mouseY > buttonY && mouseY < buttonY + buttonHeight;
  
  // Draw button
  stroke(150, 0, 0);
  strokeWeight(2);
  fill(isHovered ? color(80, 0, 0) : color(40, 0, 0));
  rect(buttonX, buttonY, buttonWidth, buttonHeight, 8);
  
  // Button text - properly centered
  textAlign(CENTER, CENTER);
  textSize(18);
  fill(200);
  noStroke();
  text("BACK", width/2, buttonY + buttonHeight/2);
}

// Update mousePressed function to handle new leaderboard button
function mousePressed() {
  if (titleScreen) {
    if (showingLeaderboard) {
      // Check if back button is clicked
      let buttonWidth = 160;
      let buttonHeight = 40;
      let buttonX = width/2 - buttonWidth/2;
      let buttonY = height - 100;
      
      if (mouseX > buttonX && mouseX < buttonX + buttonWidth &&
          mouseY > buttonY && mouseY < buttonY + buttonHeight) {
        showingLeaderboard = false;
      }
      return;
    }

    // Check if play button is clicked
    let buttonWidth = 200;
    let buttonHeight = 60;
    let buttonX = width/2 - buttonWidth/2;
    let buttonY = height * 0.7;
    
    if (mouseX > buttonX && mouseX < buttonX + buttonWidth &&
        mouseY > buttonY && mouseY < buttonY + buttonHeight) {
      titleScreen = false;
      resetGame();
      return;
    }

    // Check if leaderboard button is clicked
    let leaderboardButtonWidth = 180;
    let leaderboardButtonHeight = 40;
    let leaderboardButtonX = width/2 - leaderboardButtonWidth/2;
    let leaderboardButtonY = buttonY + buttonHeight + 20;
    
    if (mouseX > leaderboardButtonX && mouseX < leaderboardButtonX + leaderboardButtonWidth &&
        mouseY > leaderboardButtonY && mouseY < leaderboardButtonY + leaderboardButtonHeight) {
      showingLeaderboard = true;
      updateLeaderboard(); // Refresh leaderboard data
      return;
    }
  }

  if (gameOver) {
    // Check if replay button is clicked
    let buttonY = height/2 + 220;
    let buttonWidth = 200;
    let buttonHeight = 40;
    if (mouseX > width/2 - buttonWidth/2 && 
        mouseX < width/2 + buttonWidth/2 && 
        mouseY > buttonY && 
        mouseY < buttonY + buttonHeight) {
      titleScreen = true;
      gameOver = false;
      return;
    }
  }

  if (upgradeScreen) {
    for (let i = 0; i < upgradeOptions.length; i++) {
      let y = 220 + i * 120;
      if (mouseX > width/2 - 150 && mouseX < width/2 + 150 && 
          mouseY > y - 40 && mouseY < y + 40) {
        // Store the upgrade in history
        upgradeHistory.push({
          name: upgradeOptions[i].name,
          description: upgradeOptions[i].description,
          level: level
        });
        // Apply the selected upgrade
        upgradeOptions[i].apply();
        upgradeScreen = false;
        break;
      }
    }
  }
}