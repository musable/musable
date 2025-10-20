export interface LibraryPath {
    id?: number;
    path: string;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
}
export interface SystemSettings {
    id?: number;
    key: string;
    value: string;
    created_at?: string;
    updated_at?: string;
}
declare class SettingsModel {
    private db;
    getLibraryPaths(): Promise<LibraryPath[]>;
    addLibraryPath(path: string): Promise<LibraryPath>;
    updateLibraryPath(id: number, updates: Partial<LibraryPath>): Promise<LibraryPath>;
    deleteLibraryPath(id: number): Promise<void>;
    getActivePaths(): Promise<string[]>;
    getSetting(key: string): Promise<string | null>;
    setSetting(key: string, value: string): Promise<void>;
    initializeDefaultPaths(): Promise<void>;
    initializeDefaultSettings(): Promise<void>;
    static get(key: string): Promise<string | null>;
    static set(key: string, value: string): Promise<void>;
}
declare const settingsInstance: SettingsModel;
export default settingsInstance;
//# sourceMappingURL=Settings.d.ts.map