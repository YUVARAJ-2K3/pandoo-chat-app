// src/components/Logo.tsx
// Reusable logo component for consistent branding across the application
import React from 'react';

interface LogoProps {
  size?: 'small' | 'medium' | 'large' | 'xl';
  variant?: 'default' | 'white' | 'gradient';
  showText?: boolean;
  className?: string;
}

/**
 * Logo Component
 * 
 * A reusable logo component that displays the Pandoo Chat branding
 * with customizable size, color variant, and text display options.
 * 
 * @param size - Logo size: 'small', 'medium', 'large', or 'xl'
 * @param variant - Color variant: 'default', 'white', or 'gradient'
 * @param showText - Whether to show the text alongside the icon
 * @param className - Additional CSS classes
 */
export function Logo({ 
  size = 'medium', 
  variant = 'default', 
  showText = true, 
  className = '' 
}: LogoProps) {
  // Size configurations
  const sizeConfig = {
    small: { icon: 24, text: 'text-xs', gap: 'gap-2' },
    medium: { icon: 32, text: 'text-sm', gap: 'gap-3' },
    large: { icon: 48, text: 'text-base', gap: 'gap-4' },
    xl: { icon: 64, text: 'text-lg', gap: 'gap-5' }
  };

  const config = sizeConfig[size];

  // Color variants for text
  const colorVariants = {
    default: {
      text: 'text-gray-900',
    },
    white: {
      text: 'text-white',
    },
    gradient: {
      text: 'text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600',
    }
  };

  const colors = colorVariants[variant];

  return (
    <div className={`flex items-center ${config.gap} ${className}`}>
      {/* Logo Icon */}
      <div 
        className="relative"
        style={{ width: config.icon, height: config.icon }}
      >
        {/* Main logo image */}
        <img 
          src="/logo.png" 
          alt="Pandoo Chat Logo" 
          className="w-full h-full object-cover rounded-xl shadow-lg"
          style={{ width: config.icon, height: config.icon }}
        />
        
        {/* Decorative elements */}
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></div>
        <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-green-400 rounded-full"></div>
      </div>

      {/* Logo Text */}
      {showText && (
        <div className="flex flex-col min-w-0">
          <span className={`font-bold ${config.text} ${colors.text} leading-tight truncate`}>
            Pandoo
          </span>
          <span className={`font-medium text-xs ${variant === 'white' ? 'text-gray-200' : 'text-gray-600'} leading-tight truncate`}>
            Chat
          </span>
        </div>
      )}
    </div>
  );
}

// Export default for easier imports
export default Logo;
