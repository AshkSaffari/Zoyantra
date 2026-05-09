import React from 'react';

const ZoyantraLogo = ({ size = 48, className = "" }) => {
  return (
    <svg 
      viewBox="0 0 48 48" 
      width={size} 
      height={size} 
      className={className}
    >
      <defs>
        {/* High-quality gradients */}
        <linearGradient id="hexagonGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#E91E63" />
          <stop offset="30%" stopColor="#C72C7B" />
          <stop offset="70%" stopColor="#AD1457" />
          <stop offset="100%" stopColor="#880E4F" />
        </linearGradient>
        
        <linearGradient id="circuitGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFF176" />
          <stop offset="30%" stopColor="#FFEB3B" />
          <stop offset="70%" stopColor="#FDD835" />
          <stop offset="100%" stopColor="#F9A825" />
        </linearGradient>
        
        {/* Glow effect filter */}
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="0.5" result="coloredBlur"/>
          <feMerge> 
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        
        {/* Drop shadow filter */}
        <filter id="dropshadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="1" dy="1" stdDeviation="1" floodColor="#000000" floodOpacity="0.3"/>
        </filter>
      </defs>
      
      {/* Main hexagon with precise geometry */}
      <polygon 
        points="24,6 38,16 38,32 24,42 10,32 10,16" 
        fill="url(#hexagonGradient)" 
        stroke="#880E4F" 
        strokeWidth="0.5"
        filter="url(#dropshadow)"
      />
      
      {/* Circuit nodes - positioned exactly like the reference */}
      <circle cx="14" cy="18" r="2.5" fill="url(#circuitGradient)" filter="url(#glow)" />
      <circle cx="34" cy="18" r="2.5" fill="url(#circuitGradient)" filter="url(#glow)" />
      <circle cx="14" cy="30" r="2.5" fill="url(#circuitGradient)" filter="url(#glow)" />
      <circle cx="34" cy="30" r="2.5" fill="url(#circuitGradient)" filter="url(#glow)" />
      
      {/* Primary circuit lines */}
      <path 
        d="M14,18 L24,24 L34,18" 
        stroke="url(#circuitGradient)" 
        strokeWidth="2.5" 
        fill="none" 
        filter="url(#glow)"
      />
      <path 
        d="M14,30 L24,24 L34,30" 
        stroke="url(#circuitGradient)" 
        strokeWidth="2.5" 
        fill="none" 
        filter="url(#glow)"
      />
      <path 
        d="M14,18 L14,30" 
        stroke="url(#circuitGradient)" 
        strokeWidth="2" 
        fill="none" 
        filter="url(#glow)"
      />
      <path 
        d="M34,18 L34,30" 
        stroke="url(#circuitGradient)" 
        strokeWidth="2" 
        fill="none" 
        filter="url(#glow)"
      />
      
      {/* Secondary circuit connections for more detail */}
      <path 
        d="M14,18 L19,21 L24,18 L29,21 L34,18" 
        stroke="url(#circuitGradient)" 
        strokeWidth="1.5" 
        fill="none" 
        opacity="0.8"
        filter="url(#glow)"
      />
      <path 
        d="M14,30 L19,27 L24,30 L29,27 L34,30" 
        stroke="url(#circuitGradient)" 
        strokeWidth="1.5" 
        fill="none" 
        opacity="0.8"
        filter="url(#glow)"
      />
      
      {/* Diagonal connections to Z */}
      <path 
        d="M14,18 L20,22 L24,20 L28,22 L34,18" 
        stroke="url(#circuitGradient)" 
        strokeWidth="1" 
        fill="none" 
        opacity="0.6"
        filter="url(#glow)"
      />
      <path 
        d="M14,30 L20,26 L24,28 L28,26 L34,30" 
        stroke="url(#circuitGradient)" 
        strokeWidth="1" 
        fill="none" 
        opacity="0.6"
        filter="url(#glow)"
      />
      
      {/* Central Z with enhanced styling */}
      <text 
        x="24" 
        y="32" 
        textAnchor="middle" 
        fontSize="20" 
        fontWeight="900" 
        fill="url(#circuitGradient)"
        style={{
          fontFamily: 'Arial, sans-serif',
          textShadow: '1px 1px 2px rgba(0,0,0,0.3)',
          filter: 'url(#glow)'
        }}
      >
        Z
      </text>
    </svg>
  );
};

export default ZoyantraLogo;
