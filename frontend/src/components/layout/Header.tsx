import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  ChevronLeftIcon,
  ChevronRightIcon,
  UserCircleIcon,
  ArrowLeftOnRectangleIcon,
  Cog6ToothIcon,
  Bars3Icon,
  XMarkIcon,
  HomeIcon,
  MagnifyingGlassIcon,
  MusicalNoteIcon,
  QueueListIcon,
  ClockIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';
import { useAuthStore } from '../../stores/authStore';
import { getBaseUrl } from '../../config/config';
import clsx from 'clsx';

// Mobile Navigation Link Component
interface MobileNavLinkProps {
  to: string;
  icon: React.ComponentType<any>;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

const MobileNavLink: React.FC<MobileNavLinkProps> = ({ 
  to, 
  icon: Icon, 
  children, 
  onClick,
  className = ""
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = location.pathname === to;

  const handleClick = () => {
    navigate(to);
    onClick?.();
  };

  return (
    <button
      onClick={handleClick}
      className={clsx(
        'flex items-center space-x-3 w-full px-4 py-3 rounded-lg transition-all duration-200',
        isActive 
          ? 'bg-gray-800 text-white' 
          : 'text-gray-400 hover:text-white hover:bg-gray-800/50',
        className
      )}
    >
      <Icon className="w-5 h-5" />
      <span className="font-medium">{children}</span>
    </button>
  );
};

const Header: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setShowMobileMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const canGoBack = window.history.length > 1;
  const canGoForward = false; // Browser history doesn't expose forward capability

  return (
    <header className="bg-black/50 backdrop-blur-sm border-b border-gray-800 px-4 sm:px-6 py-4 flex items-center justify-between">
      {/* Mobile menu button + Navigation buttons */}
      <div className="flex items-center space-x-2">
        {/* Mobile menu button (visible on mobile only) */}
        <button
          onClick={() => setShowMobileMenu(!showMobileMenu)}
          className="md:hidden p-2 rounded-full text-white hover:bg-gray-800 transition-all"
          title="Open menu"
        >
          {showMobileMenu ? (
            <XMarkIcon className="w-5 h-5" />
          ) : (
            <Bars3Icon className="w-5 h-5" />
          )}
        </button>

        {/* Desktop navigation buttons */}
        <div className="hidden sm:flex items-center space-x-2">
          <button
            onClick={() => navigate(-1)}
            disabled={!canGoBack}
            className={clsx(
              'p-2 rounded-full transition-all',
              canGoBack
                ? 'text-white hover:bg-gray-800 hover:scale-105'
                : 'text-gray-600 cursor-not-allowed'
            )}
            title="Go back"
          >
            <ChevronLeftIcon className="w-5 h-5" />
          </button>
          
          <button
            onClick={() => navigate(1)}
            disabled={!canGoForward}
            className={clsx(
              'p-2 rounded-full transition-all',
              canGoForward
                ? 'text-white hover:bg-gray-800 hover:scale-105'
                : 'text-gray-600 cursor-not-allowed'
            )}
            title="Go forward"
          >
            <ChevronRightIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Page title */}
      <div className="flex-1 text-center">
        <h2 className="text-lg font-semibold text-white truncate">
          {getPageTitle(location.pathname)}
        </h2>
      </div>

      {/* User menu */}
      <div className="relative" ref={userMenuRef}>
        <button
          onClick={() => setShowUserMenu(!showUserMenu)}
          className="flex items-center space-x-3 p-2 rounded-full hover:bg-gray-800 transition-colors group"
        >
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-white group-hover:text-primary transition-colors">
              {user?.username}
            </p>
            <p className="text-xs text-gray-400">
              {user?.is_admin ? 'Admin' : 'User'}
            </p>
          </div>
          
          {user?.profile_picture ? (
            <img
              src={`${getBaseUrl()}${user.profile_picture}`}
              alt={`${user.username}'s profile`}
              className="w-8 h-8 rounded-full object-cover border border-gray-600"
            />
          ) : (
            <div className="w-8 h-8 bg-gradient-to-r from-primary to-secondary rounded-full flex items-center justify-center">
              <UserCircleIcon className="w-6 h-6 text-white" />
            </div>
          )}
        </button>

        {/* Dropdown menu */}
        {showUserMenu && (
          <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl py-2 z-50">
            <div className="px-4 py-2 border-b border-gray-700">
              <p className="text-sm font-medium text-white">{user?.username}</p>
              <p className="text-xs text-gray-400">{user?.email}</p>
            </div>
            
            <button
              onClick={() => {
                navigate('/settings');
                setShowUserMenu(false);
              }}
              className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-700 transition-colors flex items-center space-x-2"
            >
              <Cog6ToothIcon className="w-4 h-4" />
              <span>Settings</span>
            </button>
            
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-gray-700 transition-colors flex items-center space-x-2"
            >
              <ArrowLeftOnRectangleIcon className="w-4 h-4" />
              <span>Sign out</span>
            </button>
          </div>
        )}
      </div>

      {/* Mobile Navigation Menu */}
      {showMobileMenu && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-gray-900 border-b border-gray-800 z-50" ref={mobileMenuRef}>
          <nav className="p-4 space-y-2">
            <MobileNavLink 
              to="/" 
              icon={HomeIcon}
              onClick={() => setShowMobileMenu(false)}
            >
              Home
            </MobileNavLink>
            
            <MobileNavLink 
              to="/search" 
              icon={MagnifyingGlassIcon}
              onClick={() => setShowMobileMenu(false)}
            >
              Search
            </MobileNavLink>
            
            <MobileNavLink 
              to="/library" 
              icon={MusicalNoteIcon}
              onClick={() => setShowMobileMenu(false)}
            >
              Your Library
            </MobileNavLink>
            
            <MobileNavLink 
              to="/playlists" 
              icon={QueueListIcon}
              onClick={() => setShowMobileMenu(false)}
            >
              All Playlists
            </MobileNavLink>
            
            <MobileNavLink 
              to="/history" 
              icon={ClockIcon}
              onClick={() => setShowMobileMenu(false)}
            >
              Recently Played
            </MobileNavLink>
            
            <MobileNavLink 
              to="/settings" 
              icon={Cog6ToothIcon}
              onClick={() => setShowMobileMenu(false)}
            >
              Settings
            </MobileNavLink>
            
            {user?.is_admin && (
              <MobileNavLink 
                to="/admin" 
                icon={ShieldCheckIcon}
                onClick={() => setShowMobileMenu(false)}
                className="text-yellow-400"
              >
                Admin Panel
              </MobileNavLink>
            )}
          </nav>
        </div>
      )}
    </header>
  );
};

// Helper function to get page title based on pathname
function getPageTitle(pathname: string): string {
  const pathSegments = pathname.split('/').filter(Boolean);
  
  switch (pathSegments[0]) {
    case '':
      return 'Home';
    case 'search':
      return 'Search';
    case 'library':
      return 'Your Library';
    case 'playlists':
      return pathSegments[1] ? 'Playlist' : 'Playlists';
    case 'artists':
      return 'Artist';
    case 'albums':
      return 'Album';
    case 'history':
      return 'Recently Played';
    case 'settings':
      return 'Settings';
    case 'admin':
      return 'Admin Panel';
    default:
      return 'Musable';
  }
}

export default Header;