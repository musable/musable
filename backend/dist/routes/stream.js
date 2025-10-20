"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const fs_1 = __importDefault(require("fs"));
const mime_types_1 = __importDefault(require("mime-types"));
const Song_1 = __importDefault(require("../models/Song"));
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const router = (0, express_1.Router)();
router.get('/:id', auth_1.optionalAuth, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const songId = parseInt(id);
    if (isNaN(songId)) {
        throw new errorHandler_1.AppError('Invalid song ID', 400);
    }
    const song = await Song_1.default.findById(songId);
    if (!song) {
        throw new errorHandler_1.AppError('Song not found', 404);
    }
    if (!fs_1.default.existsSync(song.file_path)) {
        throw new errorHandler_1.AppError('Audio file not found on disk', 404);
    }
    const stat = fs_1.default.statSync(song.file_path);
    const total = stat.size;
    if (req.headers.range) {
        const range = req.headers.range;
        const parts = range.replace(/bytes=/, "").split("-");
        const partialStart = parts[0];
        const partialEnd = parts[1];
        const start = parseInt(partialStart, 10);
        const end = partialEnd ? parseInt(partialEnd, 10) : total - 1;
        const chunkSize = (end - start) + 1;
        const readStream = fs_1.default.createReadStream(song.file_path, { start, end });
        res.writeHead(206, {
            'Content-Range': `bytes ${start}-${end}/${total}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunkSize.toString(),
            'Content-Type': mime_types_1.default.lookup(song.file_path) || 'audio/mpeg',
            'Cache-Control': 'public, max-age=3600'
        });
        readStream.pipe(res);
    }
    else {
        res.writeHead(200, {
            'Content-Length': total.toString(),
            'Content-Type': mime_types_1.default.lookup(song.file_path) || 'audio/mpeg',
            'Cache-Control': 'public, max-age=3600',
            'Accept-Ranges': 'bytes'
        });
        fs_1.default.createReadStream(song.file_path).pipe(res);
    }
}));
exports.default = router;
//# sourceMappingURL=stream.js.map