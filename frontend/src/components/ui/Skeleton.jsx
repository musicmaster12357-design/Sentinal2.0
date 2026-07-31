import React from 'react';
import { motion } from 'framer-motion';

export const Skeleton = ({ className = '', variant = 'rectangular' }) => {
  const baseClass = "bg-white/5 animate-pulse rounded-xl";
  const variants = {
    circular: "rounded-full",
    rectangular: "rounded-xl",
    text: "rounded h-4 w-3/4"
  };

  return (
    <div className={`${baseClass} ${variants[variant]} ${className}`} />
  );
};
