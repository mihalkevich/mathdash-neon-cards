
import React from 'react';

interface NeonButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  variant?: 'cyan' | 'pink' | 'emerald';
  disabled?: boolean;
  id?: string;
}

const NeonButton: React.FC<NeonButtonProps> = ({ onClick, children, className = '', variant = 'cyan', disabled = false, id }) => {
  const colors = {
    cyan: 'border-cyan-400 text-cyan-400 hover:bg-cyan-400/20 shadow-[0_0_15px_rgba(34,211,238,0.3)]',
    pink: 'border-pink-500 text-pink-500 hover:bg-pink-500/20 shadow-[0_0_15px_rgba(244,114,182,0.3)]',
    emerald: 'border-emerald-400 text-emerald-400 hover:bg-emerald-400/20 shadow-[0_0_15px_rgba(52,211,153,0.3)]'
  };

  return (
    <button
      id={id}
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 md:px-6 md:py-3 border-2 font-orbitron uppercase tracking-widest transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${colors[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

export default NeonButton;
