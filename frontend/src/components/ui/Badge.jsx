import React from 'react';

const Badge = ({ variant = 'gray', children, className = '' }) => {
  const variants = {
    gray: 'bg-gray-100 text-gray-800',
    red: 'bg-red-100 text-red-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    green: 'bg-green-100 text-green-800',
    blue: 'bg-blue-100 text-blue-800',
    indigo: 'bg-indigo-100 text-indigo-800',
    purple: 'bg-purple-100 text-purple-800',
    orange: 'bg-orange-100 text-orange-800',
  };

  // Map backend status to badge colors
  let finalVariant = variant;
  const statusStr = typeof children === 'string' ? children.toLowerCase() : '';
  
  if (statusStr === 'pendiente') finalVariant = 'gray';
  else if (statusStr === 'reportada') finalVariant = 'yellow';
  else if (statusStr === 'verificada') finalVariant = 'green';
  else if (statusStr === 'observada') finalVariant = 'orange';

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${variants[finalVariant]} ${className}`}>
      {children}
    </span>
  );
};

export default Badge;
