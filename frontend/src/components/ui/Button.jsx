import React from 'react';
import Spinner from './Spinner';

const Button = ({
  children,
  type = 'button',
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  className = '',
  onClick,
  ...props
}) => {
  const baseStyle = 'inline-flex justify-center items-center font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors';
  
  const variants = {
    primary: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 border border-transparent shadow-sm',
    secondary: 'bg-white text-gray-700 hover:bg-gray-50 focus:ring-red-500 border border-gray-300 shadow-sm',
    danger: 'bg-red-800 text-white hover:bg-red-900 focus:ring-red-500 border border-transparent shadow-sm',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500 border border-transparent shadow-sm',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      type={type}
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${disabled || isLoading ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      disabled={disabled || isLoading}
      onClick={onClick}
      {...props}
    >
      {isLoading && <Spinner className="mr-2" size="sm" color={variant === 'secondary' ? 'text-gray-500' : 'text-white'} />}
      {children}
    </button>
  );
};

export default Button;
