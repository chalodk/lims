import React from 'react';
import { DivideIcon as LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  change?: {
    value: string;
    trend: 'up' | 'down' | 'neutral';
  };
  color: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
}

const colorStyles = {
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-green-50 text-green-600',
  yellow: 'bg-yellow-50 text-yellow-600',
  red: 'bg-red-50 text-red-600',
  purple: 'bg-purple-50 text-purple-600'
};

export const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon: Icon, change, color }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
          {change && (
            <p className={`text-sm mt-2 ${
              change.trend === 'up' ? 'text-green-600' : 
              change.trend === 'down' ? 'text-red-600' : 'text-gray-600'
            }`}>
              {change.value}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${colorStyles[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
};