import type { Request, Response } from 'express';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';
import ListenHistoryModel from '../models/ListenHistory.js';
import topService from '../services/topService.js';

export const getArtistTopTracks = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const scope = (req.query.scope as string) || 'all-time';
    const limit = parseInt((req.query.limit as string) || '20', 10);
    const force = req.query.forceRefresh === 'true';

    const artistId = parseInt(id, 10);
    if (Number.isNaN(artistId)) {
      throw new AppError('Invalid artist id', 400);
    }

    const result = await topService.getArtistTopTracksMatched(
      artistId,
      scope,
      force,
      limit,
    );

    res.json({
      success: true,
      data: {
        provider: 'lastfm',
        subject: { type: 'artist', id: artistId },
        itemType: 'track',
        scope,
        scannedAt: result.cache.scanned_at,
        expiresAt: result.cache.expires_at,
        tracks: result.items,
      },
    });
  },
);

export const refreshArtistTopTracks = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const scope = (req.query.scope as string) || 'all-time';
    const limit = parseInt((req.query.limit as string) || '20', 10);
    const artistId = parseInt(id, 10);
    if (Number.isNaN(artistId)) {
      throw new AppError('Invalid artist id', 400);
    }
    const result = await topService.getArtistTopTracksMatched(
      artistId,
      scope,
      true,
      limit,
    );
    res.json({
      success: true,
      data: {
        provider: 'lastfm',
        subject: { type: 'artist', id: artistId },
        itemType: 'track',
        scope,
        scannedAt: result.cache.scanned_at,
        expiresAt: result.cache.expires_at,
        tracks: result.items,
      },
    });
  },
);

export const getTops = asyncHandler(async (req: Request, res: Response) => {
  const subjectType = (req.query.subjectType as string) || '';
  const subjectId = req.query.subjectId
    ? parseInt(req.query.subjectId as string, 10)
    : undefined;
  const itemType = (req.query.itemType as string) || '';
  const scope = (req.query.scope as string) || 'all-time';
  const provider = (req.query.provider as string) || 'lastfm';
  const limit = parseInt((req.query.limit as string) || '20', 10);
  const force = req.query.forceRefresh === 'true';

  if (
    subjectType === 'artist' &&
    itemType === 'track' &&
    typeof subjectId === 'number' &&
    provider === 'lastfm'
  ) {
    const result = await topService.getArtistTopTracksMatched(
      subjectId,
      scope,
      force,
      limit,
    );
    return res.json({
      success: true,
      data: {
        provider: 'lastfm',
        subject: { type: 'artist', id: subjectId },
        itemType: 'track',
        scope,
        scannedAt: result.cache.scanned_at,
        expiresAt: result.cache.expires_at,
        items: result.items,
      },
    });
  }

  throw new AppError('Requested tops not implemented', 400);
});

export const getMyTops = asyncHandler(
  async (req: Request & { user?: { id: number } }, res: Response) => {
    const userId = req.user?.id;
    const itemType = (req.params.itemType as string) || 'track';
    const scope = (req.query.scope as string) || '30d';

    if (!userId) throw new AppError('Unauthorized', 401);
    if (itemType !== 'track') {
      return res.json({ success: true, data: { items: [], scope, itemType } });
    }

    let sinceIso: string | undefined;
    if (scope.endsWith('d')) {
      const days = parseInt(scope.slice(0, -1), 10);
      const since = new Date(Date.now() - days * 24 * 3600 * 1000);
      sinceIso = since.toISOString();
    } else if (scope.startsWith('year:')) {
      const year = parseInt(scope.split(':')[1], 10);
      sinceIso = new Date(Date.UTC(year, 0, 1)).toISOString();
    }

    const limit = parseInt((req.query.limit as string) || '50', 10);
    const items = await ListenHistoryModel.getUserTopSongs(
      userId,
      limit,
      sinceIso,
    );
    return res.json({ success: true, data: { items, scope, itemType } });
  },
);
