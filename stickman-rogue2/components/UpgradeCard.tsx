
import React, { useEffect, useState } from 'react';
import { UpgradeOption, StatType } from '../types';
import { generateUpgradeFlavor } from '../services/geminiService';

interface UpgradeCardProps {
  option: UpgradeOption;
  onSelect: (option: UpgradeOption) => void;
  index: number;
}

export const UpgradeCard: React.FC<UpgradeCardProps> = ({ option, onSelect, index }) => {
  const [flavor, setFlavor] = useState({ name: 'Analyzing DNA...', description: 'Fetching data from the mainframe...' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    // Pass weapon type if it exists
    const wType = option.weaponData ? option.weaponData.type : undefined;
    
    generateUpgradeFlavor(option.type, option.rarity, wType).then(data => {
      if (isMounted) {
        setFlavor(data);
        setLoading(false);
      }
    });
    return () => { isMounted = false; };
  }, [option.type, option.rarity, option.weaponData]);

  const getStatLabel = (type: StatType) => {
    switch (type) {
      case StatType.DAMAGE: return "+ Global Damage";
      case StatType.SPEED: return "+ Move Speed";
      case StatType.MAX_HP: return "+ Max Health";
      case StatType.FIRE_RATE: return "+ Global Fire Rate";
      case StatType.WEAPON_UNLOCK: return "New Weapon";
    }
  };

  const borderColor = option.rarity === 'LEGENDARY' ? 'border-yellow-400' : option.rarity === 'RARE' ? 'border-purple-400' : 'border-gray-400';
  const bgColor = option.rarity === 'LEGENDARY' ? 'bg-yellow-900/20' : option.rarity === 'RARE' ? 'bg-purple-900/20' : 'bg-gray-800/50';
  
  const isWeapon = option.type === StatType.WEAPON_UNLOCK;

  return (
    <button 
      onClick={() => onSelect({ ...option, ...flavor })}
      className={`flex flex-col items-start text-left p-6 rounded-xl border-2 ${borderColor} ${bgColor} hover:bg-opacity-40 transition-all transform hover:scale-105 w-full md:w-72 h-80 relative overflow-hidden group`}
    >
      <div className="absolute top-3 right-3 bg-black/60 text-white/90 w-8 h-8 flex items-center justify-center rounded-lg font-mono font-bold border border-white/10 backdrop-blur-sm shadow-lg text-sm z-20">
        {index + 1}
      </div>

      <div className="z-10 flex flex-col h-full w-full">
        <div className="text-xs font-bold tracking-widest opacity-70 mb-1">{option.rarity}</div>
        <h3 className={`text-xl font-black mb-2 ${loading ? 'animate-pulse' : ''}`}>{flavor.name}</h3>
        
        <div className="flex-grow">
          <p className="text-sm text-gray-300 italic mb-4 min-h-[3rem]">{flavor.description}</p>
          
          <div className="mt-auto bg-black/40 p-3 rounded-lg border border-white/10 w-full">
            <div className={`text-lg font-bold ${isWeapon ? 'text-yellow-400' : 'text-green-400'}`}>{getStatLabel(option.type)}</div>
            {!isWeapon && <div className="text-xs text-gray-400">Effect Value: {option.value}</div>}
          </div>
        </div>
        
        <div className="mt-4 text-center w-full py-2 bg-white/10 rounded hover:bg-white/20 transition-colors text-sm font-bold uppercase tracking-wider">
          {isWeapon ? 'Equip' : 'Select Mutation'}
        </div>
      </div>

      {/* Background pulse effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent to-black opacity-50" />
    </button>
  );
};
