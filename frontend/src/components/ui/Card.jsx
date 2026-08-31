import React from 'react';

const Card = ({ title, children, footer, className = '', onClick }) => {
  return (
    <div 
      className={`bg-white shadow rounded-lg overflow-hidden border border-gray-200 ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''} ${className}`}
      onClick={onClick}
    >
      {title && (
        <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">{title}</h3>
        </div>
      )}
      <div className="px-4 py-5 sm:p-6">
        {children}
      </div>
      {footer && (
        <div className="px-4 py-4 bg-gray-50 sm:px-6">
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card;
