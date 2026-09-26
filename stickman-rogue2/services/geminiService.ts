
import { GameStats, StatType, WeaponType } from '../types';

// Local fallback logic replaces AI calls
export const generateUpgradeFlavor = async (
  statType: StatType,
  rarity: string,
  weaponType?: string
): Promise<{ name: string; description: string }> => {
  return getLocalFlavor(statType, rarity, weaponType);
};

export const generateDeathEulogy = async (stats: GameStats): Promise<string> => {
  const phrases = [
    `You fought bravely for ${Math.floor(stats.timeSurvived)} seconds, taking down ${stats.kills} foes.`,
    `Overwhelmed after ${Math.floor(stats.timeSurvived)} seconds. ${stats.kills} zombies fell before you did.`,
    `The horde claimed another. Survived: ${Math.floor(stats.timeSurvived)}s. Kills: ${stats.kills}.`,
    `A valiant effort! ${stats.kills} zombies neutralized in ${Math.floor(stats.timeSurvived)} seconds.`,
    `Your watch has ended. Level ${stats.levelReached} reached with ${stats.kills} kills.`
  ];
  return phrases[Math.floor(Math.random() * phrases.length)];
};

const getLocalFlavor = (statType: StatType, rarity: string, weaponType?: string) => {
  if (statType === StatType.WEAPON_UNLOCK && weaponType) {
    const weaponNames: Record<string, string> = {
      [WeaponType.SHOTGUN]: 'Crowd Control',
      [WeaponType.SMG]: 'Bullet Hose',
      [WeaponType.SNIPER]: 'Line Piercer'
    };
    const weaponDescs: Record<string, string> = {
      [WeaponType.SHOTGUN]: 'Equip a Shotgun. Fires 5 pellets at once. Devastating at close range.',
      [WeaponType.SMG]: 'Equip an SMG. Extremely high fire rate, lower accuracy.',
      [WeaponType.SNIPER]: 'Equip a Railgun. High damage shots that pierce through multiple enemies.'
    };
    return {
      name: `NEW WEAPON: ${weaponNames[weaponType] || 'Unknown Tech'}`,
      description: weaponDescs[weaponType] || 'A new tool for destruction.'
    };
  }

  const adjectives = rarity === 'LEGENDARY' ? ['Godly', 'Omega', 'Titan', 'Mythic'] : rarity === 'RARE' ? ['Enhanced', 'Tactical', 'Super', 'Elite'] : ['Basic', 'Standard', 'Minor', 'Rusty'];
  
  const map: Record<string, string> = {
    [StatType.DAMAGE]: 'Power Strike',
    [StatType.SPEED]: 'Swift Legs',
    [StatType.MAX_HP]: 'Iron Skin',
    [StatType.FIRE_RATE]: 'Rapid Trigger',
    [StatType.WEAPON_UNLOCK]: 'New Armament'
  };

  const descriptions: Record<string, string> = {
    [StatType.DAMAGE]: 'Increases global damage output.',
    [StatType.SPEED]: 'Increases movement speed.',
    [StatType.MAX_HP]: 'Increases maximum health.',
    [StatType.FIRE_RATE]: 'Increases firing speed for all weapons.',
  };

  return {
    name: `${adjectives[Math.floor(Math.random() * adjectives.length)]} ${map[statType]}`,
    description: descriptions[statType] || `Increases your ${statType.toLowerCase().replace('_', ' ')} significantly.`
  };
};
