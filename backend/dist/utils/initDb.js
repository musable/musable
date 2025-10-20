"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeDatabase = initializeDatabase;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const database_1 = __importDefault(require("../config/database"));
async function initializeDatabase() {
    try {
        const db = database_1.default;
        const schemaPath = path_1.default.join(__dirname, '../models/schemas/database.sql');
        const schema = fs_1.default.readFileSync(schemaPath, 'utf8');
        const statements = schema
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0);
        console.log('Initializing database...');
        for (const statement of statements) {
            try {
                await db.run(statement);
            }
            catch (error) {
                if (!error.message.includes('already exists') && !error.message.includes('duplicate column name')) {
                    console.error('Error executing statement:', statement);
                    throw error;
                }
            }
        }
        console.log('Database initialized successfully');
    }
    catch (error) {
        console.error('Failed to initialize database:', error);
        throw error;
    }
}
if (require.main === module) {
    initializeDatabase()
        .then(() => {
        console.log('Database initialization complete');
        process.exit(0);
    })
        .catch((error) => {
        console.error('Database initialization failed:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=initDb.js.map