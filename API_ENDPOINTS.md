# API Endpoints Documentation

This document provides a comprehensive reference for all API endpoints in the Musable backend.

## Base URL
- **Development**: `http://localhost:3001/api`  
- **Production**: `https://musable.breadjs.nl/api`

## Authentication

Most endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

Tokens are obtained through the login endpoint and stored in localStorage by the frontend.

## Response Format

All API responses follow this structure:
```json
{
  "success": boolean,
  "data": any,        // Present on success
  "error": {          // Present on error
    "message": string,
    "details": any    // Optional
  }
}
```

## Authentication Endpoints

### POST `/auth/login`
Login with email and password.

**Request Body:**
```json
{
  "email": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": { /* User object */ },
    "token": "jwt_token_string"
  }
}
```

### POST `/auth/register`
Register a new user (requires valid invite token).

**Request Body:**
```json
{
  "email": "string",
  "password": "string",
  "username": "string",
  "inviteToken": "string"
}
```

### GET `/auth/profile`
Get current user profile information.

**Auth**: Required  
**Response**: User object

### PUT `/auth/password`
Change user password.

**Auth**: Required  
**Request Body:**
```json
{
  "currentPassword": "string",
  "newPassword": "string"
}
```

### POST `/auth/logout`
Logout current user.

**Auth**: Required

### GET `/auth/invite/:token`
Validate an invite token.

**Parameters:**
- `token`: Invite token string

## Library Endpoints

### GET `/library/songs`
Get songs with optional filtering and pagination.

