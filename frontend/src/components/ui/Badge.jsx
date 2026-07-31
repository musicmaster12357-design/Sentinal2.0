import React from 'react';

export const Badge = ({ children, variant = 'info', className = '' }) => {
  const variants = {
    success: "bg-status-success/10 text-status-success border border-status-success/20",
    warning: "bg-status-warning/10 text-status-warning border border-status-warning/20",
    danger: "bg-status-danger/10 text-status-danger border border-status-danger/20",
    info: "bg-status-info/10 text-status-info border border-status-info/20",
    primary: "bg-primary/10 text-primary-light border border-primary/20",
  };

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide uppercase ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};
