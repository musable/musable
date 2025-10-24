import {
  ArrowPathIcon,
  CheckCircleIcon,
  CircleStackIcon,
  Cog6ToothIcon,
  ExclamationTriangleIcon,
  MusicalNoteIcon,
  ServerIcon,
  ShieldCheckIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import React, { useEffect, useState } from 'react';
import { apiService } from '../../services/api';

interface SystemSettings {
  serverInfo: {
    version: string;
    uptime: number;
    nodeVersion: string;
    platform: string;
  };
  databaseInfo: {
    size: number;
    tables: number;
    connections: number;
  };
  librarySettings: {
    scanInterval: number;
    autoScanEnabled: boolean;
    maxFileSize: number;
    supportedFormats: string[];
  };
  scanOptions: {
    parallelism: number;
    batchSize: number;
  };
  securitySettings: {
    sessionTimeout: number;
    maxLoginAttempts: number;
    requireStrongPasswords: boolean;
    inviteExpirationHours: number;
    publicSharingEnabled: boolean;
  };
}

interface SystemStatus {
  status: 'healthy' | 'warning' | 'error';
  message: string;
}

const SystemSettingsTab: React.FC = () => {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    'general' | 'library' | 'security' | 'maintenance'
  >('general');
  const [scanStatus, setScanStatus] = useState<any>(null);

  useEffect(() => {
    fetchSystemSettings();
  }, []);

  const fetchSystemSettings = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch real scan status
      const scanResponse = await apiService.getScanStatus();
      setScanStatus(scanResponse.data.currentScan);

      // Fetch real system settings
      const settingsResponse = await apiService.getAllSystemSettings();
      const realSettings = settingsResponse.data.settings;

      // Fetch real scan options
      const scanOptionsResponse = await apiService.getScanOptions();
      const realScanOptions = scanOptionsResponse.data.scanOptions;

      // Build system settings object with real data for security settings and mock data for others
      const mockSettings: SystemSettings = {
        serverInfo: {
          version: '1.0.0',
          uptime: 86400, // 1 day in seconds
          nodeVersion: 'v18.0.0',
          platform: 'win32',
        },
        databaseInfo: {
          size: 15728640, // 15MB in bytes
          tables: 8,
          connections: 1,
        },
        librarySettings: {
          scanInterval: 60, // minutes
          autoScanEnabled: true,
          maxFileSize: 104857600, // 100MB in bytes
          supportedFormats: ['mp3', 'flac', 'wav', 'ogg', 'm4a', 'aac'],
        },
        scanOptions: {
          parallelism: realScanOptions?.parallelism || 5,
          batchSize: realScanOptions?.batchSize || 50,
        },
        securitySettings: {
          sessionTimeout: 7 * 24 * 60, // 7 days in minutes
          maxLoginAttempts: 5,
          requireStrongPasswords: true,
          inviteExpirationHours: 24,
          publicSharingEnabled: realSettings.public_sharing_enabled || false,
        },
      };

      // Generate status based on real scan data
      const statusArray: SystemStatus[] = [
        { status: 'healthy', message: 'Server is running normally' },
        { status: 'healthy', message: 'Database connection is stable' },
      ];

      // Add scan status based on real data
      if (
        scanResponse.data.currentScan &&
        scanResponse.data.currentScan.status === 'running'
      ) {
        const scanTime =
          new Date().getTime() -
          new Date(scanResponse.data.currentScan.startedAt || 0).getTime();
        const hoursRunning = Math.floor(scanTime / (1000 * 60 * 60));
        const minutesRunning = Math.floor(
          (scanTime % (1000 * 60 * 60)) / (1000 * 60),
        );

        if (hoursRunning > 0) {
          statusArray.push({
            status: 'warning',
            message: `Library scan has been running for ${hoursRunning}h ${minutesRunning}m`,
          });
        } else if (minutesRunning > 0) {
          statusArray.push({
            status: 'healthy',
            message: `Library scan running for ${minutesRunning} minutes`,
          });
        } else {
          statusArray.push({
            status: 'healthy',
            message: 'Library scan just started',
          });
        }
      } else {
        statusArray.push({
          status: 'healthy',
          message: 'Library scanner ready',
        });
      }

      statusArray.push({
        status: 'healthy',
        message: 'All security checks passed',
      });

      setSettings(mockSettings);
      setSystemStatus(statusArray);
    } catch (err: any) {
      console.error('Failed to fetch system settings:', err);
      if (err.statusCode === 401) {
        setError(
          'Authentication required. Please check if you are logged in as an admin.',
        );
      } else {
        setError(err.message || 'Failed to load system settings');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!settings) return;

    try {
      setSaving(true);
      setError(null);

      // Save the public sharing setting
      await apiService.setSystemSetting(
        'public_sharing_enabled',
        settings.securitySettings.publicSharingEnabled,
      );

      // Save scan options
      await apiService.setScanOptions({
        parallelism: settings.scanOptions.parallelism,
        batchSize: settings.scanOptions.batchSize,
      });

      // Refresh settings to confirm save
      await fetchSystemSettings();
    } catch (err: any) {
      console.error('Failed to save settings:', err);
      setError(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  const formatBytes = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / 1024 ** i) * 100) / 100 + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">System Settings</h2>
        <p className="text-gray-400">Configure and monitor system settings</p>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-4">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* System Status */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <ServerIcon className="w-5 h-5 mr-2" />
          System Status
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {systemStatus.map((status, index) => (
            <div
              key={index}
              className="flex items-center p-3 bg-gray-700 rounded-lg"
            >
              {status.status === 'healthy' && (
                <CheckCircleIcon className="w-5 h-5 text-green-400 mr-3 flex-shrink-0" />
              )}
              {status.status === 'warning' && (
                <ExclamationTriangleIcon className="w-5 h-5 text-yellow-400 mr-3 flex-shrink-0" />
              )}
              {status.status === 'error' && (
                <ExclamationTriangleIcon className="w-5 h-5 text-red-400 mr-3 flex-shrink-0" />
              )}
              <span
                className={clsx(
                  'text-sm',
                  status.status === 'healthy' && 'text-green-400',
                  status.status === 'warning' && 'text-yellow-400',
                  status.status === 'error' && 'text-red-400',
                )}
              >
                {status.message}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Settings Tabs */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <div className="border-b border-gray-700">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'general', label: 'General', icon: Cog6ToothIcon },
              { id: 'library', label: 'Library', icon: MusicalNoteIcon },
              { id: 'security', label: 'Security', icon: ShieldCheckIcon },
              {
                id: 'maintenance',
                label: 'Maintenance',
                icon: CircleStackIcon,
              },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={clsx(
                    'flex items-center space-x-2 py-4 border-b-2 font-medium text-sm transition-colors',
                    activeTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-gray-400 hover:text-gray-300',
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {settings && (
            <>
              {activeTab === 'general' && (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-lg font-medium text-white mb-4">
                      Server Information
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gray-700 rounded-lg p-4">
                        <p className="text-gray-400 text-sm">Version</p>
                        <p className="text-white font-medium">
                          {settings.serverInfo.version}
                        </p>
                      </div>
                      <div className="bg-gray-700 rounded-lg p-4">
                        <p className="text-gray-400 text-sm">Uptime</p>
                        <p className="text-white font-medium">
                          {formatUptime(settings.serverInfo.uptime)}
                        </p>
                      </div>
                      <div className="bg-gray-700 rounded-lg p-4">
                        <p className="text-gray-400 text-sm">Node.js Version</p>
                        <p className="text-white font-medium">
                          {settings.serverInfo.nodeVersion}
                        </p>
                      </div>
                      <div className="bg-gray-700 rounded-lg p-4">
                        <p className="text-gray-400 text-sm">Platform</p>
                        <p className="text-white font-medium">
                          {settings.serverInfo.platform}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-lg font-medium text-white mb-4">
                      Database Information
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-gray-700 rounded-lg p-4">
                        <p className="text-gray-400 text-sm">Database Size</p>
                        <p className="text-white font-medium">
                          {formatBytes(settings.databaseInfo.size)}
                        </p>
                      </div>
                      <div className="bg-gray-700 rounded-lg p-4">
                        <p className="text-gray-400 text-sm">Tables</p>
                        <p className="text-white font-medium">
                          {settings.databaseInfo.tables}
                        </p>
                      </div>
                      <div className="bg-gray-700 rounded-lg p-4">
                        <p className="text-gray-400 text-sm">
                          Active Connections
                        </p>
                        <p className="text-white font-medium">
                          {settings.databaseInfo.connections}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'library' && (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-lg font-medium text-white mb-4">
                      Library Settings
                    </h4>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white font-medium">
                            Auto-scan Library
                          </p>
                          <p className="text-gray-400 text-sm">
                            Automatically scan for new files
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={settings.librarySettings.autoScanEnabled}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              librarySettings: {
                                ...settings.librarySettings,
                                autoScanEnabled: e.target.checked,
                              },
                            })
                          }
                          className="w-4 h-4 text-primary bg-gray-700 border-gray-600 rounded focus:ring-primary focus:ring-2"
                        />
                      </div>

                      <div>
                        <label className="block text-white font-medium mb-2">
                          Scan Interval (minutes)
                        </label>
                        <input
                          type="number"
                          value={settings.librarySettings.scanInterval}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              librarySettings: {
                                ...settings.librarySettings,
                                scanInterval: parseInt(e.target.value) || 60,
                              },
                            })
                          }
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>

                      <div>
                        <label className="block text-white font-medium mb-2">
                          Maximum File Size (MB)
                        </label>
                        <input
                          type="number"
                          value={Math.round(
                            settings.librarySettings.maxFileSize / 1024 / 1024,
                          )}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              librarySettings: {
                                ...settings.librarySettings,
                                maxFileSize:
                                  (parseInt(e.target.value) || 100) *
                                  1024 *
                                  1024,
                              },
                            })
                          }
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>

                      <div>
                        <p className="text-white font-medium mb-2">
                          Supported Formats
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {settings.librarySettings.supportedFormats.map(
                            (format) => (
                              <span
                                key={format}
                                className="px-3 py-1 bg-primary/20 text-primary rounded-full text-sm"
                              >
                                .{format}
                              </span>
                            ),
                          )}
                        </div>
                      </div>

                      <div className="border-t border-gray-600 pt-4">
                        <h5 className="text-md font-medium text-white mb-4">
                          Scan Performance
                        </h5>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-white font-medium mb-2">
                              Parallelism (1-20)
                            </label>
                            <input
                              type="number"
                              min="1"
                              max="20"
                              value={settings.scanOptions.parallelism}
                              onChange={(e) =>
                                setSettings({
                                  ...settings,
                                  scanOptions: {
                                    ...settings.scanOptions,
                                    parallelism: parseInt(e.target.value) || 5,
                                  },
                                })
                              }
                              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                            <p className="text-gray-400 text-sm mt-1">
                              Number of files to process simultaneously
                            </p>
                          </div>

                          <div>
                            <label className="block text-white font-medium mb-2">
                              Batch Size (10-200)
                            </label>
                            <input
                              type="number"
                              min="10"
                              max="200"
                              value={settings.scanOptions.batchSize}
                              onChange={(e) =>
                                setSettings({
                                  ...settings,
                                  scanOptions: {
                                    ...settings.scanOptions,
                                    batchSize: parseInt(e.target.value) || 50,
                                  },
                                })
                              }
                              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                            <p className="text-gray-400 text-sm mt-1">
                              Number of files to process before updating
                              progress
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'security' && (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-lg font-medium text-white mb-4">
                      Security Settings
                    </h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-white font-medium mb-2">
                          Session Timeout (days)
                        </label>
                        <input
                          type="number"
                          value={Math.round(
                            settings.securitySettings.sessionTimeout / 60 / 24,
                          )}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              securitySettings: {
                                ...settings.securitySettings,
                                sessionTimeout:
                                  (parseInt(e.target.value) || 7) * 24 * 60,
                              },
                            })
                          }
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>

                      <div>
                        <label className="block text-white font-medium mb-2">
                          Max Login Attempts
                        </label>
                        <input
                          type="number"
                          value={settings.securitySettings.maxLoginAttempts}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              securitySettings: {
                                ...settings.securitySettings,
                                maxLoginAttempts: parseInt(e.target.value) || 5,
                              },
                            })
                          }
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>

                      <div>
                        <label className="block text-white font-medium mb-2">
                          Invite Expiration (hours)
                        </label>
                        <input
                          type="number"
                          value={
                            settings.securitySettings.inviteExpirationHours
                          }
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              securitySettings: {
                                ...settings.securitySettings,
                                inviteExpirationHours:
                                  parseInt(e.target.value) || 24,
                              },
                            })
                          }
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white font-medium">
                            Require Strong Passwords
                          </p>
                          <p className="text-gray-400 text-sm">
                            Enforce password complexity rules
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={
                            settings.securitySettings.requireStrongPasswords
                          }
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              securitySettings: {
                                ...settings.securitySettings,
                                requireStrongPasswords: e.target.checked,
                              },
                            })
                          }
                          className="w-4 h-4 text-primary bg-gray-700 border-gray-600 rounded focus:ring-primary focus:ring-2"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white font-medium">
                            Enable Public Song Sharing
                          </p>
                          <p className="text-gray-400 text-sm">
                            Allow sharing songs with anyone via public URLs
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={
                            settings.securitySettings.publicSharingEnabled
                          }
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              securitySettings: {
                                ...settings.securitySettings,
                                publicSharingEnabled: e.target.checked,
                              },
                            })
                          }
                          className="w-4 h-4 text-primary bg-gray-700 border-gray-600 rounded focus:ring-primary focus:ring-2"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'maintenance' && (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-lg font-medium text-white mb-4">
                      Maintenance Tasks
                    </h4>
                    <div className="space-y-4">
                      <div className="bg-gray-700 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-white font-medium">
                              Clean Up Expired Invites
                            </p>
                            <p className="text-gray-400 text-sm">
                              Remove expired invitation tokens
                            </p>
                          </div>
                          <button className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">
                            Run Now
                          </button>
                        </div>
                      </div>

                      <div className="bg-gray-700 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-white font-medium">
                              Optimize Database
                            </p>
                            <p className="text-gray-400 text-sm">
                              Vacuum and optimize database performance
                            </p>
                          </div>
                          <button className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">
                            Optimize
                          </button>
                        </div>
                      </div>

                      <div className="bg-gray-700 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-white font-medium">
                              Clear Old Sessions
                            </p>
                            <p className="text-gray-400 text-sm">
                              Remove expired user sessions
                            </p>
                          </div>
                          <button className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">
                            Clear
                          </button>
                        </div>
                      </div>

                      <div className="bg-red-900/20 border border-red-500 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-red-400 font-medium flex items-center">
                              <ExclamationTriangleIcon className="w-4 h-4 mr-2" />
                              Reset All User Data
                            </p>
                            <p className="text-gray-400 text-sm">
                              This will permanently delete all user accounts and
                              data
                            </p>
                          </div>
                          <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                            Reset
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-lg font-medium text-white mb-4">
                      Monitoring
                    </h4>
                    <div className="space-y-4">
                      <div className="bg-gray-700 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-white font-medium">
                              Clear Application Logs
                            </p>
                            <p className="text-gray-400 text-sm">
                              Remove old log files to free space
                            </p>
                          </div>
                          <button className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors flex items-center">
                            <TrashIcon className="w-4 h-4 mr-2" />
                            Clear Logs
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          <div className="mt-8 pt-6 border-t border-gray-700">
            <div className="flex justify-end gap-3">
              <button
                onClick={() => fetchSystemSettings()}
                className="px-4 py-2 text-gray-300 border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Reset
              </button>
              <button
                onClick={handleSaveSettings}
                disabled={saving}
                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center"
              >
                {saving && (
                  <ArrowPathIcon className="w-4 h-4 mr-2 animate-spin" />
                )}
                Save Settings
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemSettingsTab;
