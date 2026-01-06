
import React from 'react';

interface InfoCardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
}

const InfoCard: React.FC<InfoCardProps> = ({ title, children, className = '', icon }) => {
  return (
    <div className={`bg-white rounded-2xl p-4 shadow-sm mb-4 ${className}`}>
      {title && (
        <div className="flex items-center gap-2 mb-3 text-gray-400 font-medium text-xs tracking-wider uppercase">
          {icon}
          <span>{title}</span>
        </div>
      )}
      {children}
    </div>
  );
};

export default InfoCard;
