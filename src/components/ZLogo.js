import React from 'react';

const ZLogo = ({ size = 'w-8 h-8', className = '' }) => {
  return (
    <div className={`${size} relative ${className}`}>
      {/* Z Logo */}
      <div className="w-full h-full bg-gradient-to-br from-pink-400 via-pink-500 to-pink-600 rounded-lg transform rotate-12 shadow-lg">
        <div className="w-full h-full flex items-center justify-center">
          <span className="text-2xl font-black text-white drop-shadow-lg">Z</span>
        </div>
      </div>
      {/* White outline effect */}
      <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-pink-400 via-pink-500 to-pink-600 rounded-lg transform rotate-12 shadow-lg border-2 border-white"></div>
      <div className="absolute inset-0 w-full h-full flex items-center justify-center">
        <span className="text-2xl font-black text-white drop-shadow-lg">Z</span>
      </div>
    </div>
  );
};

export default ZLogo;