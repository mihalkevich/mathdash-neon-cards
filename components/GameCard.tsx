
import React from 'react';

interface GameCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'cyan' | 'pink' | 'emerald';
  id?: string;
}

const GameCard: React.FC<GameCardProps> = ({ children, className = '', variant = 'cyan', id }) => {
  const colors = {
    cyan: 'border-cyan-400/30 shadow-[0_0_20px_rgba(34,211,238,0.1)]',
    pink: 'border-pink-500/30 shadow-[0_0_20px_rgba(244,114,182,0.1)]',
    emerald: 'border-emerald-400/30 shadow-[0_0_20px_rgba(52,211,153,0.1)]'
  };

  return (
    <div
      id={id}
      className={`bg-slate-900/80 backdrop-blur-md border-2 p-4 md:p-6 rounded-2xl transition-all duration-500 ${colors[variant]} ${className}`}
    >
      {children}
    </div>
  );
};

export default GameCard;
