export interface Device {
    id: number;
    userId: number;
    deviceId: string;
    deviceName: string;
    deviceType: 'desktop' | 'mobile' | 'tablet';
    browser: string;
    os: string;
    lastActive: string;
    createdAt: string;
}
export interface DeviceInfo {
    deviceId: string;
    deviceName: string;
    deviceType: 'desktop' | 'mobile' | 'tablet';
    browser: string;
    os: string;
}
export declare class DeviceModel {
    static registerDevice(userId: number, deviceInfo: DeviceInfo): Promise<Device>;
    static getById(id: number): Promise<Device | null>;
    static getByDeviceId(deviceId: string): Promise<Device | null>;
    static getUserDevices(userId: number): Promise<Device[]>;
    static updateActivity(deviceId: string): Promise<void>;
    static updateName(deviceId: string, name: string): Promise<Device | null>;
    static delete(deviceId: string): Promise<void>;
    static cleanupInactive(): Promise<void>;
    static getUserDeviceCount(userId: number): Promise<number>;
}
//# sourceMappingURL=Device.d.ts.map