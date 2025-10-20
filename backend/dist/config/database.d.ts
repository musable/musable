import sqlite3 from 'sqlite3';
export declare class Database {
    private static instance;
    private db;
    private constructor();
    static getInstance(): Database;
    getDatabase(): sqlite3.Database;
    query<T = any>(sql: string, params?: any[]): Promise<T[]>;
    get<T = any>(sql: string, params?: any[]): Promise<T | null>;
    run(sql: string, params?: any[]): Promise<sqlite3.RunResult>;
    transaction<T>(callback: (db: sqlite3.Database) => Promise<T>): Promise<T>;
    close(): Promise<void>;
}
declare const _default: Database;
export default _default;
//# sourceMappingURL=database.d.ts.map