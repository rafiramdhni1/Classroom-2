const fetch = require('node-fetch');

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

async function sendTelegramMessage(chatId, text, options = {}) {
  const body = {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    ...options,
  };

  const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  if (!data.ok) {
    throw new Error(data.description || 'Gagal mengirim pesan Telegram');
  }
  return data;
}

async function sendTelegramMessageWithButton(chatId, text, buttonText, buttonUrl) {
  const body = {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [{ text: buttonText, url: buttonUrl }],
      ],
    },
  };

  const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  if (!data.ok) {
    throw new Error(data.description || 'Gagal mengirim pesan Telegram');
  }
  return data;
}

async function setWebhook(url) {
  const response = await fetch(`${TELEGRAM_API}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  return response.json();
}

module.exports = { sendTelegramMessage, sendTelegramMessageWithButton, setWebhook };
