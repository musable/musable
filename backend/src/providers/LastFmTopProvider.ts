import axios from 'axios';
import type {
  GetTopParams,
  TopProvider,
  TopProviderResult,
} from './TopProvider.js';

interface LastFmTrack {
  name: string;
  mbid?: string;
  url?: string;
  playcount?: string | number;
  listeners?: string | number;
  streamable?: string;
  artist?: {
    name: string;
    mbid: string;
    url: string;
  };
  image?: Array<{
    '#text': string;
    size: string;
  }>;
  '@attr'?: {
    rank: string;
  };
}

export class LastFmTopProvider implements TopProvider {
  public readonly name = 'lastfm';
  private readonly apiKey: string | undefined;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.LASTFM_API_KEY;
  }

  supports(params: GetTopParams): boolean {
    // Initial support: artist -> top tracks
    return (
      params.subjectType === 'artist' &&
      typeof params.subjectId === 'number' &&
      params.itemType === 'track'
    );
  }

  async getTop(params: GetTopParams): Promise<TopProviderResult> {
    if (!this.apiKey) {
      return { items: [] };
    }

    // We need artist name; caller must provide it separately or resolve before calling
    // For now, overload subjectValue to carry artist name when subjectType='artist'
    const artistName = params.subjectValue;
    if (!artistName) {
      return { items: [] };
    }

    const limit = params.limit ?? 50;
    const url = 'https://ws.audioscrobbler.com/2.0/';
    const searchParams = new URLSearchParams({
      method: 'artist.gettoptracks',
      artist: artistName,
      api_key: this.apiKey,
      format: 'json',
      limit: String(limit),
    });

    const resp = await axios.get(`${url}?${searchParams.toString()}`);

    interface LastFmTrackRaw {
      name?: unknown;
      mbid?: unknown;
      url?: unknown;
      playcount?: unknown;
      listeners?: unknown;
      streamable?: unknown;
      artist?: {
        name?: unknown;
        mbid?: unknown;
        url?: unknown;
      };
      image?: Array<{
        '#text'?: unknown;
        size?: unknown;
      }>;
      '@attr'?: {
        rank?: unknown;
        playcount?: unknown;
      };
    }

    const rawTracks = resp.data?.toptracks?.track as unknown;
    const tracks: LastFmTrackRaw[] = Array.isArray(rawTracks)
      ? (rawTracks as LastFmTrackRaw[])
      : [];

    const items = tracks.map((t, idx: number) => {
      const lt: LastFmTrack = {
        name: typeof t.name === 'string' ? t.name : '',
        mbid: typeof t.mbid === 'string' && t.mbid !== '' ? t.mbid : undefined,
        url: typeof t.url === 'string' && t.url !== '' ? t.url : undefined,
        playcount:
          typeof t.playcount === 'string' || typeof t.playcount === 'number'
            ? t.playcount
            : typeof t['@attr']?.playcount === 'string'
              ? t['@attr']?.playcount
              : undefined,
        listeners:
          typeof t.listeners === 'string' || typeof t.listeners === 'number'
            ? t.listeners
            : undefined,
        streamable: typeof t.streamable === 'string' ? t.streamable : undefined,
        artist: t.artist
          ? {
              name: typeof t.artist.name === 'string' ? t.artist.name : '',
              mbid: typeof t.artist.mbid === 'string' ? t.artist.mbid : '',
              url: typeof t.artist.url === 'string' ? t.artist.url : '',
            }
          : undefined,
        image: Array.isArray(t.image)
          ? t.image.map((img) => ({
              '#text': typeof img['#text'] === 'string' ? img['#text'] : '',
              size: typeof img.size === 'string' ? img.size : '',
            }))
          : undefined,
        '@attr': t['@attr']
          ? {
              rank:
                typeof t['@attr']?.rank === 'string' ? t['@attr']?.rank : '',
            }
          : undefined,
      };

      // Use the rank from @attr if available, otherwise use array index + 1
      const rank = lt['@attr']?.rank ? Number(lt['@attr'].rank) : idx + 1;

      return {
        rank,
        title: lt.name,
        externalId: lt.mbid,
        playcount:
          lt.playcount !== undefined ? Number(lt.playcount) : undefined,
        listeners:
          lt.listeners !== undefined ? Number(lt.listeners) : undefined,
        url: lt.url,
      };
    });

    return { items };
  }
}

export default LastFmTopProvider;
