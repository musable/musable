// User types
export interface User {
  id: number;
  username: string;
  email: string;
  profile_picture?: string;
  is_admin: boolean | number;
  created_at: string;
  updated_at: string;
  last_login?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  inviteToken: string;
}

export interface AuthResponse {
  success: boolean;
  data: {
    user: User;
    token: string;
  };
}

// Music types
export interface Artist {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
  song_count?: number;
  album_count?: number;
}

export interface Album {
  id: number;
  title: string;
  artist_id: number;
  artist_name: string;
  release_year?: number;
  artwork_path?: string;
  created_at: string;
  updated_at: string;
  song_count?: number;
  total_duration?: number;
}

export interface Song {
  id: number;
  title: string;
  artist_id: number;
  artist_name: string;
  album_id?: number;
  album_title?: string;
  file_path: string;
  file_size?: number;
  duration?: number;
  track_number?: number;
  genre?: string;
  year?: number;
  bitrate?: number;
  sample_rate?: number;
  source: 'local' | 'youtube';
  youtube_id?: string;
  artwork_path?: string;
  created_at: string;
  updated_at: string;
}

// Playlist types
export interface Playlist {
  id: number;
  name: string;
  description?: string;
  user_id: number;
  username: string;
  is_public: boolean;
  song_count: number;
  total_duration: number;
  created_at: string;
  updated_at: string;
}

export interface PlaylistSong {
  id: number;
  playlist_id: number;
  song_id: number;
  position: number;
  added_at: string;
  title: string;
  artist_name: string;
  album_title?: string;
  duration?: number;
  artwork_path?: string;
}

export interface CreatePlaylistData {
  name: string;
  description?: string;
  is_public?: boolean;
}

// History types
export interface ListenHistory {
  id: number;
  user_id: number;
  username: string;
  song_id: number;
  song_title: string;
  artist_name: string;
  album_title?: string;
  song_duration?: number;
  artwork_path?: string;
  played_at: string;
  duration_played?: number;
  completed: boolean;
}

export interface ListeningStats {
  total_plays: number;
  unique_songs: number;
  listening_days: number;
  completed_plays: number;
  total_listening_time: number;
}

// Player types
export interface PlayerState {
  currentSong: Song | null;
  isPlaying: boolean;
  queue: Song[];
  currentIndex: number;
  volume: number;
  isMuted: boolean;
  isShuffled: boolean;
  repeatMode: 'none' | 'one' | 'all';
  currentTime: number;
  duration: number;
  isLoading: boolean;
}

export type RepeatMode = 'none' | 'one' | 'all';

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  error?: {
    message: string;
    details?: any;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

// Top tracks/types from backend
export interface TopItemRecord {
  id: number;
  cache_id: number;
  subject_type: string;
  subject_id?: number | null;
  subject_value?: string | null;
  item_type: string;
  rank: number;
  title?: string | null;
  external_id?: string | null;
  playcount?: number | null;
  listeners?: number | null;
  score?: number | null;
  url?: string | null;
  duration?: number | null;
  matched_song_id?: number | null;
  matched_artist_id?: number | null;
  matched_album_id?: number | null;
  match_confidence?: number | null;
  match_method?: string | null;
  created_at: string;
}

// Library management types
export interface LibraryPath {
  id: number;
  path: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

// System settings types
export interface SystemSettingsData {
  public_sharing_enabled?: boolean;
  [key: string]: unknown;
}

// Admin types
export interface DashboardStats {
  library: {
    songs: number;
    artists: number;
    albums: number;
    totalDuration: number;
    formatHours: number;
  };
  listening: ListeningStats & {
    active_users?: number;
  };
  users: {
    total: number;
    admins: number;
  };
  invites: {
    active: number;
    used: number;
  };
  trends: {
    users: {
      current: number;
      previous: number;
      change: number;
    };
    songs: {
      current: number;
      previous: number;
      change: number;
    };
    plays: {
      current: number;
      previous: number;
      change: number;
    };
    listeningTime: {
      current: number;
      previous: number;
      change: number;
    };
  };
  recentActivity: ListenHistory[];
  listeningTrends: any[];
  mostPlayedSongs: any[];
}

export interface Invite {
  id: number;
  token: string;
  created_by: number;
  creator_username: string;
  used_by?: number;
  user_username?: string;
  created_at: string;
  expires_at: string;
  used_at?: string;
}

// Search types
export interface SearchFilters {
  query: string;
  type?: 'all' | 'songs' | 'artists' | 'albums' | 'playlists';
  genre?: string;
  artist?: number;
  album?: number;
}

export interface SearchResults {
  songs: Song[];
  artists: Artist[];
  albums: Album[];
  playlists: Playlist[];
}

// Library scan types
export interface ScanProgress {
  id: number;
  status: 'running' | 'completed' | 'failed';
  filesScanned: number;
  filesAdded: number;
  filesUpdated: number;
  errorsCount: number;
  startedAt: string;
  completedAt?: string;
  currentFile?: string;
  errorMessage?: string;
  totalFiles?: number;
  progress?: number;
}

// UI types
export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: React.ComponentType<any>;
  action: () => void;
  disabled?: boolean;
  separator?: boolean;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'loading';
  title: string;
  description?: string;
  duration?: number;
}

// Route types
export interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

// Form types
export interface FormField {
  name: string;
  type: 'text' | 'email' | 'password' | 'textarea' | 'checkbox' | 'select';
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
}

// Error types
export interface AppError {
  message: string;
  statusCode?: number;
  details?: any;
}

// Theme types
export type ThemeMode = 'dark' | 'light' | 'system';

// Layout types
export interface SidebarItem {
  id: string;
  label: string;
  path: string;
  icon: React.ComponentType<any>;
  badge?: number;
  active?: boolean;
}

export interface HeaderAction {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  action: () => void;
}
