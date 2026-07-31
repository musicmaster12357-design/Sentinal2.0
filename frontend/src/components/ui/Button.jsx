import React from 'react';

export const Button = ({ children, variant = 'primary', className = '', ...props }) => {
  const baseClass = "relative overflow-hidden font-medium py-2 px-4 rounded-xl transition-all duration-300 active:scale-95 flex items-center justify-center gap-2";
  
  const variants = {
    primary: "bg-primary hover:bg-primary-hover text-white shadow-lg shadow-primary/25 hover:shadow-primary/40",
    secondary: "bg-secondary hover:bg-secondary-hover text-white shadow-lg shadow-secondary/25",
    outline: "bg-transparent border border-white/10 hover:bg-white/5 text-text-primary",
    danger: "bg-status-danger hover:bg-red-600 text-white shadow-lg shadow-red-500/20",
    ghost: "bg-transparent hover:bg-white/5 text-text-secondary hover:text-text-primary"
  };

  return (
    <button className={`${baseClass} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};
