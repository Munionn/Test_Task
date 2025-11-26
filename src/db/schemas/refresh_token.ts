import { mysqlTable, int, varchar, timestamp } from 'drizzle-orm/mysql-core';
import { users } from './users';

export const refresh_tokens = mysqlTable('refresh_tokens', {
  id: int('id').primaryKey().autoincrement(),
  token: varchar('token', { length: 255 }).notNull().unique(),
  userId: int('user_id').notNull().references(() => users.id),
  deviceId: varchar('device_id', { length: 255 }).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export type RefreshToken = typeof refresh_tokens.$inferSelect;
export type NewRefreshToken = typeof refresh_tokens.$inferInsert;