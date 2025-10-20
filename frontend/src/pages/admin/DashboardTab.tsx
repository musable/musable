import React, { useEffect, useState } from 'react';
import {
  UsersIcon,
  MusicalNoteIcon,
  PlayIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  ServerIcon
} from '@heroicons/react/24/outline';
import { apiService } from '../../services/api';
import { DashboardStats } from '../../types';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<any>;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, trend }) => (
  <div className="bg-gray-800 rounded-lg p-6">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-gray-400 text-sm font-medium">{title}</p>
        <p className="text-white text-2xl font-bold mt-1">{value}</p>
        {trend && (
          <div className={`flex items-center mt-2 text-sm ${trend.isPositive ? 'text-green-400' : 'text-red-400'}`}>
            <ArrowTrendingUpIcon className={`w-4 h-4 mr-1 ${!trend.isPositive ? 'rotate-180' : ''}`} />
            {trend.value}% from last month
          </div>
        )}
      </div>
      <div className="bg-primary/20 rounded-lg p-3">
        <Icon className="w-6 h-6 text-primary" />
      </div>
    </div>
  </div>
);

const DashboardTab: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await apiService.getDashboardStats();
        setStats(response.data);
      } catch (err: any) {
        console.error('Failed to fetch dashboard stats:', err);
        setError(err.message || 'Failed to load dashboard statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500 rounded-lg p-6">
        <p className="text-red-400">Error loading dashboard: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Dashboard Overview</h2>
        <p className="text-gray-400">System statistics and recent activity</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Users"
          value={stats?.users.total || 0}
          icon={UsersIcon}
          trend={stats?.trends?.users ? {
            value: Math.abs(stats.trends.users.change),
            isPositive: stats.trends.users.change >= 0
          } : undefined}
        />
        <StatCard
          title="Total Songs"
          value={stats?.library.songs || 0}
          icon={MusicalNoteIcon}
          trend={stats?.trends?.songs ? {
            value: Math.abs(stats.trends.songs.change),
            isPositive: stats.trends.songs.change >= 0
          } : undefined}
        />
        <StatCard
          title="Total Plays"
          value={stats?.listening.total_plays || 0}
          icon={PlayIcon}
          trend={stats?.trends?.plays ? {
            value: Math.abs(stats.trends.plays.change),
            isPositive: stats.trends.plays.change >= 0
          } : undefined}
        />
        <StatCard
          title="Hours Listened"
          value={stats?.listening.total_listening_time ? Math.round(stats.listening.total_listening_time / 3600) : 0}
          icon={ClockIcon}
          trend={stats?.trends?.listeningTime ? {
            value: Math.abs(stats.trends.listeningTime.change),
            isPositive: stats.trends.listeningTime.change >= 0
          } : undefined}
        />
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Users */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <UsersIcon className="w-5 h-5 mr-2" />
            Recent Users
          </h3>
          <div className="space-y-3">
            {stats?.recentActivity?.slice(0, 5).map((activity: any, index: number) => (
              <div key={index} className="flex items-center justify-between py-2 border-b border-gray-700 last:border-0">
                <div>
                  <p className="text-white font-medium">{activity.username}</p>
                  <p className="text-gray-400 text-sm">{activity.song_title}</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-400 text-sm">
                    {new Date(activity.played_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            )) || (
              <p className="text-gray-400 text-center py-4">No recent users</p>
            )}
          </div>
        </div>

        {/* System Status */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <ServerIcon className="w-5 h-5 mr-2" />
            System Status
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Server Status</span>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                <span className="text-green-400 text-sm">Online</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Database</span>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                <span className="text-green-400 text-sm">Connected</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Library Scanner</span>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                <span className="text-green-400 text-sm">Ready</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Total Songs</span>
              <span className="text-white text-sm">
                {stats?.library.songs || 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity Log */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
        <div className="space-y-3">
          {stats?.recentActivity?.map((activity: any, index: number) => (
            <div key={index} className="flex items-center justify-between py-2 border-b border-gray-700 last:border-0">
              <div className="flex items-center">
                {activity.artwork_path ? (
                  <img
                    src={apiService.getArtworkUrl(activity.artwork_path)}
                    alt={activity.album_title || 'Album artwork'}
                    className="w-8 h-8 rounded object-cover mr-3"
                  />
                ) : (
                  <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center mr-3">
                    <PlayIcon className="w-4 h-4 text-primary" />
                  </div>
                )}
                <div>
                  <p className="text-white text-sm">{activity.song_title} by {activity.artist_name}</p>
                  <p className="text-gray-400 text-xs">{activity.username}</p>
                </div>
              </div>
              <span className="text-gray-400 text-xs">
                {new Date(activity.played_at).toLocaleTimeString()}
              </span>
            </div>
          )) || (
            <p className="text-gray-400 text-center py-4">No recent activity</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardTab;