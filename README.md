# Musable

A self-hosted personal music library with Spotify-like design and features. Stream your music collection anywhere with a beautiful, responsive web interface.

**Have questions or suggestions?** Join our Discord community: https://discord.gg/A4ymNnQkP2

**Want to see it in action?** Check out the [Screenshots](https://github.com/musable/musable/blob/main/SCREENSHOTS.md)

## Features

### Music Library Management
- **Smart Library Scanner**: Automatically scan and organize your music files
- **Metadata Extraction**: Extract artist, album, title, duration, and album artwork
- **File Format Support**: MP3, FLAC, WAV, M4A, AAC, OGG
- **Real-time File Watching**: Auto-detect new files and changes
- **Album Artwork**: Embedded artwork extraction with fallback placeholders
- **YouTube Artwork Search**: Find high-quality album artwork from YouTube when embedded artwork is missing

### Spotify-like Interface
- **Dark Theme**: Beautiful, modern dark interface matching Spotify's design
- **Responsive Design**: Mobile-friendly layout that works on all devices
- **Sidebar Navigation**: Easy access to library, playlists, history, and admin
- **Grid & List Views**: Multiple ways to browse your music collection

### Advanced Audio Player
- **High-Quality Streaming**: Stream audio with range request support
- **Queue Management**: Add songs to queue, reorder, and manage playback
- **Playback Modes**: Shuffle, repeat (none/all/one), and volume control
- **Progress Control**: Seek to any position in the track
- **Keyboard Shortcuts**: Control playback with keyboard shortcuts
- **Real-time Room Sync**: Synchronized playback across multiple users in rooms
- **Equalizer**: Built-in audio equalizer with presets and custom settings

### User Experience
- **Fast Search**: Quick search across songs, artists, albums, and playlists
- **Listening History**: Track what you've played and when
- **Personal Stats**: View your most played songs, artists, and albums
- **Recently Played**: Quick access to your recent listening history
- **Favorites & Following**: Like songs, follow albums and playlists for quick access
- **Song Sharing**: Generate secure share links with expiration dates and access limits

### User Management
- **Invite-only Registration**: Secure, admin-controlled user registration
- **Role-based Access**: Admin and regular user roles
- **User Profiles**: Personal settings and preferences
- **Session Management**: Secure authentication with JWT tokens

### Admin Panel
- **User Management**: Create invites, manage users, promote/demote admins
- **Library Management**: Scan library, manage songs, view scan history
- **Analytics Dashboard**: Server stats, listening trends, user activity
- **System Settings**: Configure library paths, file formats, and more
- **Metadata Editor**: Edit song metadata and update album artwork directly from the admin panel

### Music Rooms (Social Listening)
- **Real-time Listening Rooms**: Create and join music rooms with friends
- **Host Controls**: Room hosts can control playback, queue, and seek
- **Live Song Display**: See what's currently playing in active rooms
- **Synchronized Playback**: All participants hear the same song at the same time
- **Role-based Access**: Host and listener roles with appropriate permissions
- **Room Discovery**: Browse available public rooms with live status

### YouTube Music Integration *(Partialy Available)*
- **Missing Song Discovery**: Find songs not in your local library
- **Download Integration**: Download missing songs via yt-dlp
- **Seamless Playback**: Switch between local and downloaded content

## Tech Stack

### Backend
- **Node.js** with TypeScript
- **Express.js** web framework
- **SQLite** database with foreign keys and transactions
- **JWT** authentication with secure sessions
- **music-metadata** for audio file parsing
- **Sharp** for image processing
- **Howler.js** for audio playback
- **Chokidar** for file system watching

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Zustand** for state management
- **React Router** for navigation
- **React Hook Form** with Yup validation
- **Axios** for API communication
- **React Hot Toast** for notifications

### Database Schema
- **Users**: Authentication, roles, and profiles
- **Artists & Albums**: Music organization and relationships
- **Songs**: Complete metadata with file paths and streaming info
- **Playlists**: User-created collections with ordering
- **Favorites & Follows**: Liked songs, followed albums and playlists
- **Listen History**: Detailed playback tracking and analytics
- **Music Rooms**: Real-time listening rooms with participants and queues
- **Share Tokens**: Secure song sharing with expiration and access control
- **Invites**: Secure invite-only registration system
- **Admin Features**: Scan history, user management, and system settings

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- Sufficient storage for your music library
- Modern web browser

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/musable/musable
cd musable
```

2. **Install backend dependencies**
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration
```

3. **Install frontend dependencies**
```bash
cd ../frontend
npm install
```

4. **Initialize the database**
```bash
cd ../backend
npm run db:init
```

5. **Start the development servers**

Backend (Terminal 1):
```bash
cd backend
npm run dev
```

Frontend (Terminal 2):
```bash
cd frontend
npm start
```

6. **Access the application**
- Open http://localhost:3000 in your browser
- Create your first admin user via the registration flow
- Configure your music library paths in the admin panel
- Start your library scan and enjoy your music!

### Docker Deployment (Recommended)

The easiest way to run Musable is using Docker. This method bundles both frontend and backend in a single container.

**Prerequisites:**
- Docker and Docker Compose installed
- Your music library folder

**Quick Start:**

1. **Clone the repository**
```bash
git clone https://github.com/musable/musable
cd musable
```

2. **Configure environment variables**
```bash
cp .env.docker.example .env.docker
# Edit .env.docker with your settings (IMPORTANT: Change secrets and admin password!)
```

3. **Configure your music folders**

Edit `.env.docker` to point to your music:

```bash
# Your existing music library (read-only)
MUSIC_PATH=/path/to/your/existing/music

# Folder for adding new music (read-write)
MUSIC_UPLOAD_PATH=/path/to/new/music
```

**Two ways to add music:**
- **Read-only library**: Point `MUSIC_PATH` to your existing music collection (safe, won't modify files)
- **Upload folder**: Point `MUSIC_UPLOAD_PATH` to a folder where you can add new files while the container is running

4. **Start Musable**
```bash
docker-compose up -d
```

5. **Access the application**
- Open http://localhost:3001 in your browser
- Login with your configured admin credentials (default: admin@admin.com / admin123)
- The music library will be automatically scanned on first run

6. **Add music while running**
- Simply copy music files to your `MUSIC_UPLOAD_PATH` folder
- Go to Admin Panel → Library Management → Start Library Scan
- New files will be detected and added to your library

**Useful Docker Commands:**

```bash
# View logs
docker-compose logs -f

# Stop Musable
docker-compose down

# Restart Musable
docker-compose restart

# Update to latest version
git pull
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Access container shell
docker-compose exec musable sh
```

**Data Persistence:**

Your data is stored in Docker volumes:
- `musable_data` - Database and application data
- `musable_uploads` - User uploaded files and artwork
- `musable_yt_downloads` - Downloaded YouTube content

**Environment Variables:**

Key variables to configure in `.env.docker`:
- `JWT_SECRET` - Secret for JWT tokens (CHANGE THIS!)
- `SESSION_SECRET` - Secret for sessions (CHANGE THIS!)
- `ADMIN_EMAIL` - Initial admin email
- `ADMIN_PASSWORD` - Initial admin password (CHANGE THIS!)
- `MUSIC_PATH` - Path to your music folder on host system
- `YOUTUBE_API_KEY` - (Optional) For YouTube integration

## Configuration

### Frontend Configuration

Update `frontend/public/config.json` with your server addresses:

```json
{
  "BASE_URL": "https://your-domain.com",
  "API_BASE_URL": "https://your-domain.com/api",
  "WEBSOCKET_URL": "wss://your-domain.com"
}
```

For local development:
```json
{
  "BASE_URL": "http://localhost:3000",
  "API_BASE_URL": "http://localhost:3001/api",
  "WEBSOCKET_URL": "ws://localhost:3001"
}
```

### Library Setup

1. **Configure Library Paths**
   - Add your music folder paths to `LIBRARY_PATHS` in `.env`
   - Paths can be relative or absolute
   - Multiple paths supported

2. **Start Library Scan**
   - Access admin panel → Library Management
   - Click "Start Library Scan"
   - Monitor progress in real-time
   - View scan history and statistics

3. **File Organization**
   - Musable works with any folder structure
   - Recommended: `Artist/Album/Track.mp3`
   - Metadata is extracted from files, not folder names

## Development

### Backend Development
```bash
cd backend
npm run dev          # Start with hot reload
npm run build        # Build for production
npm run test         # Run tests
npm run lint         # Lint TypeScript code
```

### Frontend Development
```bash
cd frontend
npm start            # Start development server
npm run build        # Build for production
npm test             # Run tests
npm run lint         # Lint React code
```

### Database Management
```bash
cd backend
npm run db:init      # Initialize database
npm run db:seed      # Seed with sample data (optional)
```

## Production Deployment

### **Configure reverse proxy** (nginx example)
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Manual Deployment

1. **Configure frontend URLs**
```bash
# Update frontend/public/config.json with your production URLs
nano frontend/public/config.json
```
```json
{
  "BASE_URL": "https://your-domain.com",
  "API_BASE_URL": "https://your-domain.com/api",
  "WEBSOCKET_URL": "wss://your-domain.com"
}
```

2. **Build both applications**
```bash
cd backend && npm run build
cd ../frontend && npm run build
```

3. **Configure production environment**
```bash
cp backend/.env.example backend/.env.production
# Edit production settings
```

4. **Start the production server**
```bash
cd backend
NODE_ENV=production npm start
```

5. **Serve frontend static files** via nginx/Apache

## API Documentation

### Authentication Endpoints
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration (invite required)
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/password` - Change password

### Library Endpoints
- `GET /api/library/songs` - Get songs with filtering
- `GET /api/library/artists` - Get artists
- `GET /api/library/albums` - Get albums
- `POST /api/library/scan` - Start library scan (admin)

### Music Room Endpoints
- `GET /api/rooms/public` - Get public rooms with live status
- `POST /api/rooms` - Create new room
- `POST /api/rooms/join` - Join room by code
- `POST /api/rooms/:id/queue` - Add song to room queue
- `DELETE /api/rooms/:id/queue/:queueId` - Remove song from queue

### Playlist Endpoints
- `GET /api/playlists` - Get user playlists
- `POST /api/playlists` - Create playlist
- `PUT /api/playlists/:id` - Update playlist
- `DELETE /api/playlists/:id` - Delete playlist

### Favorites & Following Endpoints
- `GET /api/favorites` - Get user's favorite songs
- `POST /api/favorites/:songId` - Add song to favorites
- `DELETE /api/favorites/:songId` - Remove song from favorites
- `POST /api/albums/:id/follow` - Follow an album
- `POST /api/playlists/:id/follow` - Follow a playlist

### Sharing Endpoints
- `POST /api/share/songs/:songId` - Create share token for song
- `GET /api/share/:token` - Access shared song

### Admin Endpoints
- `GET /api/admin/dashboard` - Dashboard statistics
- `GET /api/admin/users` - User management
- `POST /api/admin/invites` - Create invite tokens
- `GET /api/admin/history` - System-wide listening history

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- **Issues**: Report bugs and request features via GitHub Issues
- **Documentation**: Check the `docs/` folder for detailed guides
- **Community**: Join our Discord server for support and discussions

## Donations

If you find Musable useful and would like to support its development, you can donate using the following cryptocurrency addresses:

- **Bitcoin (BTC)**: `bc1pxg5t5vh4nskpm4wncwund7x4ekxw2gzyecuxqc5k5pf9ssz5eg2sp30854`
- **Ethereum (ETH)**: `0x3fF92905E8b973bCE6b951F9C5DDb0fD3E2ea256`
- **USDT (TRC20)**: `TWXPW4gRLdhZhJca2aHDBV9D989DRKFLoY`
- **USDT (ERC20)**: `0x3fF92905E8b973bCE6b951F9C5DDb0fD3E2ea256`
- **USDT (BEP20)**: `0x3fF92905E8b973bCE6b951F9C5DDb0fD3E2ea256`
- **Litecoin (LTC)**: `ltc1qr57r6e9437l69gtu885nzzrlhc4hfp9z8edml8`

Your support is greatly appreciated!