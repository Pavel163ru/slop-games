
import React from 'react';
import { Player, GameStats } from '../types';

interface GameOverlayProps {
  player: Player;
  stats: GameStats;
}

export const GameOverlay: React.FC<GameOverlayProps> = ({ player, stats }) => {
  // Calculate XP percentage
  const xpPercentage = (player.xp / player.xpToNextLevel) * 100;
  // Calculate HP percentage
  const hpPercentage = (player.hp / player.maxHp) * 100;
  
  const currentWeapon = player.weapons[player.currentWeaponIndex];

  return (
    <div className="absolute inset-0 pointer-events-none p-4 flex flex-col justify-between">
      {/* Top Bar */}
      <div className="flex justify-between items-start w-full">
        {/* Health & Level */}
        <div className="flex flex-col gap-2 w-64">
          {/* Health Bar */}
          <div className="relative h-6 w-full bg-gray-900 rounded-full border-2 border-gray-700 overflow-hidden">
            <div 
              className="absolute top-0 left-0 h-full bg-red-600 transition-all duration-200"
              style={{ width: `${hpPercentage}%` }}
            />
            <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white drop-shadow-md">
              HP: {Math.ceil(player.hp)} / {Math.ceil(player.maxHp)}
            </div>
          </div>

          {/* XP Bar */}
          <div className="relative h-4 w-full bg-gray-900 rounded-full border border-gray-700 overflow-hidden">
            <div 
              className="absolute top-0 left-0 h-full bg-blue-500 transition-all duration-200"
              style={{ width: `${xpPercentage}%` }}
            />
             <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white drop-shadow-md">
              LVL {player.level}
            </div>
          </div>
        </div>

        {/* Stats Counter */}
        <div className="text-right">
          <div className="text-yellow-400 font-bold text-xl drop-shadow-md mb-1">
             $ {player.money}
          </div>
          <div className="text-2xl font-black text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
            {stats.kills} <span className="text-sm font-normal text-gray-400">KILLS</span>
          </div>
          <div className="text-xl font-bold text-gray-200 drop-shadow-md">
            {Math.floor(stats.timeSurvived)}s
          </div>
        </div>
      </div>
      
      {/* Weapon Indicator (Bottom Center) */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex flex-col items-center">
        <div className="text-gray-400 text-xs uppercase tracking-widest mb-1">Current Weapon</div>
        <div className="bg-gray-800/80 border-2 border-gray-600 px-6 py-2 rounded-xl flex items-center gap-4 backdrop-blur-sm">
            <div className="text-xl font-black text-yellow-400">{currentWeapon.name}</div>
            {player.weapons.length > 1 && (
                <div className="text-xs bg-white/20 px-2 py-1 rounded font-mono animate-pulse">
                    PRESS Q TO SWITCH
                </div>
            )}
        </div>
      </div>

      {/* Tutorial Hint */}
      {stats.timeSurvived < 5 && (
        <div className="absolute top-1/4 left-1/2 transform -translate-x-1/2 text-center animate-pulse">
          <p className="text-gray-400 text-sm mb-1">WASD to Move • Auto-Fires at Nearest Zombie</p>
          <p className="text-white font-bold">SURVIVE</p>
        </div>
      )}
    </div>
  );
};
