"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SongModel = void 0;
const database_1 = __importDefault(require("../config/database"));
class SongModel {
    constructor() {
        this.db = database_1.default;
    }
    async create(songData) {
        const result = await this.db.run(`INSERT INTO songs (
        title, artist_id, album_id, file_path, file_size, duration,
        track_number, genre, year, bitrate, sample_rate, source, youtube_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            songData.title,
            songData.artist_id,
            songData.album_id || null,
            songData.file_path,
            songData.file_size || null,
            songData.duration || null,
            songData.track_number || null,
            songData.genre || null,
            songData.year || null,
            songData.bitrate || null,
            songData.sample_rate || null,
            songData.source || 'local',
            songData.youtube_id || null
        ]);
        const song = await this.findById(result.lastID);
        if (!song) {
            throw new Error('Failed to create song');
        }
        return song;
    }
    async findById(id) {
        return await this.db.get('SELECT * FROM songs WHERE id = ?', [id]);
    }
    async findByPath(filePath) {
        return await this.db.get('SELECT * FROM songs WHERE file_path = ?', [filePath]);
    }
    async findByYoutubeId(youtubeId) {
        return await this.db.get('SELECT * FROM songs WHERE youtube_id = ?', [youtubeId]);
    }
    async findWithDetails(id) {
        return await this.db.get(`SELECT 
        s.*,
        a.name as artist_name,
        al.title as album_title,
        al.artwork_path
       FROM songs s
       JOIN artists a ON s.artist_id = a.id
       LEFT JOIN albums al ON s.album_id = al.id
       WHERE s.id = ?`, [id]);
    }
    async getAllWithDetails() {
        return await this.db.query(`SELECT 
        s.*,
        a.name as artist_name,
        al.title as album_title,
        al.artwork_path
       FROM songs s
       JOIN artists a ON s.artist_id = a.id
       LEFT JOIN albums al ON s.album_id = al.id
       ORDER BY a.name, al.title, s.track_number, s.title`);
    }
    async searchSongs(query) {
        const searchTerm = `%${query}%`;
        return await this.db.query(`SELECT 
        s.*,
        a.name as artist_name,
        al.title as album_title,
        al.artwork_path
       FROM songs s
       JOIN artists a ON s.artist_id = a.id
       LEFT JOIN albums al ON s.album_id = al.id
       WHERE s.title LIKE ? 
          OR a.name LIKE ? 
          OR al.title LIKE ?
          OR s.genre LIKE ?
       ORDER BY a.name, al.title, s.track_number, s.title`, [searchTerm, searchTerm, searchTerm, searchTerm]);
    }
    async getSongsByArtist(artistId) {
        return await this.db.query(`SELECT 
        s.*,
        a.name as artist_name,
        al.title as album_title,
        al.artwork_path
       FROM songs s
       JOIN artists a ON s.artist_id = a.id
       LEFT JOIN albums al ON s.album_id = al.id
       WHERE s.artist_id = ?
       ORDER BY al.title, s.track_number, s.title`, [artistId]);
    }
    async getSongsByAlbum(albumId) {
        return await this.db.query(`SELECT 
        s.*,
        a.name as artist_name,
        al.title as album_title,
        al.artwork_path
       FROM songs s
       JOIN artists a ON s.artist_id = a.id
       LEFT JOIN albums al ON s.album_id = al.id
       WHERE s.album_id = ?
       ORDER BY s.track_number, s.title`, [albumId]);
    }
    async updateSong(id, updates) {
        const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
        const values = Object.values(updates);
        values.push(id);
        await this.db.run(`UPDATE songs SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, values);
    }
    async deleteSong(id) {
        await this.db.run('DELETE FROM songs WHERE id = ?', [id]);
    }
    async getSongCount() {
        const result = await this.db.get('SELECT COUNT(*) as count FROM songs');
        return result.count;
    }
    async getTotalDuration() {
        const result = await this.db.get('SELECT SUM(duration) as total FROM songs WHERE duration IS NOT NULL');
        return result.total || 0;
    }
    async getGenres() {
        const result = await this.db.query('SELECT DISTINCT genre FROM songs WHERE genre IS NOT NULL ORDER BY genre');
        return result.map(r => r.genre);
    }
    async getSongsByGenre(genre) {
        return await this.db.query(`SELECT 
        s.*,
        a.name as artist_name,
        al.title as album_title,
        al.artwork_path
       FROM songs s
       JOIN artists a ON s.artist_id = a.id
       LEFT JOIN albums al ON s.album_id = al.id
       WHERE s.genre = ?
       ORDER BY a.name, al.title, s.track_number, s.title`, [genre]);
    }
    async getRandomSongs(limit = 50) {
        return await this.db.query(`SELECT 
        s.*,
        a.name as artist_name,
        al.title as album_title,
        al.artwork_path
       FROM songs s
       JOIN artists a ON s.artist_id = a.id
       LEFT JOIN albums al ON s.album_id = al.id
       ORDER BY RANDOM()
       LIMIT ?`, [limit]);
    }
}
exports.SongModel = SongModel;
exports.default = new SongModel();
//# sourceMappingURL=Song.js.map