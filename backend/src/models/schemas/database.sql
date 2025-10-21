-- Musable Database Schema
-- SQLite database structure for the Musable music library

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    profile_picture VARCHAR(500),
    is_admin BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME
);

-- Invites table for invite-only registration
CREATE TABLE invites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token VARCHAR(255) UNIQUE NOT NULL,
    created_by INTEGER NOT NULL,
    used_by INTEGER NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    used_at DATETIME NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (used_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Artists table
CREATE TABLE artists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Albums table
CREATE TABLE albums (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title VARCHAR(255) NOT NULL,
    artist_id INTEGER NOT NULL,
    release_year INTEGER,
    artwork_path VARCHAR(500),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (artist_id) REFERENCES artists(id) ON DELETE CASCADE
);

-- Songs table
CREATE TABLE songs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title VARCHAR(255) NOT NULL,
    artist_id INTEGER NOT NULL,
    album_id INTEGER,
    file_path VARCHAR(1000) NOT NULL,
    file_size INTEGER,
    duration INTEGER, -- in seconds
    track_number INTEGER,
    genre VARCHAR(100),
    year INTEGER,
    bitrate INTEGER,
    sample_rate INTEGER,
    source VARCHAR(50) DEFAULT 'local', -- 'local' or 'youtube'
    youtube_id VARCHAR(50),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (artist_id) REFERENCES artists(id) ON DELETE CASCADE,
    FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE SET NULL
);

-- Playlists table
CREATE TABLE playlists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    user_id INTEGER NOT NULL,
    is_public BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Playlist songs junction table
CREATE TABLE playlist_songs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    playlist_id INTEGER NOT NULL,
    song_id INTEGER NOT NULL,
    position INTEGER NOT NULL,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
    FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE,
    UNIQUE(playlist_id, song_id)
);

-- Favorites table for liked songs
CREATE TABLE favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    song_id INTEGER NOT NULL,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE,
    UNIQUE(user_id, song_id)
);

-- Album follows table for followed albums
CREATE TABLE album_follows (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    album_id INTEGER NOT NULL,
    followed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE CASCADE,
    UNIQUE(user_id, album_id)
);

-- Playlist follows table for followed playlists
CREATE TABLE playlist_follows (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    playlist_id INTEGER NOT NULL,
    followed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
    UNIQUE(user_id, playlist_id)
);

-- Listen history table
CREATE TABLE listen_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    song_id INTEGER NOT NULL,
    played_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    duration_played INTEGER, -- in seconds
    completed BOOLEAN DEFAULT 0, -- whether the song was played to completion
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE
);

-- Library scan history
CREATE TABLE scan_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    files_scanned INTEGER DEFAULT 0,
    files_added INTEGER DEFAULT 0,
    files_updated INTEGER DEFAULT 0,
    errors_count INTEGER DEFAULT 0,
    scan_path VARCHAR(1000) NOT NULL,
    status VARCHAR(50) DEFAULT 'running', -- 'running', 'completed', 'failed'
    error_message TEXT
);

