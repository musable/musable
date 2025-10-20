"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeviceService = void 0;
const Device_1 = require("../models/Device");
class DeviceService {
    static async registerDevice(userId, deviceInfo) {
        const deviceCount = await Device_1.DeviceModel.getUserDeviceCount(userId);
        const existing = await Device_1.DeviceModel.getByDeviceId(deviceInfo.deviceId);
        if (!existing && deviceCount >= 10) {
            throw new Error('Maximum number of devices (10) reached');
        }
        const device = await Device_1.DeviceModel.registerDevice(userId, deviceInfo);
        return device;
    }
    static async getUserDevices(userId) {
        return await Device_1.DeviceModel.getUserDevices(userId);
    }
    static async updateDeviceActivity(deviceId) {
        await Device_1.DeviceModel.updateActivity(deviceId);
    }
    static async updateDeviceName(userId, deviceId, name) {
        const device = await Device_1.DeviceModel.getByDeviceId(deviceId);
        if (!device || device.userId !== userId) {
            throw new Error('Device not found or access denied');
        }
        const updated = await Device_1.DeviceModel.updateName(deviceId, name);
        if (!updated) {
            throw new Error('Failed to update device name');
        }
        return updated;
    }
    static async deleteDevice(userId, deviceId) {
        const device = await Device_1.DeviceModel.getByDeviceId(deviceId);
        if (!device || device.userId !== userId) {
            throw new Error('Device not found or access denied');
        }
        await Device_1.DeviceModel.delete(deviceId);
    }
    static async cleanupInactiveDevices() {
        await Device_1.DeviceModel.cleanupInactive();
    }
    static async getDevice(userId, deviceId) {
        const device = await Device_1.DeviceModel.getByDeviceId(deviceId);
        if (!device || device.userId !== userId) {
            return null;
        }
        return device;
    }
}
exports.DeviceService = DeviceService;
//# sourceMappingURL=deviceService.js.map