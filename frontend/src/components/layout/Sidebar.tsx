import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  HomeIcon, 
  MagnifyingGlassIcon,
  MusicalNoteIcon,
  HeartIcon,
  QueueListIcon,
  ClockIcon,
  Cog6ToothIcon,
  ShieldCheckIcon,
  PlusIcon,
  RectangleStackIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline';
import { 
  HomeIcon as HomeIconSolid,
  MagnifyingGlassIcon as MagnifyingGlassIconSolid,
  MusicalNoteIcon as MusicalNoteIconSolid,
  HeartIcon as HeartIconSolid,
  QueueListIcon as QueueListIconSolid,
  ClockIcon as ClockIconSolid,
  Cog6ToothIcon as Cog6ToothIconSolid,
  ShieldCheckIcon as ShieldCheckIconSolid
} from '@heroicons/react/24/solid';
import { useAuthStore } from '../../stores/authStore';
import { useFollowedAlbumsStore } from '../../stores/followedAlbumsStore';
import { useFollowedPlaylistsStore } from '../../stores/followedPlaylistsStore';
import { apiService } from '../../services/api';
import { Playlist } from '../../types';
import clsx from 'clsx';

interface SidebarLinkProps {
  to: string;
  icon: React.ComponentType<any>;
  solidIcon: React.ComponentType<any>;
  children: React.ReactNode;
  className?: string;
}

const SidebarLink: React.FC<SidebarLinkProps> = ({ 
  to, 
  icon: Icon, 
  solidIcon: SolidIcon, 
  children, 
  className 
}) => (
  <NavLink
    to={to}
    className={({ isActive }) => clsx(
      'flex items-center space-x-3 px-4 py-2 rounded-lg transition-all duration-200 group',
      isActive 
        ? 'bg-gray-800 text-white' 
        : 'text-gray-400 hover:text-white hover:bg-gray-800/50',
      className
    )}
  >
    {({ isActive }) => (
      <>
        {isActive ? (
          <SolidIcon className="w-5 h-5 text-primary" />
        ) : (
          <Icon className="w-5 h-5 group-hover:text-primary transition-colors" />
        )}
        <span className="font-medium">{children}</span>
      </>
    )}
  </NavLink>
);

