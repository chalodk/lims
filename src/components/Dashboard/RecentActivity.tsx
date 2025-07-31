import React from 'react';
import { Activity } from '../../types';
import { Clock, TestTube, FileCheck, TrendingUp } from 'lucide-react';

interface RecentActivityProps {
  activities: Activity[];
}

const getActivityIcon = (type: Activity['type']) => {
  switch (type) {
    case 'sample_created':
      return TestTube;
    case 'status_changed':
      return TrendingUp;
    case 'result_added':
      return FileCheck;
    default:
      return Clock;
  }
};

export const RecentActivity: React.FC<RecentActivityProps> = ({ activities }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
      
      <div className="space-y-4">
        {activities.slice(0, 5).map((activity) => {
          const Icon = getActivityIcon(activity.type);
          return (
            <div key={activity.id} className="flex items-start space-x-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Icon className="h-4 w-4 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900">{activity.description}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {activity.timestamp.toLocaleString()}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="mt-4 pt-4 border-t border-gray-200">
        <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
          View all activity →
        </button>
      </div>
    </div>
  );
};