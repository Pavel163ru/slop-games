import { Weapon, WeaponType, ShopItem, StatType } from './types';

export const CANVAS_WIDTH = window.innerWidth;
export const CANVAS_HEIGHT = window.innerHeight;

export const PLAYER_BASE_STATS = {
  radius: 10,
  color: '#3b82f6', // Blue-500
  speed: 4,
  maxHp: 100,
  baseDamage: 20,
  baseFireRateMult: 1.0, 
};

export const DEFAULT_SETTINGS = {
  roundDuration: 120
};

export const BOSS_BASE_STATS = {
  radius: 40,
  color: '#9333ea', // Purple-600
  speed: 1.5,
  hp: 1500,
  damage: 30
};

export const WEAPON_DEFS: Record<WeaponType, Weapon> = {
  [WeaponType.PISTOL]: {
    type: WeaponType.PISTOL,
    name: '9mm Sidearm',
    damageMult: 1.0,
    fireRate: 25,
    speed: 12,
    color: '#fbbf24', // Amber
    projectileCount: 1,
    spread: 0.05,
    piercing: 0
  },
  [WeaponType.SHOTGUN]: {
    type: WeaponType.SHOTGUN,
    name: 'Boomstick',
    damageMult: 0.7, // Per pellet
    fireRate: 50,
    speed: 10,
    color: '#ef4444', // Red
    projectileCount: 5,
    spread: 0.4,
    piercing: 1
  },
  [WeaponType.SMG]: {
    type: WeaponType.SMG,
    name: 'Vector SMG',
    damageMult: 0.4,
    fireRate: 5, // Very fast
    speed: 14,
    color: '#34d399', // Emerald
    projectileCount: 1,
    spread: 0.2,
    piercing: 0
  },
  [WeaponType.SNIPER]: {
    type: WeaponType.SNIPER,
    name: 'Railgun',
    damageMult: 4.0,
    fireRate: 90,
    speed: 25,
    color: '#818cf8', // Indigo
    projectileCount: 1,
    spread: 0,
    piercing: 5 // Goes through 5 enemies
  }
};

export const ENEMY_BASE_STATS = {
  radius: 10,
  color: '#22c55e', // Green-500
  speed: 2,
  hp: 50,
  damage: 10
};

export const BULLET_RADIUS = 3;
export const XP_PICKUP_RADIUS = 5;
export const MONEY_PICKUP_RADIUS = 6;
export const FPS = 60;

export const UPGRADE_TYPES = [
  'DAMAGE',
  'SPEED',
  'MAX_HP',
  'FIRE_RATE',
  'WEAPON_UNLOCK' 
] as const;

export const STORAGE_KEY = 'STICKMAN_ROGUE_SAVE_DATA_V2'; // Bump version

export const MONEY_DROP_CHANCE = 0.3; // 30% chance to drop money
export const BOSS_MONEY_DROP = 500;

// Items available in Sanctuary (Permanent Upgrades)
export const PERMANENT_SHOP_ITEMS: ShopItem[] = [
  { 
    id: 'perm_hp', 
    name: 'Titan Gene', 
    cost: 1000, 
    category: 'PERMANENT',
    type: StatType.MAX_HP, 
    value: 20, 
    description: '+20 Starting Max HP (Permanent)' 
  },
  { 
    id: 'perm_dmg', 
    name: 'Carbon Fiber Muscles', 
    cost: 1500, 
    category: 'PERMANENT',
    type: StatType.DAMAGE, 
    value: 5, 
    description: '+5 Starting Damage (Permanent)' 
  },
  { 
    id: 'perm_spd', 
    name: 'Cyber Legs', 
    cost: 1200, 
    category: 'PERMANENT',
    type: StatType.SPEED, 
    value: 0.5, 
    description: '+0.5 Starting Speed (Permanent)' 
  },
  { 
    id: 'perm_fr', 
    name: 'Synaptic Accelerator', 
    cost: 2000, 
    category: 'PERMANENT',
    type: StatType.FIRE_RATE, 
    value: 0.1, 
    description: '+10% Starting Fire Rate (Permanent)' 
  }
];

// Items available at the Merchant between rounds (Temporary/One-time)
export const ROUND_MERCHANT_ITEMS: ShopItem[] = [
  { 
    id: 'medkit_small', 
    name: 'Field Bandage', 
    cost: 100, 
    category: 'CONSUMABLE',
    type: 'HEAL', 
    value: 30, 
    description: 'Restore 30 HP' 
  },
  { 
    id: 'medkit_large', 
    name: 'Nano-Gel', 
    cost: 300, 
    category: 'CONSUMABLE',
    type: 'HEAL', 
    value: 100, 
    description: 'Restore 100 HP' 
  },
  { 
    id: 'temp_dmg', 
    name: 'Adrenaline Shot', 
    cost: 250, 
    category: 'CONSUMABLE',
    type: StatType.DAMAGE, 
    value: 3, 
    description: '+3 Damage' 
  },
  { 
    id: 'temp_speed', 
    name: 'Energy Drink', 
    cost: 150, 
    category: 'CONSUMABLE',
    type: StatType.SPEED, 
    value: 0.2, 
    description: '+0.2 Speed' 
  },
  { 
    id: 'temp_hp', 
    name: 'Armor Plate', 
    cost: 200, 
    category: 'CONSUMABLE',
    type: StatType.MAX_HP, 
    value: 10, 
    description: '+10 Max HP' 
  }
];