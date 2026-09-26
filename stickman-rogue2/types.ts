export enum GameStatus {
  MENU = 'MENU',
  SETTINGS = 'SETTINGS',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  LEVEL_UP = 'LEVEL_UP',
  ROUND_OVER = 'ROUND_OVER',
  SANCTUARY = 'SANCTUARY',
  GAME_OVER = 'GAME_OVER'
}

export interface Position {
  x: number;
  y: number;
}

export interface Entity extends Position {
  id: string;
  radius: number;
  color: string;
  vx: number;
  vy: number;
}

export enum WeaponType {
  PISTOL = 'PISTOL',
  SHOTGUN = 'SHOTGUN',
  SMG = 'SMG',
  SNIPER = 'SNIPER'
}

export interface Weapon {
  type: WeaponType;
  name: string;
  damageMult: number;     // Multiplier against base damage
  fireRate: number;       // Frames between shots
  speed: number;          // Bullet speed
  color: string;
  projectileCount: number; // How many bullets per shot
  spread: number;         // Angle variance in radians
  piercing: number;       // How many enemies it can pass through
}

export interface PermanentStats {
  baseDamage: number;
  maxHp: number;
  speed: number;
  fireRateMult: number;
}

export interface Player extends Entity {
  hp: number;
  maxHp: number;
  speed: number;
  baseDamage: number;
  baseFireRateMult: number; // Global fire rate multiplier (0.5 = twice as fast)
  money: number; // Currency
  
  // Meta Progression
  permanentStats: PermanentStats;

  // Inventory
  weapons: Weapon[];
  currentWeaponIndex: number;

  lastFired: number;
  xp: number;
  level: number;
  xpToNextLevel: number;
}

export interface Enemy extends Entity {
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  type: 'NORMAL' | 'FAST' | 'TANK' | 'BOSS';
}

export interface Bullet extends Entity {
  damage: number;
  angle: number;
  piercing: number; // Remaining pierce count
  hitIds: string[]; // IDs of enemies already hit by this bullet
}

export interface Particle extends Entity {
  life: number;
  maxLife: number;
}

export interface Pickup extends Entity {
  value: number;
  type: 'XP' | 'HEALTH' | 'MONEY';
}

export enum StatType {
  DAMAGE = 'DAMAGE',
  SPEED = 'SPEED',
  MAX_HP = 'MAX_HP',
  FIRE_RATE = 'FIRE_RATE',
  WEAPON_UNLOCK = 'WEAPON_UNLOCK' // Special type for finding guns
}

export interface UpgradeOption {
  type: StatType;
  value: number;
  rarity: 'COMMON' | 'RARE' | 'LEGENDARY';
  name: string;
  description: string;
  flavorLoaded: boolean;
  weaponData?: Weapon; // If type is WEAPON_UNLOCK
}

export interface ShopItem {
  id: string;
  name: string;
  cost: number;
  category: 'PERMANENT' | 'CONSUMABLE'; 
  type: StatType | 'HEAL' | 'REPAIR';
  value: number;
  description: string;
}

export interface GameStats {
  kills: number;
  timeSurvived: number; // total seconds
  levelReached: number;
  round: number;
}

export interface GameSettings {
  roundDuration: number;
}

export interface SaveData {
  player: Player;
  stats: GameStats;
  enemies: Enemy[];
  pickups: Pickup[];
  settings: GameSettings;
  roundTime: number;
  timestamp: number; // Unix timestamp
  status?: GameStatus;
  roundShopItems?: ShopItem[]; // Persist the current random shop
}