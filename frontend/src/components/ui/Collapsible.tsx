import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../utils/cn';

interface CollapsibleProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

export const Collapsible: React.FC<CollapsibleProps> = ({
  title,
  children,
  defaultOpen = false,
  className
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={cn('border rounded-lg', className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-2 md:p-3 text-left hover:bg-muted/50 transition-colors"
      >
        <span className="font-medium text-sm">{title}</span>
        <ChevronDown 
          className={cn(
            'w-4 h-4 transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-2 pb-2 md:px-3 md:pb-3 border-t">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