**Auth**: Required  
**Query Parameters:**
- `search`: Filter by title, artist, or album
- `artist`: Filter by artist ID
- `album`: Filter by album ID  
- `genre`: Filter by genre string
- `limit`: Number of results (default: 50)
- `offset`: Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "data": {
    "songs": [/* Song objects */],
    "total": number
  }
}
```

### GET `/library/songs/:id`
Get a specific song by ID.

**Auth**: Required  
**Parameters:**
- `id`: Song ID

### GET `/library/songs/random`
Get random songs.

**Auth**: Required  
**Query Parameters:**
- `limit`: Number of songs (default: 50, max: 100)

### GET `/library/artists`
Get all artists with optional search.

**Auth**: Required  
**Query Parameters:**
- `search`: Filter by artist name

### GET `/library/artists/:id`
Get specific artist with their songs and albums.

**Auth**: Required  
**Parameters:**
- `id`: Artist ID

### GET `/library/albums`
Get albums with optional filtering.

**Auth**: Required  
**Query Parameters:**
- `search`: Filter by album title
- `artist`: Filter by artist ID

### GET `/library/albums/:id`
Get specific album with its songs.

**Auth**: Required  
**Parameters:**
- `id`: Album ID

### GET `/library/albums/recent`
Get recently added albums.

**Auth**: Required  
**Query Parameters:**
- `limit`: Number of albums (default: 20)

### GET `/library/genres`
Get all available genres.

**Auth**: Required

### GET `/library/stats`
Get library statistics (total songs, artists, albums, etc.).

**Auth**: Required

### POST `/library/scan`
Start a library scan.

**Auth**: Required (Admin only)  
**Request Body:**
```json
{
  "paths": ["string"] // Optional: specific paths to scan
}
```

### GET `/library/scan/status`
Get current scan status and history.

**Auth**: Required

## Playlist Endpoints

### POST `/playlists`
Create a new playlist.

**Auth**: Required  
**Request Body:**
```json
{
  "name": "string",
  "description": "string", // Optional
  "isPublic": boolean      // Optional, default: false
}
```

### GET `/playlists/my`
Get current user's playlists.

**Auth**: Required

### GET `/playlists/public`
Get public playlists.

**Auth**: Required

### GET `/playlists/all`
Get all playlists (admin only).

**Auth**: Required (Admin)

### GET `/playlists/:id`
Get specific playlist with songs.

**Auth**: Required  
**Parameters:**
- `id`: Playlist ID

### PUT `/playlists/:id`
Update playlist information.

**Auth**: Required (Owner or Admin)  
**Parameters:**
- `id`: Playlist ID

**Request Body:**
```json
{
  "name": "string",        // Optional
  "description": "string", // Optional  
  "isPublic": boolean      // Optional
}
```

### DELETE `/playlists/:id`
Delete a playlist.

**Auth**: Required (Owner or Admin)  
**Parameters:**
- `id`: Playlist ID

### POST `/playlists/:id/songs`
Add song to playlist.

**Auth**: Required (Owner or Admin)  
**Parameters:**
- `id`: Playlist ID

**Request Body:**
```json
{
  "songId": number
}
```

### DELETE `/playlists/:id/songs/:songId`
Remove song from playlist.

**Auth**: Required (Owner or Admin)  
**Parameters:**
- `id`: Playlist ID
- `songId`: Song ID

### PUT `/playlists/:id/songs/reorder`
Reorder songs in playlist.

**Auth**: Required (Owner or Admin)  
**Parameters:**
- `id`: Playlist ID

**Request Body:**
```json
{
  "songIds": [number] // Ordered array of song IDs
}
```

### GET `/playlists/search`
Search playlists by name.

**Auth**: Required  
**Query Parameters:**
- `q`: Search query

## History & Tracking Endpoints

### POST `/history/track`
Track a song play.

**Auth**: Required  
**Request Body:**
```json
{
  "songId": number,
  "durationPlayed": number,  // Optional: seconds played
  "completed": boolean       // Optional: if song played to end
}
```

### GET `/history`
Get user's listening history.

**Auth**: Required  
**Query Parameters:**
- `limit`: Number of entries (default: 50)
- `offset`: Pagination offset

### GET `/history/recent`
Get recently played songs.

**Auth**: Required  
**Query Parameters:**
- `limit`: Number of songs (default: 20)

### GET `/history/most-played`
Get most played songs.

**Auth**: Required  
**Query Parameters:**
- `limit`: Number of songs (default: 20)

### GET `/history/stats`
Get listening statistics and trends.

**Auth**: Required

### DELETE `/history`
Clear user's listening history.

**Auth**: Required

## Favorites & Following Endpoints

### GET `/favorites`
Get user's favorite songs.

**Auth**: Required

### POST `/favorites/:songId/toggle`
Toggle favorite status of a song.

**Auth**: Required
**Parameters:**
- `songId`: Song ID

### GET `/favorites/:songId/status`
Check if song is favorited.

**Auth**: Required
**Parameters:**
- `songId`: Song ID

### POST `/favorites/:songId`
Add song to favorites.

**Auth**: Required
**Parameters:**
- `songId`: Song ID

### DELETE `/favorites/:songId`
Remove song from favorites.

**Auth**: Required
**Parameters:**
- `songId`: Song ID

### GET `/albums/:id/follow/status`
Check if user is following an album.

**Auth**: Required
**Parameters:**
- `id`: Album ID

### POST `/albums/:id/follow`
Follow an album.

**Auth**: Required
**Parameters:**
- `id`: Album ID

### DELETE `/albums/:id/follow`
Unfollow an album.

**Auth**: Required
**Parameters:**
- `id`: Album ID

### GET `/albums/following`
Get user's followed albums.

**Auth**: Required

### GET `/playlists/:id/follow/status`
Check if user is following a playlist.

**Auth**: Required
**Parameters:**
- `id`: Playlist ID

### POST `/playlists/:id/follow`
Follow a playlist.

**Auth**: Required
**Parameters:**
- `id`: Playlist ID

### DELETE `/playlists/:id/follow`
Unfollow a playlist.

**Auth**: Required
**Parameters:**
- `id`: Playlist ID

### GET `/playlists/following`
Get user's followed playlists.

**Auth**: Required

## YouTube Search Endpoints

### GET `/youtube/search`
Search for images using YouTube Data API.

**Auth**: Required  
**Query Parameters:**
- `q`: Search query (required)
- `limit`: Number of results (default: 20, max: 50)

**Response:**
```json
{
  "success": true,
  "data": {
    "data": [/* SearchImage objects */],
    "count": number,
    "query": "string",
    "limit": number
  }
}
```

### GET `/youtube/album-artwork`
Search for album-specific artwork.

**Auth**: Required  
**Query Parameters:**
- `artist`: Artist name (required)
- `album`: Album name (required)

### GET `/youtube/thumbnail/:videoId`
Get high-quality thumbnail URL for YouTube video.

**Auth**: Required  
**Parameters:**
- `videoId`: YouTube video ID

**Query Parameters:**
- `quality`: Thumbnail quality (`maxres`, `standard`, `high`, `medium`)

## Sharing Endpoints

### POST `/share/songs/:songId`
Create a share token for a song.

**Auth**: Required
**Parameters:**
- `songId`: Song ID

**Request Body:**
```json
{
  "maxAccess": number,      // Optional: max number of accesses
  "expiresInHours": number  // Optional: expiration time
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "string",
    "shareUrl": "string",
    "expiresAt": "datetime",
    "maxAccess": number
  }
}
```

### GET `/share/:token`
Access a shared song.

**Auth**: Optional (public access)
**Parameters:**
- `token`: Share token string

**Response:**
```json
{
  "success": true,
  "data": {
    "song": {/* Song object */},
    "sharedBy": "string",
    "remainingAccess": number
  }
}
```

### POST `/share/create`
Create a share token for a song (alternative endpoint).

**Auth**: Required
**Request Body:**
```json
{
  "songId": number,
  "maxAccess": number,      // Optional: max number of accesses
  "expiresInHours": number  // Optional: expiration time
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "string",
    "shareUrl": "string"
  }
}
```

## Streaming Endpoints

### GET `/stream/:songId`
Stream audio file.

**Auth**: Required  
**Parameters:**
- `songId`: Song ID

**Response**: Audio stream with proper headers for range requests

## Admin Endpoints

All admin endpoints require admin role authentication.

### GET `/admin/dashboard`
Get dashboard statistics.

**Auth**: Required (Admin)

### GET `/admin/users`
Get all users.

**Auth**: Required (Admin)

### PUT `/admin/users/:id`
Update user information.

**Auth**: Required (Admin)  
**Parameters:**
- `id`: User ID

### DELETE `/admin/users/:id`
Delete a user.

**Auth**: Required (Admin)  
**Parameters:**
- `id`: User ID

### GET `/admin/users/:id/activity`
Get user activity log.

**Auth**: Required (Admin)  
**Parameters:**
- `id`: User ID

### POST `/admin/invites`
Create invite token.

**Auth**: Required (Admin)  
**Request Body:**
```json
{
  "expiresInHours": number // Default: 24
}
```

### GET `/admin/invites`
Get all invite tokens.

**Auth**: Required (Admin)

### DELETE `/admin/invites/:id`
Revoke invite token.

**Auth**: Required (Admin)  
**Parameters:**
- `id`: Invite ID

### POST `/admin/invites/cleanup`
Clean up expired invites.

**Auth**: Required (Admin)

### PUT `/admin/songs/:id`
Update song metadata and artwork.

**Auth**: Required (Admin)  
**Parameters:**
- `id`: Song ID

**Request Body**: FormData with fields:
- `title`: Song title
- `artist_name`: Artist name
- `album_title`: Album title
- `genre`: Genre
- `year`: Release year
- `artwork`: Image file (optional)

### DELETE `/admin/songs/:id`
Delete a song.

**Auth**: Required (Admin)  
**Parameters:**
- `id`: Song ID

### GET `/admin/library/paths`
Get library scan paths.

**Auth**: Required (Admin)

### POST `/admin/library/paths`
Add library scan path.

**Auth**: Required (Admin)  
**Request Body:**
```json
{
  "path": "string"
}
```

### PUT `/admin/library/paths/:id`
Update library path.

**Auth**: Required (Admin)  
**Parameters:**
- `id`: Path ID

**Request Body:**
```json
{
  "path": "string",      // Optional
  "is_active": boolean   // Optional
}
```

### DELETE `/admin/library/paths/:id`
Delete library path.

**Auth**: Required (Admin)  
**Parameters:**
- `id`: Path ID

### GET `/admin/history`
Get all user listening history.

**Auth**: Required (Admin)  
**Query Parameters:**
- `limit`: Number of entries
- `offset`: Pagination offset
- `user`: Filter by user ID

### GET `/admin/stats/listening`
Get listening statistics.

**Auth**: Required (Admin)  
**Query Parameters:**
- `user`: Filter by user ID (optional)

### GET `/admin/settings`
Get all system settings.

**Auth**: Required (Admin)

### GET `/admin/settings/:key`
Get specific system setting.

**Auth**: Required (Admin)  
**Parameters:**
- `key`: Setting key

### PUT `/admin/settings/:key`
Update system setting.

**Auth**: Required (Admin)  
**Parameters:**
- `key`: Setting key

**Request Body:**
```json
{
  "value": "string" // Setting value
}
```

## Music Room Endpoints

### GET `/rooms/public`
Get all public music rooms with live status and currently playing songs.

**Auth**: Required  
**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Number of results (default: 20, max: 50)

**Response:**
```json
{
  "success": true,
  "data": {
    "rooms": [{
      "id": number,
      "name": "string",
      "description": "string",
      "code": "string",
      "host_username": "string", 
      "participant_count": number,
      "max_listeners": number,
      "is_playing": boolean,
      "current_song": {
        "id": number,
        "title": "string",
        "artist_name": "string",
        "album_title": "string",
        "duration": number
      },
      "isParticipant": boolean,
      "userRole": "host" | "listener" | null
    }],
    "pagination": {
      "page": number,
      "limit": number,
      "hasMore": boolean
    }
  }
}
```

### GET `/rooms/my-rooms`
Get current user's rooms (created and joined).

**Auth**: Required

### GET `/rooms/:id`
Get room details with participants and queue.

**Auth**: Required  
**Parameters:**
- `id`: Room ID

**Response:**
```json
{
  "success": true,
  "data": {
    "room": {/* Room object */},
    "participants": [{"user_id": number, "username": "string", "role": "string"}],
    "queue": [{"id": number, "song": {/* Song object */}, "added_by": "string"}]
  }
}
```

### GET `/rooms/code/:code`
Find room by 6-character code for discovery.

**Parameters:**
- `code`: 6-character room code

**Response:**
```json
{
  "success": true,
  "data": {
    "id": number,
    "name": "string",
    "description": "string",
    "code": "string",
    "host": "string",
    "participant_count": number,
    "max_listeners": number,
    "current_song": {/* Current song info */},
    "is_playing": boolean
  }
}
```

### POST `/rooms`
Create a new music room.

**Auth**: Required  
**Request Body:**
```json
{
  "name": "string",
  "description": "string", // Optional
  "is_public": boolean,     // Optional, default: false
  "max_listeners": number   // Optional, default: 10, range: 2-50
}
```

### POST `/rooms/join`
Join a room by code.

**Auth**: Required  
**Request Body:**
```json
{
  "code": "string" // 6-character room code
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "room": {/* Room object */},
    "participants": [/* Participant array */],
    "queue": [/* Queue array */]
  }
}
```

### POST `/rooms/:id/leave`
Leave a room.

**Auth**: Required  
**Parameters:**
- `id`: Room ID

### POST `/rooms/:id/queue`
Add song to room queue.

**Auth**: Required (Must be room participant)  
**Parameters:**
- `id`: Room ID

**Request Body:**
```json
{
  "song_id": number
}
```

### DELETE `/rooms/:id/queue/:queueId`
Remove song from room queue.

**Auth**: Required (Must be room participant)  
**Parameters:**
- `id`: Room ID
- `queueId`: Queue item ID


### PATCH `/rooms/:id/participants/:userId/role`
Change user role in room (host only).

**Auth**: Required (Host only)  
**Parameters:**
- `id`: Room ID
- `userId`: User ID to change

**Request Body:**
```json
{
  "role": "host" | "listener"
}
```

### DELETE `/rooms/:id`
Delete a room (host or admin only).

**Auth**: Required (Host or Admin)  
**Parameters:**
- `id`: Room ID

## WebSocket Events (Music Rooms)

Music rooms use WebSocket connections for real-time synchronization:

**Connection**: `ws://localhost:3001/socket.io/`  
**Auth**: JWT token in connection auth

