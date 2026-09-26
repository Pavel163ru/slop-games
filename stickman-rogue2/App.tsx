import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  GameStatus, 
  Player, 
  Enemy, 
  Bullet, 
  Particle, 
  Pickup, 
  StatType, 
  UpgradeOption,
  GameStats,
  WeaponType,
  SaveData,
  GameSettings,
  ShopItem,
  PermanentStats
} from './types';
import { 
  CANVAS_WIDTH, 
  CANVAS_HEIGHT, 
  PLAYER_BASE_STATS, 
  ENEMY_BASE_STATS, 
  BOSS_BASE_STATS,
  BULLET_RADIUS, 
  XP_PICKUP_RADIUS,
  MONEY_PICKUP_RADIUS,
  MONEY_DROP_CHANCE,
  BOSS_MONEY_DROP,
  PERMANENT_SHOP_ITEMS,
  ROUND_MERCHANT_ITEMS,
  UPGRADE_TYPES,
  WEAPON_DEFS,
  STORAGE_KEY,
  DEFAULT_SETTINGS
} from './constants';
import { GameOverlay } from './components/GameOverlay';
import { UpgradeCard } from './components/UpgradeCard';
import { generateDeathEulogy } from './services/geminiService';

const App: React.FC = () => {
  // --- Refs for Mutable Game State (Performance) ---
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  
  const initialPermanentStats: PermanentStats = {
    baseDamage: 0,
    maxHp: 0,
    speed: 0,
    fireRateMult: 0
  };

  // Game Entities Refs
  const playerRef = useRef<Player>({ 
    ...PLAYER_BASE_STATS,
    hp: PLAYER_BASE_STATS.maxHp, 
    x: CANVAS_WIDTH / 2, 
    y: CANVAS_HEIGHT / 2, 
    id: 'player', 
    vx: 0, 
    vy: 0,
    weapons: [WEAPON_DEFS[WeaponType.PISTOL]],
    currentWeaponIndex: 0,
    lastFired: 0,
    xp: 0,
    level: 1,
    xpToNextLevel: 100,
    money: 0,
    permanentStats: initialPermanentStats
  });
  
  const enemiesRef = useRef<Enemy[]>([]);
  const bulletsRef = useRef<Bullet[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const pickupsRef = useRef<Pickup[]>([]);
  const inputRef = useRef({ w: false, a: false, s: false, d: false, q: false, mouseX: 0, mouseY: 0, mouseDown: false });
  const statsRef = useRef<GameStats>({ kills: 0, timeSurvived: 0, levelReached: 1, round: 1 });
  
  // Round System Refs
  const roundTimeRef = useRef(0);
  const roundStartStatsRef = useRef<{kills: number, time: number}>({ kills: 0, time: 0 });
  const isBossActiveRef = useRef(false);

  // Timers
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  // Switch debouncing
  const lastSwitchRef = useRef(0);

  // --- React State for UI ---
  const [status, setStatus] = useState<GameStatus>(GameStatus.MENU);
  const statusRef = useRef<GameStatus>(GameStatus.MENU);
  
  // Settings State
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);

  const [uiPlayerState, setUiPlayerState] = useState<Player>(playerRef.current);
  const [upgradeOptions, setUpgradeOptions] = useState<UpgradeOption[]>([]);
  const [roundShopItems, setRoundShopItems] = useState<ShopItem[]>([]);
  
  const [gameOverEulogy, setGameOverEulogy] = useState<string>("");
  const [loadingEulogy, setLoadingEulogy] = useState(false);

  // Save System State
  const [lastSaveDate, setLastSaveDate] = useState<string | null>(null);

  // Sync status state to ref
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // --- Save / Load Logic ---

  const checkForSave = () => {
    try {
      const savedData = localStorage.getItem(STORAGE_KEY);
      if (savedData) {
        const parsed: SaveData = JSON.parse(savedData);
        const date = new Date(parsed.timestamp);
        setLastSaveDate(date.toLocaleString());
        if (parsed.settings) setSettings(parsed.settings);
      } else {
        setLastSaveDate(null);
      }
    } catch (e) {
      console.error("Failed to parse save data", e);
      setLastSaveDate(null);
    }
  };

  const saveGame = () => {
    const data: SaveData = {
      player: playerRef.current,
      stats: statsRef.current,
      enemies: enemiesRef.current,
      pickups: pickupsRef.current,
      settings: settings,
      roundTime: roundTimeRef.current,
      timestamp: Date.now(),
      status: statusRef.current,
      roundShopItems: roundShopItems
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    setLastSaveDate(new Date().toLocaleString());
  };

  const loadGame = () => {
    try {
      const savedData = localStorage.getItem(STORAGE_KEY);
      if (!savedData) return;

      const parsed: SaveData = JSON.parse(savedData);
      
      // Restore refs
      playerRef.current = parsed.player;
      // Ensure permanentStats object exists for legacy saves
      if (!playerRef.current.permanentStats) {
         playerRef.current.permanentStats = { baseDamage: 0, maxHp: 0, speed: 0, fireRateMult: 0 };
      }

      statsRef.current = parsed.stats;
      enemiesRef.current = parsed.enemies;
      pickupsRef.current = parsed.pickups;
      roundTimeRef.current = parsed.roundTime || 0;
      
      if (parsed.settings) setSettings(parsed.settings);
      if (parsed.roundShopItems) setRoundShopItems(parsed.roundShopItems);
      
      roundStartStatsRef.current = {
        kills: parsed.stats.kills, 
        time: parsed.stats.timeSurvived
      };

      isBossActiveRef.current = parsed.enemies.some(e => e.type === 'BOSS');

      bulletsRef.current = [];
      particlesRef.current = [];
      frameCountRef.current = 0;
      lastTimeRef.current = performance.now();

      playerRef.current.lastFired = -100; 
      lastSwitchRef.current = -100;

      const targetStatus = (parsed.status === GameStatus.SANCTUARY || parsed.status === GameStatus.ROUND_OVER) 
          ? parsed.status 
          : GameStatus.PLAYING;

      statusRef.current = targetStatus;
      setStatus(targetStatus);
      setUiPlayerState({...playerRef.current});
      
    } catch (e) {
      console.error("Failed to load save", e);
      alert("Save file corrupted.");
      deleteSave();
    }
  };

  const deleteSave = () => {
    localStorage.removeItem(STORAGE_KEY);
    setLastSaveDate(null);
  };

  useEffect(() => {
    checkForSave();
  }, []);

  // --- Helper Functions ---

  const spawnBoss = () => {
    const difficultyMultiplier = 1 + (statsRef.current.round * 0.6) + (statsRef.current.levelReached * 0.1);
    
    enemiesRef.current.push({
      id: 'BOSS_' + Math.random().toString(36).substr(2, 9),
      x: CANVAS_WIDTH / 2,
      y: -100,
      radius: BOSS_BASE_STATS.radius,
      color: BOSS_BASE_STATS.color,
      vx: 0,
      vy: 0,
      speed: BOSS_BASE_STATS.speed,
      hp: BOSS_BASE_STATS.hp * difficultyMultiplier,
      maxHp: BOSS_BASE_STATS.hp * difficultyMultiplier,
      damage: BOSS_BASE_STATS.damage * difficultyMultiplier,
      type: 'BOSS'
    });
    
    isBossActiveRef.current = true;
    enemiesRef.current = enemiesRef.current.filter(e => e.type === 'BOSS' || Math.random() > 0.5);
  };

  const spawnEnemy = () => {
    if (isBossActiveRef.current) return;

    const edge = Math.floor(Math.random() * 4); 
    let x = 0, y = 0;
    const buffer = 50;

    if (edge === 0) { x = Math.random() * CANVAS_WIDTH; y = -buffer; }
    else if (edge === 1) { x = CANVAS_WIDTH + buffer; y = Math.random() * CANVAS_HEIGHT; }
    else if (edge === 2) { x = Math.random() * CANVAS_WIDTH; y = CANVAS_HEIGHT + buffer; }
    else { x = -buffer; y = Math.random() * CANVAS_HEIGHT; }

    const difficultyMultiplier = 1 + (statsRef.current.timeSurvived / 60) * 0.5; 
    const isFast = Math.random() < 0.1 * difficultyMultiplier;
    const isTank = Math.random() < 0.05 * difficultyMultiplier;

    const baseHp = ENEMY_BASE_STATS.hp * difficultyMultiplier;

    enemiesRef.current.push({
      id: Math.random().toString(36).substr(2, 9),
      x,
      y,
      radius: isTank ? 15 : 10,
      color: isFast ? '#ef4444' : isTank ? '#a855f7' : ENEMY_BASE_STATS.color,
      vx: 0,
      vy: 0,
      speed: (isFast ? ENEMY_BASE_STATS.speed * 1.5 : isTank ? ENEMY_BASE_STATS.speed * 0.7 : ENEMY_BASE_STATS.speed),
      hp: isTank ? baseHp * 3 : isFast ? baseHp * 0.6 : baseHp,
      maxHp: isTank ? baseHp * 3 : isFast ? baseHp * 0.6 : baseHp,
      damage: ENEMY_BASE_STATS.damage,
      type: isFast ? 'FAST' : isTank ? 'TANK' : 'NORMAL'
    });
  };

  const createParticles = (x: number, y: number, color: string, count: number) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 2 + 1;
      particlesRef.current.push({
        id: Math.random().toString(),
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 30 + Math.random() * 20,
        maxLife: 50,
        radius: Math.random() * 3 + 1,
        color
      });
    }
  };

  const generateRoundShop = () => {
    // Pick 3 random items from consumable list
    const shuffled = [...ROUND_MERCHANT_ITEMS].sort(() => 0.5 - Math.random());
    setRoundShopItems(shuffled.slice(0, 3));
  };

  const buyItem = (item: ShopItem) => {
    if (playerRef.current.money >= item.cost) {
      playerRef.current.money -= item.cost;
      const p = playerRef.current;

      if (item.category === 'PERMANENT') {
        // Sanctuaries Shop
        switch(item.type) {
            case StatType.DAMAGE: p.permanentStats.baseDamage += item.value; break;
            case StatType.SPEED: p.permanentStats.speed += item.value; break;
            case StatType.MAX_HP: p.permanentStats.maxHp += item.value; break;
            case StatType.FIRE_RATE: p.permanentStats.fireRateMult += item.value; break;
        }
      } else {
        // Round Merchant
        if (item.type === 'HEAL') {
            p.hp = Math.min(p.hp + item.value, p.maxHp);
        } else {
             switch(item.type) {
              case StatType.DAMAGE: p.baseDamage += item.value; break;
              case StatType.SPEED: p.speed += item.value; break;
              case StatType.MAX_HP: 
                p.maxHp += item.value; 
                p.hp += item.value; 
                break;
              case StatType.FIRE_RATE: p.baseFireRateMult += item.value; break;
            }
        }
        
        // Remove purchased item from round shop to prevent spamming cheap heals if desired, 
        // OR keep it. Let's keep it for now so they can buy multiple potions.
      }
      
      setUiPlayerState({...playerRef.current});
      saveGame();
    }
  };

  // --- Game Loop ---

  const update = (deltaTime: number) => {
    if (statusRef.current !== GameStatus.PLAYING) return;

    const player = playerRef.current;
    const input = inputRef.current;

    statsRef.current.timeSurvived += deltaTime;
    roundTimeRef.current += deltaTime;
    frameCountRef.current++;

    if (roundTimeRef.current >= settings.roundDuration) {
      if (!isBossActiveRef.current) {
        spawnBoss();
      }
    }

    if (input.q && frameCountRef.current - lastSwitchRef.current > 20) {
        player.currentWeaponIndex = (player.currentWeaponIndex + 1) % player.weapons.length;
        lastSwitchRef.current = frameCountRef.current;
    }

    player.vx = 0;
    player.vy = 0;
    if (input.w) player.vy -= player.speed;
    if (input.s) player.vy += player.speed;
    if (input.a) player.vx -= player.speed;
    if (input.d) player.vx += player.speed;

    player.x += player.vx;
    player.y += player.vy;

    player.x = Math.max(player.radius, Math.min(CANVAS_WIDTH - player.radius, player.x));
    player.y = Math.max(player.radius, Math.min(CANVAS_HEIGHT - player.radius, player.y));

    const currentWeapon = player.weapons[player.currentWeaponIndex];
    
    let closestEnemy: Enemy | null = null;
    let minDistSq = Infinity;
    
    for (const enemy of enemiesRef.current) {
      const dx = enemy.x - player.x;
      const dy = enemy.y - player.y;
      const distSq = dx * dx + dy * dy;
      if (distSq < minDistSq) {
        minDistSq = distSq;
        closestEnemy = enemy;
      }
    }

    const adjustedFireRate = Math.max(5, currentWeapon.fireRate / player.baseFireRateMult);

    if (closestEnemy && frameCountRef.current - player.lastFired >= adjustedFireRate) {
      const dx = closestEnemy.x - player.x;
      const dy = closestEnemy.y - player.y;
      const baseAngle = Math.atan2(dy, dx);
      
      for (let i = 0; i < currentWeapon.projectileCount; i++) {
        const spreadOffset = (Math.random() - 0.5) * currentWeapon.spread;
        const finalAngle = baseAngle + spreadOffset;

        bulletsRef.current.push({
          id: Math.random().toString(),
          x: player.x,
          y: player.y,
          vx: Math.cos(finalAngle) * currentWeapon.speed,
          vy: Math.sin(finalAngle) * currentWeapon.speed,
          radius: currentWeapon.type === WeaponType.SNIPER ? 5 : BULLET_RADIUS,
          color: currentWeapon.color, 
          damage: player.baseDamage * currentWeapon.damageMult,
          angle: finalAngle,
          piercing: currentWeapon.piercing,
          hitIds: []
        });
      }

      player.lastFired = frameCountRef.current;
    }

    bulletsRef.current = bulletsRef.current.filter(b => {
      b.x += b.vx;
      b.y += b.vy;
      return b.x > 0 && b.x < CANVAS_WIDTH && b.y > 0 && b.y < CANVAS_HEIGHT;
    });

    enemiesRef.current = enemiesRef.current.filter(enemy => {
      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      const dist = Math.hypot(dx, dy);
      
      if (dist > 0) {
        enemy.x += (dx / dist) * enemy.speed;
        enemy.y += (dy / dist) * enemy.speed;
      }

      for (let i = bulletsRef.current.length - 1; i >= 0; i--) {
        const b = bulletsRef.current[i];
        if (b.hitIds.includes(enemy.id)) continue;

        const distB = Math.hypot(b.x - enemy.x, b.y - enemy.y);
        if (distB < enemy.radius + b.radius) {
          enemy.hp -= b.damage;
          createParticles(enemy.x, enemy.y, enemy.color, 3);
          
          b.hitIds.push(enemy.id);
          if (b.piercing > 0) {
              b.piercing--;
              b.damage *= 0.8;
          } else {
              bulletsRef.current.splice(i, 1);
          }

          if (enemy.hp <= 0) {
            createParticles(enemy.x, enemy.y, enemy.color, 15);
            
            const isBoss = enemy.type === 'BOSS';
            
            pickupsRef.current.push({
              id: Math.random().toString(),
              x: enemy.x,
              y: enemy.y,
              radius: isBoss ? XP_PICKUP_RADIUS * 3 : XP_PICKUP_RADIUS,
              color: isBoss ? '#fbbf24' : '#3b82f6', 
              vx: 0, vy: 0,
              value: isBoss ? 1000 : 10 * (enemy.type === 'TANK' ? 3 : 1),
              type: 'XP'
            });

            if (isBoss || Math.random() < MONEY_DROP_CHANCE) {
               pickupsRef.current.push({
                 id: Math.random().toString(),
                 x: enemy.x + (Math.random() * 20 - 10),
                 y: enemy.y + (Math.random() * 20 - 10),
                 radius: isBoss ? MONEY_PICKUP_RADIUS * 2 : MONEY_PICKUP_RADIUS,
                 color: '#FCD34D', 
                 vx: 0, vy: 0,
                 value: isBoss ? BOSS_MONEY_DROP : Math.floor(Math.random() * 40) + 10,
                 type: 'MONEY'
               });
            }
            
            statsRef.current.kills++;
            
            if (isBoss) {
              isBossActiveRef.current = false;
              statusRef.current = GameStatus.ROUND_OVER;
              setStatus(GameStatus.ROUND_OVER);
              generateRoundShop(); 
              saveGame();
              return false; 
            }
            
            return false; 
          }
        }
      }

      const distP = Math.hypot(player.x - enemy.x, player.y - enemy.y);
      if (distP < player.radius + enemy.radius) {
        player.hp -= 0.5;
        if (player.hp <= 0) {
          handleGameOver();
        }
      }

      return true;
    });

    pickupsRef.current = pickupsRef.current.filter(p => {
      const dx = player.x - p.x;
      const dy = player.y - p.y;
      const dist = Math.hypot(dx, dy);
      
      if (dist < 150) {
        p.x += (dx / dist) * 5;
        p.y += (dy / dist) * 5;
      }

      if (dist < player.radius + p.radius) {
        if (p.type === 'XP') {
          player.xp += p.value;
          if (player.xp >= player.xpToNextLevel) {
            handleLevelUp();
          }
        } else if (p.type === 'MONEY') {
           player.money += p.value;
        }
        return false;
      }
      return true;
    });

    particlesRef.current = particlesRef.current.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      return p.life > 0;
    });

    const spawnRate = Math.max(20, 60 - Math.floor(statsRef.current.timeSurvived / 10));
    if (frameCountRef.current % spawnRate === 0) {
      spawnEnemy();
    }

    setUiPlayerState({ ...player });
  };

  const draw = (ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.strokeStyle = '#1f2937';
    ctx.lineWidth = 1;
    const gridSize = 50;
    for(let x=0; x<CANVAS_WIDTH; x+=gridSize) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x, CANVAS_HEIGHT); ctx.stroke(); }
    for(let y=0; y<CANVAS_HEIGHT; y+=gridSize) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(CANVAS_WIDTH, y); ctx.stroke(); }

    pickupsRef.current.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      if (p.type === 'MONEY') {
          ctx.fillStyle = '#FCD34D';
          ctx.shadowColor = '#F59E0B';
      } else {
          ctx.fillStyle = p.type === 'XP' ? (p.value > 100 ? '#fbbf24' : '#60a5fa') : '#f87171';
          ctx.shadowColor = p.color;
      }
      ctx.fill();
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    particlesRef.current.forEach(p => {
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
      ctx.globalAlpha = 1;
    });

    enemiesRef.current.forEach(e => {
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
      ctx.fillStyle = e.color;
      ctx.fill();
      
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.arc(e.x - (e.radius/4), e.y - (e.radius/4), 2, 0, Math.PI * 2);
      ctx.arc(e.x + (e.radius/4), e.y - (e.radius/4), 2, 0, Math.PI * 2);
      ctx.fill();

      if (e.type === 'BOSS') {
        ctx.fillStyle = 'red';
        ctx.fillRect(e.x - 20, e.y - e.radius - 10, 40, 4);
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(e.x - 20, e.y - e.radius - 10, 40 * (e.hp / e.maxHp), 4);
      }
    });

    bulletsRef.current.forEach(b => {
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fillStyle = b.color;
      ctx.fill();
    });

    const p = playerRef.current;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();
    
    let aimAngle = 0;
    let closestEnemy: Enemy | null = null;
    let minDistSq = Infinity;
    for (const enemy of enemiesRef.current) {
        const dx = enemy.x - p.x;
        const dy = enemy.y - p.y;
        const distSq = dx*dx + dy*dy;
        if(distSq < minDistSq){
            minDistSq = distSq;
            closestEnemy = enemy;
        }
    }

    if (closestEnemy) {
        aimAngle = Math.atan2(closestEnemy.y - p.y, closestEnemy.x - p.x);
    } else {
        if (Math.abs(p.vx) > 0.1 || Math.abs(p.vy) > 0.1) {
             aimAngle = Math.atan2(p.vy, p.vx);
        } else {
             aimAngle = Math.atan2(inputRef.current.mouseY - p.y, inputRef.current.mouseX - p.x);
        }
    }

    const gunLength = 20;
    ctx.strokeStyle = closestEnemy ? '#ef4444' : 'white'; 
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + Math.cos(aimAngle) * gunLength, p.y + Math.sin(aimAngle) * gunLength);
    ctx.stroke();
  };

  const tick = (time: number) => {
    const deltaTime = (time - lastTimeRef.current) / 1000;
    lastTimeRef.current = time;

    update(deltaTime);
    
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) draw(ctx);
    }

    requestRef.current = requestAnimationFrame(tick);
  };

  // --- Game Logic Handlers ---

  const startNewRun = () => {
    // Calculate starting stats based on permanent upgrades
    const perm = playerRef.current.permanentStats;
    const startingMaxHp = PLAYER_BASE_STATS.maxHp + perm.maxHp;
    const startingDamage = PLAYER_BASE_STATS.baseDamage + perm.baseDamage;
    const startingSpeed = PLAYER_BASE_STATS.speed + perm.speed;
    const startingFireRateMult = PLAYER_BASE_STATS.baseFireRateMult + perm.fireRateMult;

    playerRef.current = { 
      ...PLAYER_BASE_STATS, 
      hp: startingMaxHp,
      maxHp: startingMaxHp,
      baseDamage: startingDamage,
      speed: startingSpeed,
      baseFireRateMult: startingFireRateMult,
      x: CANVAS_WIDTH/2, 
      y: CANVAS_HEIGHT/2, 
      id: 'player', 
      vx:0, 
      vy:0, 
      weapons: [WEAPON_DEFS[WeaponType.PISTOL]],
      currentWeaponIndex: 0,
      lastFired:0, 
      xp:0, 
      level:1, 
      xpToNextLevel: 100,
      money: playerRef.current.money, // Keep money
      permanentStats: perm
    };
    enemiesRef.current = [];
    bulletsRef.current = [];
    particlesRef.current = [];
    pickupsRef.current = [];
    
    statsRef.current = { kills: 0, timeSurvived: 0, levelReached: 1, round: 1 };
    roundTimeRef.current = 0;
    roundStartStatsRef.current = { kills: 0, time: 0 };
    isBossActiveRef.current = false;

    frameCountRef.current = 0;
    lastSwitchRef.current = 0;
    
    statusRef.current = GameStatus.PLAYING;
    setStatus(GameStatus.PLAYING);
    lastTimeRef.current = performance.now();
    
    saveGame();
  };

  const enterSanctuary = () => {
      // Reset run progress but keep meta data
      // We effectively do this by just resetting UI status.
      // When we click "Deploy" (startNewRun), the reset happens.
      // But to be safe, let's clear the board now.
      enemiesRef.current = [];
      bulletsRef.current = [];
      pickupsRef.current = [];
      
      statusRef.current = GameStatus.SANCTUARY;
      setStatus(GameStatus.SANCTUARY);
      saveGame();
  };

  const startNextRound = () => {
    statsRef.current.round++;
    roundTimeRef.current = 0;
    roundStartStatsRef.current = { 
        kills: statsRef.current.kills, 
        time: statsRef.current.timeSurvived 
    };
    isBossActiveRef.current = false;
    
    // Save game at start of next round
    saveGame();

    statusRef.current = GameStatus.PLAYING;
    setStatus(GameStatus.PLAYING);
    lastTimeRef.current = performance.now();
  };

  const handleLevelUp = () => {
    statusRef.current = GameStatus.LEVEL_UP;
    setStatus(GameStatus.LEVEL_UP);
    
    const currentWeaponTypes = playerRef.current.weapons.map(w => w.type);
    const availableNewWeapons = Object.values(WEAPON_DEFS).filter(w => !currentWeaponTypes.includes(w.type));

    const options: UpgradeOption[] = Array(3).fill(null).map(() => {
      if (availableNewWeapons.length > 0 && Math.random() < 0.2) {
         const newWeapon = availableNewWeapons[Math.floor(Math.random() * availableNewWeapons.length)];
         return {
             type: StatType.WEAPON_UNLOCK,
             value: 0,
             rarity: 'LEGENDARY',
             name: 'New Weapon',
             description: 'Unlock new weapon',
             flavorLoaded: false,
             weaponData: newWeapon
         };
      }

      const type = UPGRADE_TYPES.filter(t => t !== StatType.WEAPON_UNLOCK)[Math.floor(Math.random() * (UPGRADE_TYPES.length - 1))] as StatType;
      const rarityRand = Math.random();
      const rarity = rarityRand > 0.9 ? 'LEGENDARY' : rarityRand > 0.6 ? 'RARE' : 'COMMON';
      
      let value = 0;
      switch(type) {
        case StatType.DAMAGE: value = 5; break;
        case StatType.SPEED: value = 0.5; break;
        case StatType.MAX_HP: value = 20; break;
        case StatType.FIRE_RATE: value = 0.1; break; 
      }
      
      const multiplier = rarity === 'LEGENDARY' ? 3 : rarity === 'RARE' ? 1.5 : 1;
      
      return {
        type,
        value: Math.round(value * multiplier * 100) / 100,
        rarity,
        name: "Loading...",
        description: "...",
        flavorLoaded: false
      };
    });

    setUpgradeOptions(options);
  };

  const applyUpgrade = useCallback((option: UpgradeOption) => {
    const p = playerRef.current;
    
    if (option.type === StatType.WEAPON_UNLOCK && option.weaponData) {
        p.weapons.push(option.weaponData);
        p.currentWeaponIndex = p.weapons.length - 1;
    } else {
        switch(option.type) {
          case StatType.DAMAGE: p.baseDamage += option.value; break;
          case StatType.SPEED: p.speed += option.value; break;
          case StatType.MAX_HP: p.maxHp += option.value; p.hp += option.value; break;
          case StatType.FIRE_RATE: p.baseFireRateMult += option.value; break;
        }
    }
    
    p.level++;
    p.xp = 0;
    p.xpToNextLevel = Math.floor(p.xpToNextLevel * 1.2);
    statsRef.current.levelReached = p.level;

    statusRef.current = GameStatus.PLAYING;
    setStatus(GameStatus.PLAYING);
    lastTimeRef.current = performance.now();
  }, []);

  const handleGameOver = async () => {
    statusRef.current = GameStatus.GAME_OVER;
    setStatus(GameStatus.GAME_OVER);
    
    // On death, we usually lose the run. 
    // For this implementation, we allow restart from Sanctuary (keeping perm upgrades).
    // So we don't delete the full save, just invalidating the "active run".
    // Actually, simplest to just let them go to menu.
    deleteSave();
    
    setLoadingEulogy(true);
    const eulogy = await generateDeathEulogy(statsRef.current);
    setGameOverEulogy(eulogy);
    setLoadingEulogy(false);
  };

  const quitToMenu = () => {
    saveGame();
    statusRef.current = GameStatus.MENU;
    setStatus(GameStatus.MENU);
    checkForSave();
  };

  const resumeGame = () => {
    statusRef.current = GameStatus.PLAYING;
    setStatus(GameStatus.PLAYING);
    lastTimeRef.current = performance.now();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'w') inputRef.current.w = true;
      if (k === 'a') inputRef.current.a = true;
      if (k === 's') inputRef.current.s = true;
      if (k === 'd') inputRef.current.d = true;
      if (k === 'q') inputRef.current.q = true;

      if (e.key === 'Escape') {
        if (statusRef.current === GameStatus.PLAYING) {
          statusRef.current = GameStatus.PAUSED;
          setStatus(GameStatus.PAUSED);
          saveGame();
        } else if (statusRef.current === GameStatus.PAUSED) {
          resumeGame();
        }
      }

      if (statusRef.current === GameStatus.LEVEL_UP) {
        const key = parseInt(e.key);
        if (!isNaN(key) && key >= 1 && key <= 3) {
          const index = key - 1;
          if (upgradeOptions[index]) {
            applyUpgrade(upgradeOptions[index]);
          }
        }
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'w') inputRef.current.w = false;
      if (k === 'a') inputRef.current.a = false;
      if (k === 's') inputRef.current.s = false;
      if (k === 'd') inputRef.current.d = false;
      if (k === 'q') inputRef.current.q = false;
    };
    const handleMouseMove = (e: MouseEvent) => {
      inputRef.current.mouseX = e.clientX;
      inputRef.current.mouseY = e.clientY;
    };
    const handleMouseDown = () => inputRef.current.mouseDown = true;
    const handleMouseUp = () => inputRef.current.mouseDown = false;

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    requestRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [settings, upgradeOptions, applyUpgrade]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-gray-900 font-sans select-none">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="block"
      />

      {/* --- SETTINGS OVERLAY --- */}
      {status === GameStatus.SETTINGS && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-50">
          <div className="bg-gray-800 p-8 rounded-xl border border-gray-600 shadow-2xl w-full max-w-md">
            <h2 className="text-3xl font-bold text-white mb-6 text-center">SETTINGS</h2>
            
            <div className="mb-6">
              <label className="block text-gray-400 mb-2 text-sm uppercase tracking-wide">Round Duration (Seconds)</label>
              <div className="flex items-center gap-4">
                <input 
                  type="range" 
                  min="10" 
                  max="120" 
                  step="5"
                  value={settings.roundDuration}
                  onChange={(e) => setSettings(s => ({...s, roundDuration: Number(e.target.value)}))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <span className="text-white font-mono text-xl w-12 text-right">{settings.roundDuration}s</span>
              </div>
            </div>

            <button 
              onClick={() => setStatus(GameStatus.MENU)}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded shadow-lg transition-all"
            >
              SAVE & BACK
            </button>
          </div>
        </div>
      )}

      {/* --- MENU SCREEN --- */}
      {status === GameStatus.MENU && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-50">
          <div className="text-center flex flex-col gap-4">
            <div>
                <h1 className="text-6xl font-black text-white mb-4 tracking-tighter drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]">
                STICKMAN <span className="text-blue-500">ROGUE</span>
                </h1>
                <p className="text-gray-400 mb-8 max-w-md mx-auto">
                Survive the endless waves. Collect Weapons. Mutate. <br/>
                Round duration: <span className="text-blue-400">{settings.roundDuration}s</span>. Boss at end of each round.
                </p>
            </div>
            
            <div className="flex flex-col gap-3 items-center">
                {lastSaveDate && (
                    <button 
                        onClick={loadGame}
                        className="px-8 py-4 w-full md:w-80 bg-green-600 hover:bg-green-500 text-white text-xl font-bold rounded-lg shadow-lg transition-all transform hover:scale-105 border border-green-400 flex flex-col items-center"
                    >
                        <span>CONTINUE GAME</span>
                        <span className="text-xs font-normal opacity-80 mt-1">Saved: {lastSaveDate}</span>
                    </button>
                )}

                <button 
                onClick={startNewRun}
                className="px-8 py-4 w-full md:w-80 bg-blue-600 hover:bg-blue-500 text-white text-xl font-bold rounded-lg shadow-lg transition-all transform hover:scale-105"
                >
                {lastSaveDate ? "NEW RUN" : "START SIMULATION"}
                </button>

                <button 
                onClick={() => setStatus(GameStatus.SETTINGS)}
                className="px-8 py-2 w-full md:w-80 bg-gray-700 hover:bg-gray-600 text-gray-300 font-bold rounded-lg shadow-lg transition-all mt-2"
                >
                SETTINGS
                </button>
            </div>
          </div>
        </div>
      )}

      {/* --- HUD --- */}
      {(status === GameStatus.PLAYING || status === GameStatus.PAUSED) && (
        <div className="absolute inset-0 pointer-events-none">
             <GameOverlay player={uiPlayerState} stats={statsRef.current} />
             <div className="absolute top-4 left-1/2 transform -translate-x-1/2 pointer-events-auto">
                <div className="bg-black/50 px-4 py-2 rounded-full border border-gray-700 text-center backdrop-blur-md">
                    <div className="text-xs text-gray-400 uppercase tracking-widest">Round {statsRef.current.round}</div>
                    <div className={`text-2xl font-mono font-bold ${isBossActiveRef.current ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                         {isBossActiveRef.current ? "BOSS FIGHT" : Math.max(0, (settings.roundDuration - roundTimeRef.current)).toFixed(1)}
                    </div>
                </div>
             </div>
        </div>
      )}

      {/* --- ROUND OVER SCREEN (THE MERCHANT) --- */}
      {status === GameStatus.ROUND_OVER && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md z-50 animate-in zoom-in-95 duration-300">
             <div className="bg-gray-800 p-8 rounded-2xl border border-blue-500/50 text-center w-full max-w-4xl shadow-2xl flex flex-col gap-6">
                
                <div className="flex justify-between items-end border-b border-gray-700 pb-4">
                    <div className="text-left">
                        <h2 className="text-4xl font-black text-white mb-1">ROUND {statsRef.current.round} COMPLETE</h2>
                        <p className="text-blue-400 font-bold tracking-wide">FIELD MERCHANT</p>
                    </div>
                    <div className="text-right">
                        <div className="text-xs text-yellow-500 uppercase tracking-widest">Credits</div>
                        <div className="text-3xl font-mono font-bold text-yellow-400">$ {playerRef.current.money}</div>
                    </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                    {roundShopItems.map((item) => {
                       const canAfford = playerRef.current.money >= item.cost;
                       return (
                           <button
                             key={item.id}
                             disabled={!canAfford}
                             onClick={() => buyItem(item)}
                             className={`flex flex-col justify-between p-4 rounded-lg border-2 transition-all text-left h-40 relative overflow-hidden group ${
                                 canAfford 
                                 ? 'bg-gray-700 hover:bg-gray-600 border-gray-600 hover:border-blue-400 text-white' 
                                 : 'bg-gray-800 border-gray-800 text-gray-500 cursor-not-allowed opacity-60'
                             }`}
                           >
                               <div className="z-10">
                                   <div className="font-bold text-lg mb-1">{item.name}</div>
                                   <div className="text-xs opacity-80">{item.description}</div>
                               </div>
                               <div className={`z-10 font-mono font-bold self-end ${canAfford ? 'text-yellow-400' : 'text-gray-600'}`}>
                                   ${item.cost}
                               </div>
                           </button>
                       );
                    })}
                </div>

                <div className="flex flex-col gap-4 mt-4">
                    <button 
                        onClick={startNextRound}
                        className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white text-xl font-bold rounded-xl shadow-lg transition-all transform hover:scale-105"
                    >
                        CONTINUE TO NEXT ROUND
                    </button>
                    <button 
                        onClick={enterSanctuary}
                        className="w-full py-3 bg-gray-700 hover:bg-yellow-900/50 text-gray-300 hover:text-yellow-200 border border-transparent hover:border-yellow-500 font-bold rounded-xl shadow-lg transition-all"
                    >
                        RETREAT TO SANCTUARY (RESET RUN)
                    </button>
                    <p className="text-xs text-gray-500">Retreating resets Round, Level, and Weapons, but keeps Money and Permanent Upgrades.</p>
                </div>
             </div>
          </div>
      )}

      {/* --- SANCTUARY SCREEN (PERMANENT UPGRADES) --- */}
      {status === GameStatus.SANCTUARY && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/95 backdrop-blur-md z-50 animate-in fade-in duration-500 p-4">
             <div className="text-center mb-4 shrink-0">
                <h2 className="text-5xl font-serif font-bold text-yellow-400 mb-2 tracking-wider drop-shadow-glow">SANCTUARY</h2>
                <p className="text-blue-200 italic">Augment your physiology for future operations.</p>
             </div>

             <div className="bg-gray-800/80 p-6 rounded-2xl border border-yellow-500/30 w-full max-w-5xl shadow-2xl flex flex-col gap-4 max-h-full overflow-hidden">
                <div className="flex justify-between items-center mb-2 border-b border-gray-700 pb-4 shrink-0">
                     <div className="text-left">
                        <div className="text-xs text-gray-400 uppercase">Base Stats (Current)</div>
                        <div className="flex gap-4 text-sm text-gray-300 mt-1">
                            <span>HP: <span className="text-white">{PLAYER_BASE_STATS.maxHp + playerRef.current.permanentStats.maxHp}</span></span>
                            <span>DMG: <span className="text-white">{PLAYER_BASE_STATS.baseDamage + playerRef.current.permanentStats.baseDamage}</span></span>
                            <span>SPD: <span className="text-white">{(PLAYER_BASE_STATS.speed + playerRef.current.permanentStats.speed).toFixed(1)}</span></span>
                        </div>
                     </div>
                     <div className="text-right">
                        <div className="text-xs text-yellow-500 uppercase tracking-widest">Total Credits</div>
                        <div className="text-3xl font-mono font-bold text-yellow-400">$ {playerRef.current.money}</div>
                     </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 overflow-y-auto p-2 min-h-0 flex-1">
                    {PERMANENT_SHOP_ITEMS.map((item) => {
                       const canAfford = playerRef.current.money >= item.cost;
                       return (
                           <button
                             key={item.id}
                             disabled={!canAfford}
                             onClick={() => buyItem(item)}
                             className={`flex flex-col justify-between p-4 rounded-lg border-2 transition-all text-left min-h-[12rem] ${
                                 canAfford 
                                 ? 'bg-gray-700 hover:bg-gray-600 border-gray-600 hover:border-yellow-400 text-white' 
                                 : 'bg-gray-800 border-gray-800 text-gray-500 cursor-not-allowed opacity-60'
                             }`}
                           >
                               <div>
                                   <div className="text-xs text-yellow-500 uppercase mb-1">Permanent Upgrade</div>
                                   <div className="font-bold text-lg leading-tight mb-2">{item.name}</div>
                                   <div className="text-xs opacity-80">{item.description}</div>
                               </div>
                               <div className={`font-mono font-bold self-end ${canAfford ? 'text-yellow-400' : 'text-gray-600'}`}>
                                   ${item.cost}
                               </div>
                           </button>
                       );
                    })}
                </div>

                <div className="border-t border-gray-700 pt-4 mt-0 shrink-0">
                    <button 
                        onClick={startNewRun}
                        className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white text-xl font-bold rounded-xl shadow-lg transition-all transform hover:scale-105"
                    >
                        START NEW OPERATION (ROUND 1)
                    </button>
                </div>
             </div>
          </div>
      )}

      {/* --- PAUSE MENU --- */}
      {status === GameStatus.PAUSED && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm z-50 animate-in fade-in duration-200">
           <div className="bg-gray-800 border border-gray-600 p-8 rounded-xl shadow-2xl max-w-2xl w-full relative text-center">
              <h2 className="text-4xl font-black text-white mb-2 tracking-widest drop-shadow-lg">PAUSED</h2>
              <p className="text-green-400 text-sm mb-6 animate-pulse">GAME SAVED</p>
              
              <div className="grid grid-cols-2 gap-6 mb-8 text-left bg-black/30 p-6 rounded-lg border border-gray-700">
                  <div className="space-y-3">
                      <div>
                          <div className="text-xs text-gray-400 uppercase tracking-wide">Time Survived</div>
                          <div className="text-xl font-bold text-white">{Math.floor(statsRef.current.timeSurvived)}s</div>
                      </div>
                      <div>
                          <div className="text-xs text-gray-400 uppercase tracking-wide">Round</div>
                          <div className="text-xl font-bold text-white">{statsRef.current.round}</div>
                      </div>
                      <div>
                          <div className="text-xs text-gray-400 uppercase tracking-wide">Current Level</div>
                          <div className="text-xl font-bold text-white">{playerRef.current.level}</div>
                      </div>
                  </div>
                  <div className="space-y-3">
                       <div>
                          <div className="text-xs text-gray-400 uppercase tracking-wide">Base Damage</div>
                          <div className="text-xl font-bold text-green-400">{playerRef.current.baseDamage.toFixed(0)}</div>
                      </div>
                       <div>
                          <div className="text-xs text-gray-400 uppercase tracking-wide">Equipped Weapon</div>
                          <div className="text-xl font-bold text-blue-400">{playerRef.current.weapons[playerRef.current.currentWeaponIndex].name}</div>
                      </div>
                  </div>
              </div>

              <div className="flex justify-center gap-6">
                  <button 
                    onClick={resumeGame}
                    className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded shadow-lg transition-all w-40"
                  >
                    RESUME
                  </button>
                  <button 
                    onClick={quitToMenu}
                    className="px-8 py-3 bg-red-900/50 hover:bg-red-900/80 text-red-200 border border-red-800 hover:border-red-500 font-bold rounded shadow-lg transition-all w-40"
                  >
                    QUIT TO MENU
                  </button>
              </div>
           </div>
        </div>
      )}

      {/* --- LEVEL UP SCREEN --- */}
      {status === GameStatus.LEVEL_UP && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md z-40 animate-in fade-in duration-300">
          <h2 className="text-4xl font-bold text-yellow-400 mb-2 uppercase tracking-widest drop-shadow-lg">Mutation Available</h2>
          <p className="text-gray-400 mb-10">Select an upgrade or new weapon (Click or press 1, 2, 3)</p>
          
          <div className="flex flex-col md:flex-row gap-6 items-center justify-center px-4">
            {upgradeOptions.map((option, idx) => (
              <UpgradeCard key={idx} index={idx} option={option} onSelect={applyUpgrade} />
            ))}
          </div>
        </div>
      )}

      {/* --- GAME OVER SCREEN --- */}
      {status === GameStatus.GAME_OVER && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-900/90 backdrop-blur-md z-50">
          <h2 className="text-6xl font-black text-white mb-6">DEAD</h2>
          
          <div className="bg-black/50 p-8 rounded-xl border border-red-500/30 max-w-2xl text-center shadow-2xl">
            <div className="grid grid-cols-3 gap-8 mb-8 text-center">
               <div>
                 <div className="text-gray-400 text-xs uppercase">Rounds</div>
                 <div className="text-2xl font-bold text-white">{statsRef.current.round}</div>
               </div>
               <div>
                 <div className="text-gray-400 text-xs uppercase">Kills</div>
                 <div className="text-2xl font-bold text-white">{statsRef.current.kills}</div>
               </div>
               <div>
                 <div className="text-gray-400 text-xs uppercase">Level</div>
                 <div className="text-2xl font-bold text-white">{statsRef.current.levelReached}</div>
               </div>
            </div>

            <div className="mb-8">
              <div className="text-xs text-red-400 uppercase tracking-widest mb-2">Generated Chronicle</div>
              {loadingEulogy ? (
                <div className="animate-pulse text-gray-500 italic">Extracting memory logs...</div>
              ) : (
                <p className="text-lg text-gray-200 italic font-serif leading-relaxed">"{gameOverEulogy}"</p>
              )}
            </div>

            <button 
              onClick={startNewRun}
              className="px-8 py-3 bg-white text-red-900 hover:bg-gray-200 font-bold rounded shadow-lg transition-colors"
            >
              RETRY (New Run)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;