import { Request, Response } from 'express';
import SongModel from '../models/Song';
import ArtistModel from '../models/Artist';
import AlbumModel from '../models/Album';
import AlbumFollowsModel from '../models/AlbumFollows';
import libraryScanner from '../services/libraryScanner';
import ytMusicService from '../services/ytMusicService';
import { AuthRequest } from '../middleware/auth';
import { AppError, asyncHandler } from '../middleware/errorHandler';

export const getAllSongs = asyncHandler(async (req: Request, res: Response) => {
  const { search, artist, album, genre, limit = 50, offset = 0, includeYTMusic = 'true' } = req.query;

  let songs;
  let ytMusicResults = [];

  if (search) {
    // Get local songs
    songs = await SongModel.searchSongs(search as string);
    
    // Also search YouTube Music if enabled
    console.log(`🎵 Search query: "${search}", includeYTMusic: "${includeYTMusic}"`);
    if (includeYTMusic === 'true') {
      try {
        console.log('🎵 Searching YouTube Music...');
        ytMusicResults = await ytMusicService.searchMusic(search as string);
        console.log(`🎵 Found ${ytMusicResults.length} YouTube Music results`);
      } catch (error) {
        console.error('YouTube Music search error:', error);
        // Continue without YT Music results if it fails
      }
    }
  } else if (genre) {
    songs = await SongModel.getSongsByGenre(genre as string);
  } else if (artist) {
    songs = await SongModel.getSongsByArtist(parseInt(artist as string));
  } else if (album) {
    songs = await SongModel.getSongsByAlbum(parseInt(album as string));
  } else {
    songs = await SongModel.getAllWithDetails();
  }

  const limitNum = parseInt(limit as string);
  const offsetNum = parseInt(offset as string);
  
  const paginatedSongs = songs.slice(offsetNum, offsetNum + limitNum);

  res.json({
    success: true,
    data: {
      songs: paginatedSongs,
      ytMusicResults: search ? ytMusicResults : [],
      total: songs.length,
      limit: limitNum,
      offset: offsetNum,
      hasYTMusicResults: ytMusicResults.length > 0
    }
  });
});

export const getSong = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  const song = await SongModel.findWithDetails(parseInt(id));
  if (!song) {
    throw new AppError('Song not found', 404);
  }

  res.json({
    success: true,
    data: { song }
  });
});

export const getRandomSongs = asyncHandler(async (req: Request, res: Response) => {
  const { limit = 50 } = req.query;
  
  const songs = await SongModel.getRandomSongs(parseInt(limit as string));

  res.json({
    success: true,
    data: { songs }
  });
});

export const getAllArtists = asyncHandler(async (req: Request, res: Response) => {
  const { search } = req.query;

  let artists;
  
  if (search) {
    artists = await ArtistModel.search(search as string);
  } else {
    artists = await ArtistModel.getAllWithStats();
  }

  res.json({
    success: true,
    data: { artists }
  });
});

export const getArtist = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  const artist = await ArtistModel.findById(parseInt(id));
  if (!artist) {
    throw new AppError('Artist not found', 404);
  }

  const songs = await SongModel.getSongsByArtist(artist.id);
  const albums = await AlbumModel.getAlbumsByArtist(artist.id);

  res.json({
    success: true,
    data: {
      artist,
      songs,
      albums
    }
  });
});

export const getAllAlbums = asyncHandler(async (req: Request, res: Response) => {
  const { search, artist } = req.query;

  let albums;

  if (search) {
    albums = await AlbumModel.search(search as string);
  } else if (artist) {
    albums = await AlbumModel.getAlbumsByArtist(parseInt(artist as string));
  } else {
    albums = await AlbumModel.getAllWithDetails();
  }

  res.json({
    success: true,
    data: { albums }
  });
});

export const getAlbum = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  const album = await AlbumModel.findWithDetails(parseInt(id));
  if (!album) {
    throw new AppError('Album not found', 404);
  }

  const songs = await SongModel.getSongsByAlbum(album.id);

  res.json({
    success: true,
    data: {
      album,
      songs
    }
  });
});

export const getRecentAlbums = asyncHandler(async (req: Request, res: Response) => {
  const { limit = 20 } = req.query;
  
  const albums = await AlbumModel.getRecentAlbums(parseInt(limit as string));

  res.json({
    success: true,
    data: { albums }
  });
});

export const getGenres = asyncHandler(async (req: Request, res: Response) => {
  const genres = await SongModel.getGenres();

  res.json({
    success: true,
    data: { genres }
  });
});

export const getLibraryStats = asyncHandler(async (req: Request, res: Response) => {
  const stats = await libraryScanner.getLibraryStats();

  res.json({
    success: true,
    data: { stats }
  });
});

export const startLibraryScan = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user?.is_admin) {
    throw new AppError('Admin access required', 403);
  }

  const { paths } = req.body;

  if (libraryScanner.isCurrentlyScanning()) {
    throw new AppError('Library scan already in progress', 409);
  }

  const scanId = await libraryScanner.startScan(paths);

  res.json({
    success: true,
    data: {
      scanId,
      message: 'Library scan started'
    }
  });
});

export const getScanStatus = asyncHandler(async (req: Request, res: Response) => {
  const currentScan = libraryScanner.getCurrentScan();
  const scanHistory = await libraryScanner.getScanHistory();

  res.json({
    success: true,
    data: {
      currentScan,
      history: scanHistory,
      isScanning: libraryScanner.isCurrentlyScanning()
    }
  });
});

// Album Follow endpoints
export const followAlbum = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const albumId = parseInt(id);
  const userId = req.user!.id;

  const album = await AlbumModel.findById(albumId);
  if (!album) {
    throw new AppError('Album not found', 404);
  }

  await AlbumFollowsModel.followAlbum(userId, albumId);

  res.json({
    success: true,
    data: { message: 'Album followed successfully' }
  });
});

export const unfollowAlbum = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const albumId = parseInt(id);
  const userId = req.user!.id;

  await AlbumFollowsModel.unfollowAlbum(userId, albumId);

  res.json({
    success: true,
    data: { message: 'Album unfollowed successfully' }
  });
});

export const toggleAlbumFollow = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const albumId = parseInt(id);
  const userId = req.user!.id;

  const album = await AlbumModel.findById(albumId);
  if (!album) {
    throw new AppError('Album not found', 404);
  }

  const result = await AlbumFollowsModel.toggleAlbumFollow(userId, albumId);

  res.json({
    success: true,
    data: { 
      isFollowing: result.isFollowing,
      message: result.isFollowing ? 'Album followed successfully' : 'Album unfollowed successfully'
    }
  });
});

export const getFollowedAlbums = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const albums = await AlbumFollowsModel.getUserFollowedAlbums(userId);

  res.json({
    success: true,
    data: { albums }
  });
});

export const getAlbumsWithFollowStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;

  const albums = await AlbumFollowsModel.getAlbumsWithFollowStatus(userId, limit, offset);

  res.json({
    success: true,
    data: { albums }
  });
});

export const getAlbumFollowStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const albumId = parseInt(id);
  const userId = req.user!.id;

  const isFollowing = await AlbumFollowsModel.isFollowingAlbum(userId, albumId);

  res.json({
    success: true,
    data: { isFollowing }
  });
});