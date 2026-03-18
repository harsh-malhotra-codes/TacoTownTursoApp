import { text, sqliteTable } from 'drizzle-orm/sqlite-core';

export const pushTokens = sqliteTable('push_tokens', {
  // Using the token itself as the primary key ensures uniqueness and simplifies conflict handling.
  token: text('token').primaryKey().notNull(),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP').notNull(),
});