### Client Events
- `join_room`: Join a room by code
- `leave_room`: Leave current room
- `room_play`: Start playback (host only)
- `room_pause`: Pause playback (host only)
- `room_seek`: Seek to position (host only)
- `room_song_change`: Change current song (host only)
- `add_to_queue`: Add song to queue
- `remove_from_queue`: Remove song from queue

### Server Events
- `room_joined`: Successfully joined room
- `user_joined`: User joined the room
- `user_left`: User left the room
- `playback_sync`: Playback state synchronization
- `queue_updated`: Room queue changed
- `participants_updated`: Participant list changed
- `room_error`: Room operation error

## Error Codes

Common HTTP status codes and their meanings:

- **200**: Success
- **201**: Created
- **400**: Bad Request (invalid parameters)
- **401**: Unauthorized (invalid/missing token)
- **403**: Forbidden (insufficient permissions)
- **404**: Not Found
- **409**: Conflict (duplicate resource)
- **429**: Too Many Requests (rate limited)
- **500**: Internal Server Error

## Rate Limiting

API endpoints may implement rate limiting. When exceeded, you'll receive a 429 status code with retry information in headers.

## Data Types

### User Object
```json
{
  "id": number,
  "email": "string",
  "username": "string",
  "role": "admin" | "user",
  "created_at": "datetime",
  "last_login": "datetime"
}
```

### Song Object
```json
{
  "id": number,
  "title": "string",
  "artist_name": "string",
  "album_title": "string",
  "genre": "string",
  "year": number,
  "duration": number,
  "file_path": "string",
  "artwork_path": "string",
  "created_at": "datetime"
}
```

### Room Object
```json
{
  "id": number,
  "name": "string",
  "description": "string",
  "code": "string",
  "host_id": number,
  "host_username": "string",
  "is_public": boolean,
  "max_listeners": number,
  "current_song_id": number,
  "current_position": number,
  "is_playing": boolean,
  "created_at": "datetime",
  "participant_count": number,
  "current_song": {
    "id": number,
    "title": "string",
    "artist_name": "string",
    "album_title": "string",
    "duration": number
  }
}
```

### PlaybackSyncEvent Object
```json
{
  "type": "play" | "pause" | "seek" | "song_change",
  "song_id": number,
  "position": number,
  "user_id": number,
  "timestamp": number
}
```

### SearchImage Object
```json
{
  "id": "string",
  "url": "string",
  "thumbnail": "string", 
  "title": "string",
  "source": "string",
  "width": number,
  "height": number,
  "videoId": "string",
  "channelTitle": "string"
}
```