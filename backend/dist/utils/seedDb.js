"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedDatabase = seedDatabase;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const database_1 = __importDefault(require("../config/database"));
const User_1 = __importDefault(require("../models/User"));
const Settings_1 = __importDefault(require("../models/Settings"));
const logger_1 = __importDefault(require("./logger"));
async function seedDatabase() {
    try {
        const db = database_1.default;
        const existingAdmin = await User_1.default.findByEmail('admin@admin.com');
        if (existingAdmin) {
            logger_1.default.info('Admin user already exists, skipping seed');
            return;
        }
        const userCount = await db.get('SELECT COUNT(*) as count FROM users');
        if (userCount && userCount.count > 0) {
            logger_1.default.info('Users already exist in database, skipping admin creation');
            return;
        }
        logger_1.default.info('Creating default admin user...');
        const saltRounds = 12;
        const passwordHash = await bcryptjs_1.default.hash('admin123', saltRounds);
        await db.run(`INSERT INTO users (username, email, password_hash, is_admin) 
       VALUES (?, ?, ?, ?)`, ['admin', 'admin@admin.com', passwordHash, 1]);
        logger_1.default.info('✅ Default admin user created successfully');
        logger_1.default.info('📧 Email: admin@admin.com');
        logger_1.default.info('🔑 Password: admin123');
        logger_1.default.info('⚠️  Please change the default password after first login!');
        await Settings_1.default.initializeDefaultSettings();
        logger_1.default.info('✅ Default settings initialized');
    }
    catch (error) {
        logger_1.default.error('Failed to seed database:', error);
        throw error;
    }
}
if (require.main === module) {
    seedDatabase()
        .then(() => {
        logger_1.default.info('Database seeding complete');
        process.exit(0);
    })
        .catch((error) => {
        logger_1.default.error('Database seeding failed:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=seedDb.js.map