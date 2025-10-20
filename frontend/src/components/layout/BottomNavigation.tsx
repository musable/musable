import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  HomeIcon, 
  MagnifyingGlassIcon,
  MusicalNoteIcon,
  HeartIcon,
  Cog6ToothIcon,
  QueueListIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';
import { 
  HomeIcon as HomeIconSolid,
  MagnifyingGlassIcon as MagnifyingGlassIconSolid,
  MusicalNoteIcon as MusicalNoteIconSolid,
  HeartIcon as HeartIconSolid,
  Cog6ToothIcon as Cog6ToothIconSolid,
  QueueListIcon as QueueListIconSolid,
  ShieldCheckIcon as ShieldCheckIconSolid
} from '@heroicons/react/24/solid';
import clsx from 'clsx';
import { useAuthStore } from '../../stores/authStore';

interface BottomNavItemProps {
  to: string;
  icon: React.ComponentType<any>;
  solidIcon: React.ComponentType<any>;
  label: string;
}

const BottomNavItem: React.FC<BottomNavItemProps> = ({ to, icon: Icon, solidIcon: SolidIcon, label }) => (
  <NavLink
    to={to}
    className={({ isActive }) => clsx(
      'flex flex-col items-center justify-center py-2 px-1 transition-all duration-200',
      'min-h-[64px] min-w-[72px] flex-shrink-0'
    )}
  >
    {({ isActive }) => (
      <>
        {isActive ? (
          <SolidIcon className="w-6 h-6 text-primary mb-1" />
        ) : (
          <Icon className="w-6 h-6 text-gray-400 mb-1" />
        )}
        <span className={clsx(
          'text-xs font-medium text-center leading-tight',
          isActive ? 'text-primary' : 'text-gray-400'
        )}>
          {label}
        </span>
      </>
    )}
  </NavLink>
);

const BottomNavigation: React.FC = () => {
  const { user } = useAuthStore();
  
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-black border-t border-gray-800 z-20">
      <div className="overflow-x-auto scrollbar-hide">
        <div className="flex items-center">
          <BottomNavItem 
            to="/" 
            icon={HomeIcon} 
            solidIcon={HomeIconSolid}
            label="Home"
          />
          
          <BottomNavItem 
            to="/search" 
            icon={MagnifyingGlassIcon} 
            solidIcon={MagnifyingGlassIconSolid}
            label="Search"
          />
          
          <BottomNavItem 
            to="/library" 
            icon={MusicalNoteIcon} 
            solidIcon={MusicalNoteIconSolid}
            label="Library"
          />
          
          <BottomNavItem 
            to="/playlists" 
            icon={QueueListIcon} 
            solidIcon={QueueListIconSolid}
            label="Playlists"
          />
          
          <BottomNavItem 
            to="/favorites" 
            icon={HeartIcon} 
            solidIcon={HeartIconSolid}
            label="Liked"
          />
          
          <BottomNavItem 
            to="/settings" 
            icon={Cog6ToothIcon} 
            solidIcon={Cog6ToothIconSolid}
            label="Settings"
          />
          
          {/* Show admin panel for admin users only */}
          {Boolean(user?.is_admin) && (
            <NavLink
              to="/admin"
              className={({ isActive }) => clsx(
                'flex flex-col items-center justify-center py-2 px-1 transition-all duration-200',
                'min-h-[64px] min-w-[72px] flex-shrink-0'
              )}
            >
              {({ isActive }) => (
                <>
                  {isActive ? (
                    <ShieldCheckIconSolid className="w-6 h-6 text-yellow-400 mb-1" />
                  ) : (
                    <ShieldCheckIcon className="w-6 h-6 text-yellow-400 mb-1" />
                  )}
                  <span className={clsx(
                    'text-xs font-medium text-center leading-tight text-yellow-400'
                  )}>
                    Admin
                  </span>
                </>
              )}
            </NavLink>
          )}
        </div>
      </div>
    </div>
  );
};

export default BottomNavigation;