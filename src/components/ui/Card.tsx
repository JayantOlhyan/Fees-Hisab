import React from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Card: React.FC<CardProps> = ({ className, children, ...props }) => {
  return (
    <div
      className={cn(
        'bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs transition duration-150',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
