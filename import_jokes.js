const { Pool } = require("pg");
const fs = require("fs").promises;
const path = require("path");

const DATABASE_URL = process.env.DATABASE_URL;
const JOKES_FILE = path.join(__dirname, "jokes.json");

const pool = new Pool({ connectionString: DATABASE_URL });

async function importJokes() {
  const data = await fs.readFile(JOKES_FILE, "utf8");
  const jokes = JSON.parse(data);

  for (const joke of jokes) {
    await pool.query(
      "INSERT INTO jokes (text, rating) VALUES ($1, $2) ON CONFLICT DO NOTHING",
      [joke.text, joke.rating || 0]
    );
  }
  console.log("Импорт завершён!");
  await pool.end();
}

importJokes().catch((err) => {
  console.error("Ошибка импорта:", err);
  process.exit(1);
});
