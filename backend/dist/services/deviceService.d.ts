import { Device, DeviceInfo } from '../models/Device';
export declare class DeviceService {
    static registerDevice(userId: number, deviceInfo: DeviceInfo): Promise<Device>;
    static getUserDevices(userId: number): Promise<Device[]>;
    static updateDeviceActivity(deviceId: string): Promise<void>;
    static updateDeviceName(userId: number, deviceId: string, name: string): Promise<Device>;
    static deleteDevice(userId: number, deviceId: string): Promise<void>;
    static cleanupInactiveDevices(): Promise<void>;
    static getDevice(userId: number, deviceId: string): Promise<Device | null>;
}
//# sourceMappingURL=deviceService.d.ts.map