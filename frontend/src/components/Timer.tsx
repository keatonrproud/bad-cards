import React from 'react';
import { motion } from 'framer-motion';
import { Timer as TimerIcon } from 'lucide-react';
import { cn } from '../utils/cn';

interface TimerProps {
  timeRemaining: number; // in seconds
  totalTime: number; // in seconds
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const Timer: React.FC<TimerProps> = ({
  timeRemaining,
  totalTime,
  className,
  size = 'md'
}) => {
  const progress = Math.max(0, Math.min(1, timeRemaining / totalTime));
  const percentage = progress * 100;
  
  // Color based on time remaining
  const getColor = () => {
    if (progress > 0.6) return 'text-green-600';
    if (progress > 0.3) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getBgColor = () => {
    if (progress > 0.6) return 'stroke-green-600';
    if (progress > 0.3) return 'stroke-yellow-600';
    return 'stroke-red-600';
  };

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  const iconSizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  // Calculate stroke dash array for circular progress
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className={cn('relative', sizeClasses[size])}>
        {/* Background circle */}
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 40 40">
          <circle
            cx="20"
            cy="20"
            r={radius}
            stroke="currentColor"
            strokeWidth="3"
            fill="none"
            className="text-muted-foreground"
          />
          {/* Progress circle */}
          <motion.circle
            cx="20"
            cy="20"
            r={radius}
            stroke="currentColor"
            strokeWidth="3"
            fill="none"
            className={getBgColor()}
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          />
        </svg>
        
        {/* Timer icon in center */}
        <div className="absolute inset-0 flex items-center justify-center">
          <TimerIcon className={cn(iconSizeClasses[size], getColor())} />
        </div>
      </div>
      
      {/* Time display */}
      <span className={cn('font-semibold tabular-nums', textSizeClasses[size], getColor())}>
        {Math.ceil(timeRemaining)}s
      </span>
    </div>
  );
};
