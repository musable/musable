"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArtistModel = void 0;
const database_1 = __importDefault(require("../config/database"));
class ArtistModel {
    constructor() {
        this.db = database_1.default;
    }
    async findByName(name) {
        return await this.db.get('SELECT * FROM artists WHERE name = ?', [name]);
    }
    async findById(id) {
        return await this.db.get('SELECT * FROM artists WHERE id = ?', [id]);
    }
    async create(name) {
        const result = await this.db.run('INSERT INTO artists (name) VALUES (?)', [name]);
        const artist = await this.findById(result.lastID);
        if (!artist) {
            throw new Error('Failed to create artist');
        }
        return artist;
    }
    async findOrCreate(name) {
        let artist = await this.findByName(name);
        if (!artist) {
            artist = await this.create(name);
        }
        return artist;
    }
    async getAllWithStats() {
        return await this.db.query(`SELECT 
        a.*,
        COUNT(DISTINCT s.id) as song_count,
        COUNT(DISTINCT al.id) as album_count
       FROM artists a
       LEFT JOIN songs s ON a.id = s.artist_id
       LEFT JOIN albums al ON a.id = al.artist_id
       GROUP BY a.id
       ORDER BY a.name`);
    }
    async search(query) {
        const searchTerm = `%${query}%`;
        return await this.db.query('SELECT * FROM artists WHERE name LIKE ? ORDER BY name', [searchTerm]);
    }
    async update(id, name) {
        await this.db.run('UPDATE artists SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [name, id]);
    }
    async delete(id) {
        await this.db.run('DELETE FROM artists WHERE id = ?', [id]);
    }
    async getArtistCount() {
        const result = await this.db.get('SELECT COUNT(*) as count FROM artists');
        return result.count;
    }
}
exports.ArtistModel = ArtistModel;
exports.default = new ArtistModel();
//# sourceMappingURL=Artist.js.map