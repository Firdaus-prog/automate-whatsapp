import { Client, LocalAuth, Message } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';

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

  // Command responses
  if (message.body === '!hello') {
    if (isOwnMessage) {
      setTimeout(() => {
        client.sendMessage(message.from, `👋 Hello! (from yourself)`).catch(() => {});
      }, 500);
    } else {
      await message.reply('👋 Hello!');
    }
  } else if (message.body === '!ping') {
    await client.sendMessage(message.from, 'pong');
  } else if (message.body === '!hi') {
    await client.sendMessage(message.from, 'Hello there! 👋');
  }
}

// Handle all messages (sent or received)
client.on('message_create', (message) => {
  handleMessage(message, message.fromMe);
});

client.initialize();