-- Sessions table for authentication
CREATE TABLE sessions (
    id VARCHAR(255) PRIMARY KEY,
    user_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- App settings table
CREATE TABLE settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Library paths table for managing scan directories
CREATE TABLE library_paths (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    path VARCHAR(500) NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Share tokens for secure song sharing
CREATE TABLE share_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token VARCHAR(255) NOT NULL UNIQUE,
    song_id INTEGER NOT NULL,
    created_by INTEGER NOT NULL,
    access_count INTEGER DEFAULT 0,
    max_access INTEGER DEFAULT NULL,
    expires_at DATETIME DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_accessed DATETIME DEFAULT NULL,
    FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Listening rooms for synchronized playback
CREATE TABLE listening_rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    code VARCHAR(20) NOT NULL UNIQUE, -- Short joinable code
    host_id INTEGER NOT NULL,
    is_public BOOLEAN DEFAULT 0,
    max_listeners INTEGER DEFAULT 10,
    current_song_id INTEGER,
    current_position REAL DEFAULT 0, -- Current playback position in seconds
    is_playing BOOLEAN DEFAULT 0,
    play_started_at DATETIME, -- When current song started playing
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (host_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (current_song_id) REFERENCES songs(id) ON DELETE SET NULL
);

-- Room participants
CREATE TABLE room_participants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    role VARCHAR(20) DEFAULT 'listener', -- 'host' or 'listener'
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT 1,
    last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES listening_rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(room_id, user_id)
);

-- Room queue for shared playlist management
CREATE TABLE room_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id INTEGER NOT NULL,
    song_id INTEGER NOT NULL,
    added_by INTEGER NOT NULL,
    position INTEGER NOT NULL,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES listening_rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE,
    FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Room chat messages (optional feature)
CREATE TABLE room_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    message TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'chat', -- 'chat', 'system', 'song_change'
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES listening_rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_songs_artist ON songs(artist_id);
CREATE INDEX idx_songs_album ON songs(album_id);
CREATE INDEX idx_songs_title ON songs(title);
CREATE INDEX idx_songs_file_path ON songs(file_path);
CREATE INDEX idx_listen_history_user ON listen_history(user_id);
CREATE INDEX idx_listen_history_song ON listen_history(song_id);
CREATE INDEX idx_listen_history_played_at ON listen_history(played_at);
CREATE INDEX idx_playlist_songs_playlist ON playlist_songs(playlist_id);
CREATE INDEX idx_playlist_songs_position ON playlist_songs(playlist_id, position);
CREATE INDEX idx_favorites_user ON favorites(user_id);
CREATE INDEX idx_favorites_song ON favorites(song_id);
CREATE INDEX idx_album_follows_user ON album_follows(user_id);
CREATE INDEX idx_album_follows_album ON album_follows(album_id);
CREATE INDEX idx_playlist_follows_user ON playlist_follows(user_id);
CREATE INDEX idx_playlist_follows_playlist ON playlist_follows(playlist_id);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);
CREATE INDEX idx_invites_token ON invites(token);
CREATE INDEX idx_invites_expires ON invites(expires_at);
CREATE INDEX idx_library_paths_active ON library_paths(is_active);
CREATE INDEX idx_share_tokens_token ON share_tokens(token);
CREATE INDEX idx_share_tokens_song ON share_tokens(song_id);
CREATE INDEX idx_share_tokens_expires ON share_tokens(expires_at);
CREATE INDEX idx_listening_rooms_code ON listening_rooms(code);
CREATE INDEX idx_listening_rooms_host ON listening_rooms(host_id);
CREATE INDEX idx_listening_rooms_public ON listening_rooms(is_public);
CREATE INDEX idx_room_participants_room ON room_participants(room_id);
CREATE INDEX idx_room_participants_user ON room_participants(user_id);
CREATE INDEX idx_room_participants_active ON room_participants(is_active);
CREATE INDEX idx_room_queue_room ON room_queue(room_id);
CREATE INDEX idx_room_queue_position ON room_queue(room_id, position);
CREATE INDEX idx_room_messages_room ON room_messages(room_id);
CREATE INDEX idx_room_messages_user ON room_messages(user_id);
CREATE INDEX idx_room_messages_time ON room_messages(sent_at);

-- Migration: Add role column to existing room_participants table
ALTER TABLE room_participants ADD COLUMN role VARCHAR(20) DEFAULT 'listener';

-- Migration: Add profile_picture column to existing users table
ALTER TABLE users ADD COLUMN profile_picture VARCHAR(500);

-- Insert default settings
INSERT OR IGNORE INTO settings (key, value, description) VALUES
('library_paths', '[]', 'JSON array of library scan paths'),
('app_name', 'Musable', 'Application name'),
('registration_enabled', 'false', 'Whether new registrations are allowed'),
('max_file_size', '104857600', 'Maximum file size for uploads (100MB)'),
('supported_formats', '["mp3","flac","wav","m4a","aac","ogg"]', 'Supported audio formats'),
('youtube_integration', 'true', 'Enable YouTube Music integration');