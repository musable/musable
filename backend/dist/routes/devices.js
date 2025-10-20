"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const deviceService_1 = require("../services/deviceService");
const logger_1 = __importDefault(require("../utils/logger"));
const router = (0, express_1.Router)();
router.get('/', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const userId = req.user.id;
        const devices = await deviceService_1.DeviceService.getUserDevices(userId);
        res.json({
            success: true,
            data: devices,
            message: 'Devices retrieved successfully'
        });
    }
    catch (error) {
        logger_1.default.error('[DevicesRoute] Error getting devices:', error);
        next(error);
    }
});
router.put('/:deviceId/name', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { deviceId } = req.params;
        const { name } = req.body;
        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return res.status(400).json({ error: 'Invalid device name' });
        }
        const device = await deviceService_1.DeviceService.updateDeviceName(userId, deviceId, name.trim());
        if (!device) {
            return res.status(404).json({ error: 'Device not found' });
        }
        res.json(device);
    }
    catch (error) {
        logger_1.default.error('[DevicesRoute] Error updating device name:', error);
        if (error.message === 'Device not found or access denied') {
            return res.status(404).json({ error: error.message });
        }
        next(error);
    }
});
router.delete('/:deviceId', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { deviceId } = req.params;
        await deviceService_1.DeviceService.deleteDevice(userId, deviceId);
        res.status(204).send();
    }
    catch (error) {
        logger_1.default.error('[DevicesRoute] Error deleting device:', error);
        if (error.message === 'Device not found or access denied') {
            return res.status(404).json({ error: error.message });
        }
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=devices.js.map