const Sidebar: React.FC = () => {
  const { user } = useAuthStore();
  const { followedAlbums } = useFollowedAlbumsStore();
  const { followedPlaylists } = useFollowedPlaylistsStore();
  const navigate = useNavigate();
  const [userPlaylists, setUserPlaylists] = useState<Playlist[]>([]);
  const [expandedSections, setExpandedSections] = useState({
    userPlaylists: false,
    followedPlaylists: false,
    followedAlbums: false
  });

  useEffect(() => {
    if (user) {
      loadUserPlaylists();
    }
  }, [user]);

  const loadUserPlaylists = async () => {
    try {
      const response = await apiService.getUserPlaylists();
      if (response.success && response.data) {
        setUserPlaylists(response.data.playlists || []);
      }
    } catch (error) {
      console.error('Failed to load user playlists:', error);
    }
  };

  const handleCreatePlaylist = () => {
    // TODO: Open create playlist modal
    navigate('/playlists');
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const getVisibleItems = <T extends any[]>(items: T, section: keyof typeof expandedSections): T => {
    if (items.length <= 5) return items;
    return expandedSections[section] ? items : items.slice(0, 5) as T;
  };

  const shouldShowExpandButton = <T extends any[]>(items: T): boolean => {
    return items.length > 5;
  };

  return (
    <div className="hidden md:flex w-64 bg-black border-r border-gray-800 flex-col h-full overflow-y-auto sidebar-scrollable" 
         style={{ 
           scrollbarWidth: 'thin', 
           scrollbarColor: '#4b5563 #1f1f1f'
         }}>
      {/* Logo */}
      <div className="p-6 border-b border-gray-800">
        <h1 className="text-2xl font-bold gradient-text">
          Musable
        </h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2 flex flex-col">
        <div className="space-y-1">
          <SidebarLink 
            to="/" 
            icon={HomeIcon} 
            solidIcon={HomeIconSolid}
          >
            Home
          </SidebarLink>
          
          <SidebarLink 
            to="/search" 
            icon={MagnifyingGlassIcon} 
            solidIcon={MagnifyingGlassIconSolid}
          >
            Search
          </SidebarLink>
          
          <SidebarLink 
            to="/library" 
            icon={MusicalNoteIcon} 
            solidIcon={MusicalNoteIconSolid}
          >
            Your Library
          </SidebarLink>
          
          <SidebarLink 
            to="/favorites" 
            icon={HeartIcon} 
            solidIcon={HeartIconSolid}
          >
            Liked Songs
          </SidebarLink>
        </div>

        <div className="pt-4 border-t border-gray-800 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
              Playlists
            </span>
            <button
              onClick={handleCreatePlaylist}
              className="p-1 rounded-full text-gray-400 hover:text-white hover:bg-gray-800 transition-all"
              title="Create playlist"
            >
              <PlusIcon className="w-4 h-4" />
            </button>
          </div>
          
          <SidebarLink 
            to="/playlists" 
            icon={QueueListIcon} 
            solidIcon={QueueListIconSolid}
          >
            All Playlists
          </SidebarLink>
          
          <SidebarLink 
            to="/history" 
            icon={ClockIcon} 
            solidIcon={ClockIconSolid}
          >
            Recently Played
          </SidebarLink>

          {/* Playlists Section */}
          <div className="mt-4">
            <div className="space-y-4">
                {/* User's Own Playlists */}
                {userPlaylists.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2 px-2">
                      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Your Playlists
                      </h3>
                      {shouldShowExpandButton(userPlaylists) && (
                        <button
                          onClick={() => toggleSection('userPlaylists')}
                          className="p-1 rounded-full text-gray-400 hover:text-white hover:bg-gray-800 transition-all"
                          title={expandedSections.userPlaylists ? 'Show less' : 'Show more'}
                        >
                          {expandedSections.userPlaylists ? (
                            <ChevronUpIcon className="w-4 h-4" />
                          ) : (
                            <ChevronDownIcon className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </div>
                    <div className="space-y-1">
                      {getVisibleItems(userPlaylists, 'userPlaylists').map((playlist) => (
                        <button
                          key={`user-${playlist.id}`}
                          onClick={() => navigate(`/playlist/${playlist.id}`)}
                          className="w-full flex items-center space-x-3 px-2 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800/50 transition-all duration-200 group text-left"
                        >
                          <div className="w-8 h-8 rounded bg-gradient-to-br from-primary/20 to-purple-600/20 flex-shrink-0 flex items-center justify-center">
                            <QueueListIcon className="w-4 h-4 text-white/80" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                              {playlist.name}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              {playlist.is_public ? 'Public' : 'Private'}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Followed Playlists */}
                {followedPlaylists.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2 px-2">
                      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Followed Playlists
                      </h3>
                      {shouldShowExpandButton(followedPlaylists) && (
                        <button
                          onClick={() => toggleSection('followedPlaylists')}
                          className="p-1 rounded-full text-gray-400 hover:text-white hover:bg-gray-800 transition-all"
                          title={expandedSections.followedPlaylists ? 'Show less' : 'Show more'}
                        >
                          {expandedSections.followedPlaylists ? (
                            <ChevronUpIcon className="w-4 h-4" />
                          ) : (
                            <ChevronDownIcon className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </div>
                    <div className="space-y-1">
                      {getVisibleItems(followedPlaylists, 'followedPlaylists').map((playlist) => (
                        <button
                          key={`followed-${playlist.id}`}
                          onClick={() => navigate(`/playlist/${playlist.id}`)}
                          className="w-full flex items-center space-x-3 px-2 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800/50 transition-all duration-200 group text-left"
                        >
                          <div className="w-8 h-8 rounded bg-gradient-to-br from-blue-600/20 to-purple-600/20 flex-shrink-0 flex items-center justify-center">
                            <QueueListIcon className="w-4 h-4 text-blue-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                              {playlist.name}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              Followed
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Followed Albums */}
                {followedAlbums.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2 px-2">
                      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Followed Albums
                      </h3>
                      {shouldShowExpandButton(followedAlbums) && (
                        <button
                          onClick={() => toggleSection('followedAlbums')}
                          className="p-1 rounded-full text-gray-400 hover:text-white hover:bg-gray-800 transition-all"
                          title={expandedSections.followedAlbums ? 'Show less' : 'Show more'}
                        >
                          {expandedSections.followedAlbums ? (
                            <ChevronUpIcon className="w-4 h-4" />
                          ) : (
                            <ChevronDownIcon className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </div>
                    <div className="space-y-1">
                      {getVisibleItems(followedAlbums, 'followedAlbums').map((album) => (
                        <button
                          key={`album-${album.id}`}
                          onClick={() => navigate(`/album/${album.id}`)}
                          className="w-full flex items-center space-x-3 px-2 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800/50 transition-all duration-200 group text-left"
                        >
                          <div className="w-8 h-8 rounded bg-gray-700 flex-shrink-0 overflow-hidden">
                            {album.artwork_path ? (
                              <img
                                src={apiService.getArtworkUrl(album.artwork_path)}
                                alt={album.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <RectangleStackIcon className="w-4 h-4 text-gray-500" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                              {album.title}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              {album.artist_name}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          </div>
        </div>
      </nav>

      {/* Bottom section */}
      <div className="p-4 border-t border-gray-800 space-y-1">
        <SidebarLink 
          to="/settings" 
          icon={Cog6ToothIcon} 
          solidIcon={Cog6ToothIconSolid}
        >
          Settings
        </SidebarLink>
        
        {/* Show admin panel for admin users */}
        {Boolean(user?.is_admin) && (
          <SidebarLink 
            to="/admin" 
            icon={ShieldCheckIcon} 
            solidIcon={ShieldCheckIconSolid}
            className="text-yellow-400 hover:text-yellow-300"
          >
            Admin Panel
          </SidebarLink>
        )}
      </div>
    </div>
  );
};

export default Sidebar;