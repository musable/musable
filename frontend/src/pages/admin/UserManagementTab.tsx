import React, { useEffect, useState } from 'react';
import {
  UsersIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ShieldCheckIcon,
  UserIcon,
  ClipboardDocumentIcon,
  XMarkIcon,
  CheckIcon,
  PhotoIcon
} from '@heroicons/react/24/outline';
import { apiService } from '../../services/api';
import { getBaseUrl } from '../../config/config';
import { User, Invite } from '../../types';
import clsx from 'clsx';

interface UserModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (userData: Partial<User>) => void;
  isLoading: boolean;
}

const UserModal: React.FC<UserModalProps> = ({ user, isOpen, onClose, onSave, isLoading }) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    is_admin: false
  });

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || '',
        email: user.email || '',
        is_admin: Boolean(user.is_admin)
      });
    } else {
      setFormData({ username: '', email: '', is_admin: false });
    }
  }, [user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">
            {user ? 'Edit User' : 'Create User'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Username
            </label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_admin"
              checked={formData.is_admin}
              onChange={(e) => setFormData({ ...formData, is_admin: e.target.checked })}
              className="w-4 h-4 text-primary bg-gray-700 border-gray-600 rounded focus:ring-primary focus:ring-2"
            />
            <label htmlFor="is_admin" className="ml-2 text-sm text-gray-300">
              Administrator privileges
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-300 border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {isLoading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const UserManagementTab: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [userModalLoading, setUserModalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedInvites, setCopiedInvites] = useState<Set<string>>(new Set());
  const [selectedUserForProfilePicture, setSelectedUserForProfilePicture] = useState<User | null>(null);
  const [profilePictureLoading, setProfilePictureLoading] = useState(false);

  const formatLastActive = (lastLogin: string | null | undefined) => {
    if (!lastLogin) return 'Never';
    
    const lastLoginDate = new Date(lastLogin);
    const now = new Date();
    const diffMs = now.getTime() - lastLoginDate.getTime();
    
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffDays > 0) {
      if (diffHours > 0) {
        return `${diffDays} day${diffDays !== 1 ? 's' : ''} and ${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
      }
      return `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
    } else if (diffHours > 0) {
      if (diffMinutes > 0) {
        return `${diffHours} hour${diffHours !== 1 ? 's' : ''} and ${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''}`;
      }
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''}`;
    } else {
      return 'Just now';
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [usersResponse, invitesResponse] = await Promise.all([
        apiService.getAllUsers(),
        apiService.getAllInvites()
      ]);
      setUsers(usersResponse.data.users);
      setInvites(invitesResponse.data.invites);
    } catch (err: any) {
      console.error('Failed to fetch user data:', err);
      setError(err.message || 'Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvite = async () => {
    try {
      await apiService.createInvite(24);
      await fetchData();
    } catch (err: any) {
      console.error('Failed to create invite:', err);
      setError(err.message || 'Failed to create invite');
    }
  };

  const handleRevokeInvite = async (inviteId: number) => {
    try {
      await apiService.revokeInvite(inviteId);
      await fetchData();
    } catch (err: any) {
      console.error('Failed to revoke invite:', err);
      setError(err.message || 'Failed to revoke invite');
    }
  };

  const handleSaveUser = async (userData: Partial<User>) => {
    try {
      setUserModalLoading(true);
      if (selectedUser) {
        await apiService.updateUser(selectedUser.id!, userData);
      }
      await fetchData();
      setShowUserModal(false);
      setSelectedUser(null);
    } catch (err: any) {
      console.error('Failed to save user:', err);
      setError(err.message || 'Failed to save user');
    } finally {
      setUserModalLoading(false);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      await apiService.deleteUser(userId);
      await fetchData();
    } catch (err: any) {
      console.error('Failed to delete user:', err);
      setError(err.message || 'Failed to delete user');
    }
  };

  const handleProfilePictureUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedUserForProfilePicture) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file');
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be smaller than 5MB');
      return;
    }

    try {
      setProfilePictureLoading(true);
      await apiService.adminUpdateUserProfilePicture(selectedUserForProfilePicture.id!, file);
      await fetchData(); // Refresh user list
      setSelectedUserForProfilePicture(null);
      setError(null);
    } catch (err: any) {
      console.error('Failed to update profile picture:', err);
      setError(err.message || 'Failed to update profile picture');
    } finally {
      setProfilePictureLoading(false);
    }
  };

  const handleDeleteProfilePicture = async (userId: number) => {
    if (!window.confirm('Are you sure you want to remove this user\'s profile picture?')) {
      return;
    }

    try {
      setProfilePictureLoading(true);
      await apiService.adminDeleteUserProfilePicture(userId);
      await fetchData(); // Refresh user list
      setError(null);
    } catch (err: any) {
      console.error('Failed to delete profile picture:', err);
      setError(err.message || 'Failed to delete profile picture');
    } finally {
      setProfilePictureLoading(false);
    }
  };

  const copyInviteLink = (token: string) => {
    const inviteUrl = `${window.location.origin}/register?invite=${token}`;
    navigator.clipboard.writeText(inviteUrl).then(() => {
      // Add token to copied set for animation
      setCopiedInvites(prev => {
        const newSet = new Set(prev);
        newSet.add(token);
        return newSet;
      });
      
      // Remove from copied set after animation duration
      setTimeout(() => {
        setCopiedInvites(prev => {
          const newSet = new Set(prev);
          newSet.delete(token);
          return newSet;
        });
      }, 2000); // Animation duration
    });
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">User Management</h2>
          <p className="text-gray-400">Manage system users and invitations</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-4">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* Users Section */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center">
            <UsersIcon className="w-5 h-5 mr-2" />
            Users ({users.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-3 px-4 font-medium text-gray-300">User</th>
                <th className="text-left py-3 px-4 font-medium text-gray-300">Email</th>
                <th className="text-left py-3 px-4 font-medium text-gray-300">Role</th>
                <th className="text-left py-3 px-4 font-medium text-gray-300">Created</th>
                <th className="text-left py-3 px-4 font-medium text-gray-300">Last Active</th>
                <th className="text-right py-3 px-4 font-medium text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                  <td className="py-3 px-4">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center mr-3 overflow-hidden">
                        {user.profile_picture ? (
                          <img
                            src={`${getBaseUrl()}${user.profile_picture}`}
                            alt={user.username}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <UserIcon className="w-4 h-4 text-primary" />
                        )}
                      </div>
                      <div>
                        <p className="text-white font-medium">{user.username}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-gray-300">{user.email}</td>
                  <td className="py-3 px-4">
                    <span className={clsx(
                      'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                      user.is_admin 
                        ? 'bg-primary/20 text-primary' 
                        : 'bg-gray-700 text-gray-300'
                    )}>
                      {user.is_admin && <ShieldCheckIcon className="w-3 h-3 mr-1" />}
                      {user.is_admin ? 'Admin' : 'User'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-300">
                    {new Date(user.created_at!).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4 text-gray-300">
                    {formatLastActive(user.last_login)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleProfilePictureUpload}
                        className="hidden"
                        id={`profile-picture-input-${user.id}`}
                      />
                      <label
                        htmlFor={`profile-picture-input-${user.id}`}
                        onClick={() => setSelectedUserForProfilePicture(user)}
                        className="p-1 text-gray-400 hover:text-blue-400 transition-colors cursor-pointer"
                        title="Change profile picture"
                      >
                        <PhotoIcon className="w-4 h-4" />
                      </label>
                      {user.profile_picture && (
                        <button
                          onClick={() => handleDeleteProfilePicture(user.id!)}
                          disabled={profilePictureLoading}
                          className="p-1 text-gray-400 hover:text-orange-400 transition-colors disabled:opacity-50"
                          title="Remove profile picture"
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setShowUserModal(true);
                        }}
                        className="p-1 text-gray-400 hover:text-white transition-colors"
                        title="Edit user"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id!)}
                        className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                        title="Delete user"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invites Section */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">
            Active Invitations ({invites.length})
          </h3>
          <button
            onClick={handleCreateInvite}
            className="flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Create Invite
          </button>
        </div>

        {invites.length > 0 ? (
          <div className="space-y-3">
            {invites.map((invite) => (
              <div key={invite.id} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                <div className="flex-1">
                  <p className="text-white font-medium">Invite Link</p>
                  <p className="text-gray-300 text-sm font-mono bg-gray-800 px-2 py-1 rounded mt-1 break-all">
                    {`${window.location.origin}/register?invite=${invite.token}`}
                  </p>
                  <p className="text-gray-400 text-xs mt-1">
                    Expires: {new Date(invite.expires_at!).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyInviteLink(invite.token)}
                    className={clsx(
                      "p-2 transition-all duration-200 transform",
                      copiedInvites.has(invite.token) 
                        ? "text-green-400 scale-110 bg-green-400/10 rounded" 
                        : "text-gray-400 hover:text-white"
                    )}
                    title={copiedInvites.has(invite.token) ? "Copied!" : "Copy invite link"}
                  >
                    {copiedInvites.has(invite.token) ? (
                      <CheckIcon className="w-4 h-4" />
                    ) : (
                      <ClipboardDocumentIcon className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => handleRevokeInvite(invite.id!)}
                    className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                    title="Revoke invite"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-center py-8">
            No active invitations. Create one to invite new users.
          </p>
        )}
      </div>

      <UserModal
        user={selectedUser}
        isOpen={showUserModal}
        onClose={() => {
          setShowUserModal(false);
          setSelectedUser(null);
        }}
        onSave={handleSaveUser}
        isLoading={userModalLoading}
      />
    </div>
  );
};

export default UserManagementTab;