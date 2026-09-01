require('dotenv').config();
const fetch = require('node-fetch');

async function test() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = 6277592472;
  
  const text = 'Test link: <a href="http://localhost:3000/login?nis=240001">Klik di sini</a>';
  
  const res = await fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML',
    }),
  });
  
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}

test();
