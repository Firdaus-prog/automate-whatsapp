// index.ts
import { Client, LocalAuth, Message } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';

const client = new Client({
  authStrategy: new LocalAuth(),
});

client.on('qr', (qr: string) => {
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log('✅ Client is ready!');
});

client.on('message', (message: Message) => {
  console.log('📩 Message received:', message.body);

  if (message.body === '!hello') {
    message.reply('Hello from TypeScript!');
  }
});

// client.on('ready', async () => {
//     console.log('✅ Client is ready!');
  
//     const number = '601153371227'; // Mirza
//     const chatId = number + '@c.us';
  
//     await client.sendMessage(chatId, 'Hello from TypeScript + whatsapp-web.js!');
//   });

client.on('message', async (message) => {
    const chat = await message.getChat();
  
    if (chat.isGroup) {
      console.log('👥 Message is from a group:', chat.name);
    } else {
      console.log('🙋‍♂️ Message is from an individual:', message.from);
    }
  });
  

client.on('message', async (message) => {
    if (message.body === '!ping') {
      await message.reply('pong');
    }
    if (message.body === '!hi') {
      await client.sendMessage(message.from, 'Hello there! 👋');
    }
  });
  
  

client.initialize();
