"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlbumModel = void 0;
const database_1 = __importDefault(require("../config/database"));
class AlbumModel {
    constructor() {
        this.db = database_1.default;
    }
    async findById(id) {
        return await this.db.get('SELECT * FROM albums WHERE id = ?', [id]);
    }
    async findByTitleAndArtist(title, artistId) {
        return await this.db.get('SELECT * FROM albums WHERE title = ? AND artist_id = ?', [title, artistId]);
    }
    async create(albumData) {
        const result = await this.db.run('INSERT INTO albums (title, artist_id, release_year, artwork_path) VALUES (?, ?, ?, ?)', [albumData.title, albumData.artist_id, albumData.release_year || null, albumData.artwork_path || null]);
        const album = await this.findById(result.lastID);
        if (!album) {
            throw new Error('Failed to create album');
        }
        return album;
    }
    async findOrCreate(title, artistId, releaseYear) {
        let album = await this.findByTitleAndArtist(title, artistId);
        if (!album) {
            album = await this.create({
                title,
                artist_id: artistId,
                release_year: releaseYear
            });
        }
        return album;
    }
    async findWithDetails(id) {
        return await this.db.get(`SELECT 
        al.*,
        a.name as artist_name,
        COUNT(s.id) as song_count,
        COALESCE(SUM(s.duration), 0) as total_duration
       FROM albums al
       JOIN artists a ON al.artist_id = a.id
       LEFT JOIN songs s ON al.id = s.album_id
       WHERE al.id = ?
       GROUP BY al.id`, [id]);
    }
    async getAllWithDetails() {
        return await this.db.query(`SELECT 
        al.*,
        a.name as artist_name,
        COUNT(s.id) as song_count,
        COALESCE(SUM(s.duration), 0) as total_duration
       FROM albums al
       JOIN artists a ON al.artist_id = a.id
       LEFT JOIN songs s ON al.id = s.album_id
       GROUP BY al.id
       ORDER BY a.name, al.title`);
    }
    async getAlbumsByArtist(artistId) {
        return await this.db.query(`SELECT 
        al.*,
        a.name as artist_name,
        COUNT(s.id) as song_count,
        COALESCE(SUM(s.duration), 0) as total_duration
       FROM albums al
       JOIN artists a ON al.artist_id = a.id
       LEFT JOIN songs s ON al.id = s.album_id
       WHERE al.artist_id = ?
       GROUP BY al.id
       ORDER BY al.release_year DESC, al.title`, [artistId]);
    }
    async search(query) {
        const searchTerm = `%${query}%`;
        return await this.db.query(`SELECT 
        al.*,
        a.name as artist_name,
        COUNT(s.id) as song_count,
        COALESCE(SUM(s.duration), 0) as total_duration
       FROM albums al
       JOIN artists a ON al.artist_id = a.id
       LEFT JOIN songs s ON al.id = s.album_id
       WHERE al.title LIKE ? OR a.name LIKE ?
       GROUP BY al.id
       ORDER BY a.name, al.title`, [searchTerm, searchTerm]);
    }
    async updateArtwork(id, artworkPath) {
        await this.db.run('UPDATE albums SET artwork_path = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [artworkPath, id]);
    }
    async update(id, updates) {
        const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
        const values = Object.values(updates);
        values.push(id);
        await this.db.run(`UPDATE albums SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, values);
    }
    async delete(id) {
        await this.db.run('DELETE FROM albums WHERE id = ?', [id]);
    }
    async getAlbumCount() {
        const result = await this.db.get('SELECT COUNT(*) as count FROM albums');
        return result.count;
    }
    async getRecentAlbums(limit = 20) {
        return await this.db.query(`SELECT 
        al.*,
        a.name as artist_name,
        COUNT(s.id) as song_count,
        COALESCE(SUM(s.duration), 0) as total_duration
       FROM albums al
       JOIN artists a ON al.artist_id = a.id
       LEFT JOIN songs s ON al.id = s.album_id
       GROUP BY al.id
       ORDER BY al.created_at DESC
       LIMIT ?`, [limit]);
    }
}
exports.AlbumModel = AlbumModel;
exports.default = new AlbumModel();
//# sourceMappingURL=Album.js.map