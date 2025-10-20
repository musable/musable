import React, { useState } from 'react';
import { 
  Cog6ToothIcon,
  UsersIcon,
  MusicalNoteIcon,
  ClockIcon,
  ChartBarIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

// Import admin sub-components
import DashboardTab from './DashboardTab';
import UserManagementTab from './UserManagementTab';
import LibraryManagementTab from './LibraryManagementTab';
import HistoryTab from './HistoryTab';
import AnalyticsTab from './AnalyticsTab';
import SystemSettingsTab from './SystemSettingsTab';

type AdminTab = 'dashboard' | 'users' | 'library' | 'history' | 'analytics' | 'settings';

interface TabConfig {
  id: AdminTab;
  label: string;
  icon: React.ComponentType<any>;
  component: React.ComponentType;
}

const tabs: TabConfig[] = [
  { id: 'dashboard', label: 'Dashboard', icon: ChartBarIcon, component: DashboardTab },
  { id: 'users', label: 'User Management', icon: UsersIcon, component: UserManagementTab },
  { id: 'library', label: 'Library Management', icon: MusicalNoteIcon, component: LibraryManagementTab },
  { id: 'history', label: 'Listen History', icon: ClockIcon, component: HistoryTab },
  { id: 'analytics', label: 'Analytics', icon: DocumentTextIcon, component: AnalyticsTab },
  { id: 'settings', label: 'System Settings', icon: Cog6ToothIcon, component: SystemSettingsTab },
];

const AdminPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || DashboardTab;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-white mb-2">Admin Panel</h1>
        <p className="text-gray-400">Manage users, library, and system settings</p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-700">
        <nav className="flex space-x-8 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  'flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors',
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                )}
              >
                <Icon className="w-5 h-5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-96">
        <ActiveComponent />
      </div>
    </div>
  );
};

export default AdminPage;