import { mysqlTable, int, varchar, timestamp } from 'drizzle-orm/mysql-core';
import { users } from './users';

export const files = mysqlTable('files', {
  id: int('id').primaryKey().autoincrement(),
  name: varchar('name', { length: 255 }).notNull(),
  extension: varchar('extension', { length: 10 }).notNull(),
  mimeType: varchar('mime_type', { length: 255 }).notNull(),
  size: int('size').notNull(),
  path: varchar('path', { length: 255 }).notNull(),
  uploadDate: timestamp('upload_date').defaultNow(),
  userId: int('user_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export type File = typeof files.$inferSelect;
export type NewFile = typeof files.$inferInsert;
