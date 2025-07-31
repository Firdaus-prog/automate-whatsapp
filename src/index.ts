import { Client, LocalAuth, Message } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import { safeJsonBedrockQuery } from './bedrock'; // Update path accordingly

export interface aiResponse {
	response: string;
}

const client = new Client({
  authStrategy: new LocalAuth(),
});

let meId: string | null = null;

// Show QR code for login
client.on('qr', (qr) => {
  qrcode.generate(qr, { small: true });
});

// When client is ready
client.on('ready', () => {
  meId = client.info.wid._serialized;
  console.log('✅ Client is ready!');
  console.log('👤 Logged in as:', meId);
});

// Unified message handler
async function handleMessage(message: Message, isOwnMessage: boolean) {
  const chat = await message.getChat();
  const timestamp = new Date().toLocaleTimeString();

  let header = '';
  if (isOwnMessage && chat.id._serialized === meId) {
    header = `\n--- 🔵 Message to Yourself ---`;
  } else if (chat.isGroup) {
    header = `\n--- 🟢 Group Message: ${chat.name} ---`;
  } else if (isOwnMessage) {
    header = `\n--- 🔷 Message Sent by You to ${chat.name || chat.id.user} ---`;
  } else {
    header = `\n--- 🟣 Direct Message from ${message.from} ---`;
  }

  console.log(`${header}\n🕒 ${timestamp}\n📩 Message: ${message.body}`);

  const lower = message.body.toLowerCase();

  // Commands
  if (lower === '!hello') {
    if (isOwnMessage) {
      setTimeout(() => {
        client.sendMessage(message.from, `👋 Hello! (from yourself)`).catch(() => {});
      }, 500);
    } else {
      await message.reply('👋 Hello!');
    }
  } else if (lower === '!ping') {
    await client.sendMessage(message.from, 'pong');
  } else if (lower === '!hi') {
    await client.sendMessage(message.from, 'Hello there! 👋');
  } else if (lower.startsWith('!askai')) {
    const question = message.body.slice(6).trim();

    if (!question) {
      await message.reply('🤖 Please provide a question. Usage: `!askAi <your question>`');
      return;
    }

    const prompt = `
You are a fun and friendly AI bot created by Murp 🤖🎉  
You know all sorts of things about Murp — their interests, habits, projects, and fun facts!

Answer the following question in a cheerful and engaging way. Add relevant emojis to make it more lively and expressive 😄✨

Question: ${question}

Return your answer strictly in this JSON format:

{
  "response": "<your fun and emoji-filled answer here>"
}
`;


    try {
      const aiResponse = await safeJsonBedrockQuery<aiResponse>(prompt);
      const reply = typeof aiResponse === 'string' ? aiResponse : JSON.stringify(aiResponse.response, null, 2);

      // Delay sending if message is from yourself
      if (isOwnMessage) {
        setTimeout(() => {
          client.sendMessage(message.from, `🤖 ${reply}`).catch(() => {});
        }, 500);
      } else {
        await message.reply('👋 Hello!');
      }
    } catch (err) {
      console.error('❌ AI query failed:', err);
      await client.sendMessage(message.from, '❌ Sorry, I could not get a response from AI.');
    }
  }
}

// Listen to all message creations
client.on('message_create', (message) => {
  handleMessage(message, message.fromMe);
});

client.initialize();
