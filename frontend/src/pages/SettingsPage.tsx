import React, { useState, useEffect } from 'react';
import {
  UserIcon,
  KeyIcon,
  BellIcon,
  MusicalNoteIcon,
  EyeIcon,
  EyeSlashIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PhotoIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { apiService } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { getBaseUrl } from '../config/config';
import clsx from 'clsx';

interface UserSettings {
  profile: {
    username: string;
    email: string;
  };
  preferences: {
    theme: 'dark' | 'light' | 'system';
    autoPlay: boolean;
    notifications: boolean;
    crossfadeEnabled: boolean;
    crossfadeDuration: number;
    defaultVolume: number;
  };
}

interface PasswordChangeData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const SettingsPage: React.FC = () => {
  const { user, getProfile, updateProfilePicture, deleteProfilePicture } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'preferences'>('profile');
  const [settings, setSettings] = useState<UserSettings>({
    profile: {
      username: user?.username || '',
      email: user?.email || ''
    },
    preferences: {
      theme: 'dark',
      autoPlay: true,
      notifications: true,
      crossfadeEnabled: false,
      crossfadeDuration: 3,
      defaultVolume: 80
    }
  });
  const [passwordData, setPasswordData] = useState<PasswordChangeData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setSettings(prev => ({
        ...prev,
        profile: {
          username: user.username || '',
          email: user.email || ''
        }
      }));
    }
  }, [user]);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      
      // Update profile picture if a new one is selected
      if (profilePictureFile) {
        await updateProfilePicture(profilePictureFile);
        setProfilePictureFile(null);
        setPreviewUrl(null);
      }
      
      // In a real implementation, you'd call apiService.updateProfile(settings.profile)
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      // Refresh user profile from server
      await getProfile();
      
      showMessage('success', 'Profile updated successfully');
    } catch (err: any) {
      console.error('Failed to update profile:', err);
      showMessage('error', err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showMessage('error', 'New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      showMessage('error', 'Password must be at least 8 characters long');
      return;
    }

    try {
      setSaving(true);
      await apiService.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      
      showMessage('success', 'Password changed successfully');
    } catch (err: any) {
      console.error('Failed to change password:', err);
      showMessage('error', err.message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePreferences = async () => {
    try {
      setSaving(true);
      // In a real implementation, you'd call apiService.updatePreferences(settings.preferences)
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      // Save to localStorage for immediate effect
      localStorage.setItem('userPreferences', JSON.stringify(settings.preferences));
      
      showMessage('success', 'Preferences saved successfully');
    } catch (err: any) {
      console.error('Failed to save preferences:', err);
      showMessage('error', err.message || 'Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const handleProfilePictureSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        showMessage('error', 'Please select a valid image file');
        return;
      }
      
      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        showMessage('error', 'Image must be smaller than 5MB');
        return;
      }
      
      setProfilePictureFile(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };


  const handleDeleteProfilePicture = async () => {
    try {
      setSaving(true);
      await deleteProfilePicture();
      
      setProfilePictureFile(null);
      setPreviewUrl(null);
      
      showMessage('success', 'Profile picture removed successfully');
    } catch (err: any) {
      console.error('Failed to delete profile picture:', err);
      showMessage('error', err.message || 'Failed to delete profile picture');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-white mb-2">Settings</h1>
        <p className="text-gray-400">Manage your account and preferences</p>
      </div>

      {/* Message */}
      {message && (
        <div className={clsx(
          'rounded-lg p-4 flex items-center',
          message.type === 'success' 
            ? 'bg-green-900/20 border border-green-500 text-green-400'
            : 'bg-red-900/20 border border-red-500 text-red-400'
        )}>
          {message.type === 'success' ? (
            <CheckCircleIcon className="w-5 h-5 mr-2 flex-shrink-0" />
          ) : (
            <ExclamationTriangleIcon className="w-5 h-5 mr-2 flex-shrink-0" />
          )}
          {message.text}
        </div>
      )}

      {/* Settings Tabs */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <div className="border-b border-gray-700">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'profile', label: 'Profile', icon: UserIcon },
              { id: 'password', label: 'Password', icon: KeyIcon },
              { id: 'preferences', label: 'Preferences', icon: MusicalNoteIcon }
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
                      : 'border-transparent text-gray-400 hover:text-gray-300'
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
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              {/* Profile Picture Section */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Profile Picture</h3>
                <div className="flex items-start space-x-6">
                  {/* Current Profile Picture */}
                  <div className="flex-shrink-0">
                    <div className="w-24 h-24 rounded-full bg-gray-700 overflow-hidden border-2 border-gray-600">
                      {user?.profile_picture || previewUrl ? (
                        <img
                          src={previewUrl || `${getBaseUrl()}${user?.profile_picture}`}
                          alt={user?.username || 'Profile'}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <UserIcon className="w-12 h-12 text-gray-400" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Profile Picture Controls */}
                  <div className="flex-1 space-y-4">
                    <div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleProfilePictureSelect}
                        className="hidden"
                        id="profile-picture-input"
                      />
                      <div className="flex space-x-3">
                        <label
                          htmlFor="profile-picture-input"
                          className="inline-flex items-center px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg cursor-pointer transition-colors"
                        >
                          <PhotoIcon className="w-4 h-4 mr-2" />
                          Choose Photo
                        </label>
                        
                        {user?.profile_picture && (
                          <button
                            onClick={handleDeleteProfilePicture}
                            disabled={saving}
                            className="inline-flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50 transition-colors"
                          >
                            <TrashIcon className="w-4 h-4 mr-2" />
                            Remove
                          </button>
                        )}
                      </div>
                      
                      {profilePictureFile && (
                        <div className="mt-3 text-sm text-green-400">
                          Profile picture ready to upload. Click "Save Profile" to apply changes.
                        </div>
                      )}
                    </div>
                    
                    <div className="text-sm text-gray-400">
                      <p>• JPG, PNG, or GIF</p>
                      <p>• Maximum 5MB</p>
                      <p>• Recommended: 400x400 pixels</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Profile Information</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Username
                    </label>
                    <input
                      type="text"
                      value={settings.profile.username}
                      onChange={(e) => setSettings({
                        ...settings,
                        profile: { ...settings.profile, username: e.target.value }
                      })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={settings.profile.email}
                      onChange={(e) => setSettings({
                        ...settings,
                        profile: { ...settings.profile, email: e.target.value }
                      })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </div>
          )}

          {/* Password Tab */}
          {activeTab === 'password' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Change Password</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Current Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords.current ? 'text' : 'password'}
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData({
                          ...passwordData,
                          currentPassword: e.target.value
                        })}
                        className="w-full px-3 py-2 pr-10 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords({
                          ...showPasswords,
                          current: !showPasswords.current
                        })}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                      >
                        {showPasswords.current ? (
                          <EyeSlashIcon className="w-4 h-4" />
                        ) : (
                          <EyeIcon className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords.new ? 'text' : 'password'}
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({
                          ...passwordData,
                          newPassword: e.target.value
                        })}
                        className="w-full px-3 py-2 pr-10 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords({
                          ...showPasswords,
                          new: !showPasswords.new
                        })}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                      >
                        {showPasswords.new ? (
                          <EyeSlashIcon className="w-4 h-4" />
                        ) : (
                          <EyeIcon className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords.confirm ? 'text' : 'password'}
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData({
                          ...passwordData,
                          confirmPassword: e.target.value
                        })}
                        className="w-full px-3 py-2 pr-10 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords({
                          ...showPasswords,
                          confirm: !showPasswords.confirm
                        })}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                      >
                        {showPasswords.confirm ? (
                          <EyeSlashIcon className="w-4 h-4" />
                        ) : (
                          <EyeIcon className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-4 p-4 bg-blue-900/20 border border-blue-500 rounded-lg">
                  <p className="text-blue-400 text-sm">
                    Password requirements:
                  </p>
                  <ul className="text-gray-300 text-sm mt-2 space-y-1">
                    <li>• At least 8 characters long</li>
                    <li>• Mix of uppercase and lowercase letters recommended</li>
                    <li>• Include numbers and special characters for better security</li>
                  </ul>
                </div>
              </div>

              <div className="pt-4">
                <button
                  onClick={handleChangePassword}
                  disabled={saving || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                  className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Changing...' : 'Change Password'}
                </button>
              </div>
            </div>
          )}

          {/* Preferences Tab */}
          {activeTab === 'preferences' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Music Preferences</h3>
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">Auto-play similar songs</p>
                      <p className="text-gray-400 text-sm">Continue playing similar music when queue ends</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.preferences.autoPlay}
                      onChange={(e) => setSettings({
                        ...settings,
                        preferences: { ...settings.preferences, autoPlay: e.target.checked }
                      })}
                      className="w-4 h-4 text-primary bg-gray-700 border-gray-600 rounded focus:ring-primary focus:ring-2"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">Crossfade between songs</p>
                      <p className="text-gray-400 text-sm">Smoothly transition between tracks</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.preferences.crossfadeEnabled}
                      onChange={(e) => setSettings({
                        ...settings,
                        preferences: { ...settings.preferences, crossfadeEnabled: e.target.checked }
                      })}
                      className="w-4 h-4 text-primary bg-gray-700 border-gray-600 rounded focus:ring-primary focus:ring-2"
                    />
                  </div>

                  {settings.preferences.crossfadeEnabled && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Crossfade Duration: {settings.preferences.crossfadeDuration}s
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={settings.preferences.crossfadeDuration}
                        onChange={(e) => setSettings({
                          ...settings,
                          preferences: { ...settings.preferences, crossfadeDuration: parseInt(e.target.value) }
                        })}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                        style={{
                          background: `linear-gradient(to right, #82AAF2 0%, #82AAF2 ${(settings.preferences.crossfadeDuration / 10) * 100}%, #374151 ${(settings.preferences.crossfadeDuration / 10) * 100}%, #374151 100%)`
                        }}
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Default Volume: {settings.preferences.defaultVolume}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={settings.preferences.defaultVolume}
                      onChange={(e) => setSettings({
                        ...settings,
                        preferences: { ...settings.preferences, defaultVolume: parseInt(e.target.value) }
                      })}
                      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                      style={{
                        background: `linear-gradient(to right, #82AAF2 0%, #82AAF2 ${settings.preferences.defaultVolume}%, #374151 ${settings.preferences.defaultVolume}%, #374151 100%)`
                      }}
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-4">App Preferences</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Theme
                    </label>
                    <select
                      value={settings.preferences.theme}
                      onChange={(e) => setSettings({
                        ...settings,
                        preferences: { ...settings.preferences, theme: e.target.value as 'dark' | 'light' | 'system' }
                      })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="dark">Dark</option>
                      <option value="light">Light</option>
                      <option value="system">System</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">Enable notifications</p>
                      <p className="text-gray-400 text-sm">Show browser notifications for new songs</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.preferences.notifications}
                      onChange={(e) => setSettings({
                        ...settings,
                        preferences: { ...settings.preferences, notifications: e.target.checked }
                      })}
                      className="w-4 h-4 text-primary bg-gray-700 border-gray-600 rounded focus:ring-primary focus:ring-2"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button
                  onClick={handleSavePreferences}
                  disabled={saving}
                  className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Saving...' : 'Save Preferences'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;