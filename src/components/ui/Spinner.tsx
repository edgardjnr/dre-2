import { Loader2 } from 'lucide-react';
import React from 'react';

export const Spinner = ({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) => {
  const sizeClasses = {
    sm: 'h-5 w-5',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };
  return <Loader2 className={`${sizeClasses[size]} animate-spin text-blue-600`} />;
};

export const FullPageSpinner = () => (
    <div className="flex items-center justify-center h-full w-full absolute inset-0 bg-gray-50 bg-opacity-75">
        <Spinner size="lg" />
    </div>
);
