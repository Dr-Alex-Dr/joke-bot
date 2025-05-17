const TelegramBot = require("node-telegram-bot-api");
const { Pool } = require("pg");

const TOKEN = process.env.TELEGRAM_TOKEN;
const DATABASE_URL = process.env.DATABASE_URL;

const bot = new TelegramBot(TOKEN, { polling: true });
console.log("start");
const pool = new Pool({ connectionString: DATABASE_URL });

const lastJokeIndexByChat = new Map();

const insults = [
  "Ну ты и шутник, конечно...",
  "С таким чувством юмора только в цирк идти.",
  "Вот это да, оценка от эксперта по юмору!",
  "Тебе бы книжки читать, а не шутки оценивать.",
  "Смешнее твоей оценки только твой профиль.",
  "Ну ты и клоун!",
  "Спасибо, капитан Очевидность.",
  "С таким вкусом только анекдоты про колобка слушать.",
  "Твоя оценка как твой аватар — ни о чём.",
  "Может, тебе лучше молчать?",
];

// Получить случайную шутку
async function getRandomJoke() {
  const { rows } = await pool.query("SELECT * FROM jokes");
  if (rows.length === 0) return null;
  const idx = Math.floor(Math.random() * rows.length);
  return { joke: rows[idx], idx: rows[idx].id };
}

// Команда /joke
bot.onText(/\/joke/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    const result = await getRandomJoke();
    if (!result) {
      bot.sendMessage(chatId, "Шутки закончились!");
      return;
    }
    const { joke, idx } = result;
    lastJokeIndexByChat.set(chatId, idx);
    bot.sendMessage(chatId, `😂 ${joke.text}\n\nРейтинг: ${joke.rating}`);
  } catch (err) {
    bot.sendMessage(chatId, "Ошибка при получении шутки.");
  }
});

// Оценка шутки (good/bad)
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text && msg.text.trim().toLowerCase();

  if (text === "good" || text === "bad") {
    const jokeId = lastJokeIndexByChat.get(chatId);
    if (typeof jokeId !== "number") {
      bot.sendMessage(chatId, "Сначала попросите шутку командой /joke!");
      return;
    }
    try {
      const { rows } = await pool.query("SELECT * FROM jokes WHERE id = $1", [
        jokeId,
      ]);
      const joke = rows[0];
      if (!joke) {
        bot.sendMessage(chatId, "Ошибка: не удалось найти шутку.");
        return;
      }
      let newRating = joke.rating;
      if (text === "good") {
        newRating += 1;
      } else if (text === "bad") {
        newRating = Math.max(0, newRating - 1);
      }
      await pool.query("UPDATE jokes SET rating = $1 WHERE id = $2", [
        newRating,
        jokeId,
      ]);

      let userName = msg.from.username
        ? "@" + msg.from.username
        : msg.from.first_name || "Неизвестный";
      const insult = insults[Math.floor(Math.random() * insults.length)];
      const response = `Шутка: ${joke.text}
Рейтинг: ${newRating}
Оценил: ${userName}
${insult}`;
      bot.sendMessage(chatId, response);
    } catch (err) {
      bot.sendMessage(chatId, "Ошибка при оценке шутки.");
    }
  }
});

// Топ шуток
bot.onText(/\/top/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    const { rows } = await pool.query(
      "SELECT * FROM jokes ORDER BY rating DESC LIMIT 5"
    );
    if (rows.length === 0) {
      bot.sendMessage(chatId, "Шуток нет!");
      return;
    }
    let text = "🏆 Топ шуток:\n\n";
    rows.forEach((j, i) => {
      text += `${i + 1}. ${j.text}\nРейтинг: ${j.rating}\n\n`;
    });
    bot.sendMessage(chatId, text);
  } catch (err) {
    bot.sendMessage(chatId, "Ошибка при получении топа.");
  }
});
