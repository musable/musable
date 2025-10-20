import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import mime from 'mime-types';
import SongModel from '../models/Song';
import { AuthRequest, optionalAuth } from '../middleware/auth';
import { AppError, asyncHandler } from '../middleware/errorHandler';

const router = Router();

router.get('/:id', optionalAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const songId = parseInt(id);

  if (isNaN(songId)) {
    throw new AppError('Invalid song ID', 400);
  }

  const song = await SongModel.findById(songId);
  if (!song) {
    throw new AppError('Song not found', 404);
  }

  if (!fs.existsSync(song.file_path)) {
    throw new AppError('Audio file not found on disk', 404);
  }

  const stat = fs.statSync(song.file_path);
  const total = stat.size;

  if (req.headers.range) {
    const range = req.headers.range;
    const parts = range.replace(/bytes=/, "").split("-");
    const partialStart = parts[0];
    const partialEnd = parts[1];

    const start = parseInt(partialStart, 10);
    const end = partialEnd ? parseInt(partialEnd, 10) : total - 1;
    const chunkSize = (end - start) + 1;

    const readStream = fs.createReadStream(song.file_path, { start, end });

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${total}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize.toString(),
      'Content-Type': mime.lookup(song.file_path) || 'audio/mpeg',
      'Cache-Control': 'public, max-age=3600'
    });

    readStream.pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Length': total.toString(),
      'Content-Type': mime.lookup(song.file_path) || 'audio/mpeg',
      'Cache-Control': 'public, max-age=3600',
      'Accept-Ranges': 'bytes'
    });

    fs.createReadStream(song.file_path).pipe(res);
  }
}));

export default router;