import fs from 'fs';
import path from 'path';
import Database from '../config/database';

export async function initializeDatabase(): Promise<void> {
  try {
    const db = Database;
    
    const schemaPath = path.join(__dirname, '../models/schemas/database.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    console.log('Initializing database...');
    
    for (const statement of statements) {
      try {
        await db.run(statement);
      } catch (error: any) {
        if (!error.message.includes('already exists') && !error.message.includes('duplicate column name')) {
          console.error('Error executing statement:', statement);
          throw error;
        }
      }
    }
    
    console.log('Database initialized successfully');
  } catch (error) {
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