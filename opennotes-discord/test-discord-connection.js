import { Client, GatewayIntentBits } from 'discord.js';
import { config } from 'dotenv';

// Load environment variables
config();

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;

if (!DISCORD_TOKEN) {
  console.error('Error: DISCORD_TOKEN is not set in environment variables');
  process.exit(1);
}

console.log('Starting Discord connection test...');
console.log('Token length:', DISCORD_TOKEN.length);
console.log('Token prefix:', DISCORD_TOKEN.substring(0, 10) + '...');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
  ],
});

let startTime = Date.now();

client.once('ready', () => {
  const connectionTime = Date.now() - startTime;
  console.log('✅ SUCCESS: Bot connected to Discord!');
  console.log(`Connection time: ${connectionTime}ms`);
  console.log('Bot username:', client.user.username);
  console.log('Bot ID:', client.user.id);
  console.log('Connected to', client.guilds.cache.size, 'servers');

  // Test connection stability for 60 seconds
  console.log('\nTesting connection stability for 60 seconds...');
  let stabilityCheckCount = 0;

  const stabilityInterval = setInterval(() => {
    stabilityCheckCount++;
    const ping = client.ws.ping;
    console.log(`[${stabilityCheckCount * 10}s] Connection stable - Ping: ${ping}ms`);

    if (stabilityCheckCount >= 6) { // 60 seconds
      clearInterval(stabilityInterval);
      console.log('\n✅ Connection remained stable for 60 seconds');
      console.log('\nTesting graceful shutdown...');

      client.destroy();
      console.log('✅ Graceful shutdown successful');
      process.exit(0);
    }
  }, 10000); // Check every 10 seconds
});

client.on('error', (error) => {
  console.error('❌ Discord client error:', error);
});

client.on('disconnect', () => {
  console.log('⚠️ Bot disconnected from Discord');
});

// Attempt to login
console.log('Attempting to connect to Discord...');
client.login(DISCORD_TOKEN).catch((error) => {
  console.error('❌ FAILED: Could not connect to Discord');
  console.error('Error details:', error.message);

  if (error.code === 'TokenInvalid') {
    console.error('The provided token is invalid. Please check your DISCORD_TOKEN in .env');
  } else if (error.code === 'DisallowedIntents') {
    console.error('The bot lacks required intents. Please enable them in Discord Developer Portal');
  }

  process.exit(1);
});