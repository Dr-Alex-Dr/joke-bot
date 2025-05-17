module.exports = {
  migrationsTable: "pgmigrations",
  dir: "migrations",
  direction: "up",
  databaseUrl: process.env.DATABASE_URL,
};
