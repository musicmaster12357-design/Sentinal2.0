import React from 'react';

export const Input = ({ icon: Icon, className = '', ...props }) => {
  return (
    <div className="relative group w-full">
      {Icon && (
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted group-focus-within:text-primary transition-colors">
          <Icon size={18} />
        </div>
      )}
      <input 
        className={`w-full bg-surface border border-white/5 rounded-xl px-4 py-3 text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all ${Icon ? 'pl-10' : ''} ${className}`}
        {...props}
      />
    </div>
  );
};
