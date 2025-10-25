export type SubjectType = 'artist' | 'user' | 'tag' | 'genre';
export type ItemType = 'track' | 'artist' | 'album' | 'tag' | 'genre';

export interface GetTopParams {
  subjectType: SubjectType;
  subjectId?: number;
  subjectValue?: string;
  itemType: ItemType;
  scopeKey: string; // e.g., 'all-time', '30d', 'year:1995'
  limit?: number;
}

export interface NormalizedTopItem {
  rank: number;
  title?: string;
  externalId?: string;
  playcount?: number;
  listeners?: number;
  score?: number;
  url?: string;
  duration?: number; // seconds
  // Provider-specific raw may be kept out of DB to keep it lean
}

export interface TopProviderResult {
  items: NormalizedTopItem[];
}

export interface TopProvider {
  readonly name: string; // provider id, e.g., 'lastfm', 'local-plays'
  supports(params: GetTopParams): boolean;
  getTop(params: GetTopParams): Promise<TopProviderResult>;
}
