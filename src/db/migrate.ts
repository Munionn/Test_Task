import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schemas';
import dotenv from 'dotenv';
import { migrate } from 'drizzle-orm/mysql2/migrator';

dotenv.config();

async function runMigrations() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'testuser',
    password: process.env.DB_PASSWORD || 'testpassword',
    database: process.env.DB_NAME || 'testdb',
  });

  const db = drizzle(connection, { schema, mode: 'default' });

  console.log('Running migrations...');
  await migrate(db, { migrationsFolder: './drizzle' });
  console.log('Migrations completed!');
  
  await connection.end();
}

runMigrations().catch(console.error);

