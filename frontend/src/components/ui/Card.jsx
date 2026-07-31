import React from 'react';
import { motion } from 'framer-motion';

export const Card = ({ children, className = '', hover = false, ...props }) => {
  const baseClass = "bg-card backdrop-blur-xl border border-white/5 shadow-2xl rounded-2xl p-6";
  const hoverClass = hover ? "transition-all duration-300 hover:-translate-y-1 hover:border-white/10 hover:shadow-black/50" : "";
  
  return (
    <motion.div 
      className={`${baseClass} ${hoverClass} ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      {...props}
    >
      {children}
    </motion.div>
  );
};
