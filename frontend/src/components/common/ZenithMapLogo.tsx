import React from 'react';

interface ZenithMapLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
  collapsed?: boolean;
}

export const ZenithMapLogo: React.FC<ZenithMapLogoProps> = ({
  className = '',
  size = 'md',
  showSubtitle = true,
  collapsed = false,
}) => {
  const iconSizes = {
    sm: 'h-7 w-7',
    md: 'h-9 w-9',
    lg: 'h-12 w-12',
  };

  const textSizes = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-2xl',
  };

  const subtitleSizes = {
    sm: 'text-[7px]',
    md: 'text-[8.5px]',
    lg: 'text-[10px]',
  };

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Símbolo Vetorial Zenith: Pináculo Geométrico com Ponto de Convergência / Rede */}
      <div
        className={`relative shrink-0 flex items-center justify-center rounded-xl bg-gradient-to-br from-orange-500/20 via-orange-500/10 to-transparent border border-orange-500/30 p-1.5 shadow-md shadow-orange-500/10 ${iconSizes[size]}`}
      >
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="h-full w-full"
        >
          {/* Círculo de Pulso de Rede */}
          <circle cx="16" cy="16" r="14" stroke="#F97316" strokeWidth="1.5" strokeOpacity="0.25" strokeDasharray="3 3" />
          
          {/* Triângulo / Pináculo do Zênite */}
          <path
            d="M16 4L26 22H6L16 4Z"
            fill="url(#zenith-grad)"
            fillOpacity="0.85"
            stroke="#F97316"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />

          {/* Nós e Linhas de Conexão de Rede Internos */}
          <path d="M16 4V16M16 16L6 22M16 16L26 22" stroke="#FFFFFF" strokeWidth="1.2" strokeOpacity="0.8" />
          <circle cx="16" cy="4" r="2" fill="#FFFFFF" />
          <circle cx="16" cy="16" r="2.5" fill="#F97316" stroke="#FFFFFF" strokeWidth="1" />
          <circle cx="6" cy="22" r="1.75" fill="#FFFFFF" />
          <circle cx="26" cy="22" r="1.75" fill="#FFFFFF" />

          <defs>
            <linearGradient id="zenith-grad" x1="16" y1="4" x2="16" y2="22" gradientUnits="userSpaceOnUse">
              <stop stopColor="#F97316" />
              <stop offset="1" stopColor="#C2410C" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Tipografia da Marca */}
      {!collapsed && (
        <div className="flex flex-col justify-center min-w-0">
          <div className={`font-extrabold tracking-tight leading-none text-fg flex items-baseline ${textSizes[size]}`}>
            <span>Zenith</span>
            <span className="text-orange-500">Map</span>
          </div>
          {showSubtitle && (
            <span
              className={`font-bold tracking-[0.22em] uppercase text-fg-secondary opacity-80 mt-1 leading-none ${subtitleSizes[size]}`}
            >
              Asset &amp; Network Intelligence
            </span>
          )}
        </div>
      )}
    </div>
  );
};
