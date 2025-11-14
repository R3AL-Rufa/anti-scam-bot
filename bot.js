// bot.js - FULL ANTI-SCAM BOT (NO TIMEOUT)
require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField, MessageFlagsBitField } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// === CONFIG ===
const LOG_CHANNEL_ID = '1024684293697585173'; // #url-logs-grok

// === SAFE ROLE IDs ===
const SAFE_ROLE_IDS = [
  '1024184101340717157', // Admin Rufa
  '1024303409995710494', // Moderator
];

// === Normalize text ===
function normalize(text) {
  return text
    .toLowerCase()
    .replace(/[\u200B-\u200D\uFEFF\s`_*~>[\](){}❤️✨⚡\n\r]/g, '')
    .replace(/1/g, 'i').replace(/!/g, 'i').replace(/3/g, 'e').replace(/4/g, 'a')
    .replace(/5/g, 's').replace(/7/g, 't').replace(/0/g, 'o').replace(/@/g, 'a')
    .replace(/ı/g, 'i').replace(/ł/g, 'l').replace(/ε/g, 'e').replace(/ο/g, 'o')
    .replace(/σ/g, 'o').replace(/а/g, 'a').replace(/е/g, 'e').replace(/о/g, 'o')
    .replace(/с/g, 'c').replace(/г/g, 'r')
    .replace(/\\+/g, '/')
    .replace(/hxxp/g, 'http')
    .replace(/https?:\/\/\/+/g, 'http://')
    .replace(/d[i1!l]+s[c]+[o0]+r[d]+/g, 'discord')
    .replace(/g+[\/\\]*g+/g, 'gg')
    .replace(/[@#\/\\]+/g, '')
    .replace(/\[.*?\]/g, '')
    .replace(/\./g, '.')
    .replace(/discord\.\s*gg/g, 'discordgg')
    .replace(/nitro\s*free/g, 'nitrofree');
}

// === FULL DECODE ===
function decodeFully(text) {
  let result = text.replace(/[\s\u200B-\u200D\uFEFF`_*~>[\](){}❤️✨⚡\n\r]/g, '');
  let decoded;
  try {
    decoded = decodeURIComponent(result);
    if (/%[0-9A-F]{2}/i.test(decoded)) {
      decoded = decodeURIComponent(decoded);
    }
  } catch {
    decoded = result;
  }
  return result + decoded;
}

// === Find URLs ===
function extractURLs(text) {
  const urlRegex = /(https?:\/\/|www\.|discord\.(gg|com|app|new)|disocrd\.|dlscord\.|discrod\.|dicsord\.|discorcl\.|discordapp\.|discord\.gift)[^\s<>"']*/gi;
  return (text.match(urlRegex) || []).map(u => u.replace(/[^a-z0-9.:\/%\-_]/gi, ''));
}

// === Scam domains & keywords ===
const SCAM_DOMAINS = [
  'discord.gg', 'discord.gift', 'discordapp.com', 'discord.co', 'discord.me',
  'discordapp.net', 'discord-nitro.com', 'steam-nitro.com',
  'discrod.', 'dlscord.', 'dicsord.', 'discorcl.', 'discrod.', 'discоrd.',
  'disc0rd.', 'di5cord.', 'd1scord.', 'discrod.', 'discrod.co',
  '@discord.gg', '///#@discord.gg', 'hxxp://discord.gg', 'http://@discord.gg',
  'discord[.]gg', 'discord. gg', 'discord .gg', 'discord..gg'
];

const SCAM_KEYWORDS = [
  'ticket', 'support', 'help', 'admin', 'verify', 'claim', 'free', 'nitro', 'gift', 'steam', 'forward', 'submit', 'issue', 'bug', 'sms', 'mailto', 'tlck£ts', 't!cket', 'tickɛt', 'tlcket'
];

// === Check if scam ===
async function isScam(content) {
  const raw = content;
  const fullText = decodeFully(raw);
  const clean = normalize(fullText);
  const urls = extractURLs(fullText);

  if (urls.some(url => SCAM_DOMAINS.some(d => url.includes(d)))) {
    return { scam: true, reason: 'Scam domain in URL', urls };
  }

  if (/%64%69%73%63%6F%72%64.*%67%67/i.test(raw) || 
      /%64.*%69.*%73.*%63.*%6F.*%72.*%64.*%67.*%67/i.test(raw)) {
    return { scam: true, reason: 'Encoded discord.gg', urls };
  }

  if (clean.includes('discord.gg/') || clean.includes('discord.gift')) {
    return { scam: true, reason: 'Decoded scam link', urls };
  }

  const hasKeyword = SCAM_KEYWORDS.some(k => clean.includes(k));
  const hasLink = urls.length > 0;
  if (hasKeyword && hasLink) {
    return { scam: true, reason: 'Suspicious keyword + link', urls };
  }

  if (/(open|create|submit|click).{0,15}(ticket|support|here)/i.test(clean)) {
    return { scam: true, reason: 'Fake support flow', urls };
  }

  return { scam: false };
}

// === MESSAGE HANDLER ===
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // === DELETE ALL FORWARDED MESSAGES ===
  const isCrossposted = message.flags.has(MessageFlagsBitField.Flags.Crossposted);
  const isReplyOrThread = message.reference?.messageId;

  if (isCrossposted || isReplyOrThread) {
    try {
      await message.delete();
      console.log(`Deleted forwarded message from ${message.author.tag}`);

      const logChannel = message.guild.channels.cache.get(LOG_CHANNEL_ID);
      if (logChannel && logChannel.permissionsFor(client.user)?.has('SendMessages')) {
        logChannel.send({
          embeds: [new EmbedBuilder()
            .setTitle('FORWARDED MESSAGE DELETED')
            .setColor(0x00ff00)
            .addFields(
              { name: 'User', value: `${message.author}`, inline: true },
              { name: 'Channel', value: `${message.channel}`, inline: true },
              { name: 'Content', value: '```' + message.content.substring(0, 900) + '```' }
            )
            .setTimestamp()
          ]
        }).catch(() => {});
      }
    } catch (err) {
      console.log('Failed to delete forwarded message:', err.message);
    }
    return;
  }

  // === GET ORIGINAL MESSAGE ===
  let originalMessage = null;
  if (message.reference?.messageId) {
    try {
      originalMessage = await message.channel.messages.fetch(message.reference.messageId);
    } catch (err) {
      // Ignore
    }
  }

  const currentContent = message.content;
  const originalContent = originalMessage?.content || '';
  const contentToCheck = currentContent + originalContent;

  // === SKIP SAFE USERS ===
  if (message.member?.permissions.has(PermissionsBitField.Flags.Administrator)) return;
  if (message.member?.permissions.has(PermissionsBitField.Flags.ModerateMembers)) return;
  if (message.member?.permissions.has(PermissionsBitField.Flags.ManageMessages)) return;
  if (message.member?.roles.cache.some(r => SAFE_ROLE_IDS.includes(r.id))) return;

  const result = await isScam(contentToCheck);
  if (!result.scam) return;

  try {
    // === DELETE CURRENT MESSAGE ===
    if (message.deletable) {
      await message.delete();
    }

    // === DELETE ORIGINAL MESSAGE ===
    if (originalMessage && originalMessage.deletable) {
      const originalCheck = await isScam(originalMessage.content);
      if (originalCheck.scam) {
        await originalMessage.delete();
      }
    }

    // === LOGGING ===
    const logChannel = message.guild.channels.cache.get(LOG_CHANNEL_ID);
    if (logChannel) {
      const botPerms = logChannel.permissionsFor(client.user);
      if (botPerms?.has(['SendMessages', 'EmbedLinks'])) {
        const embed = new EmbedBuilder()
          .setTitle('SCAM DELETED')
          .setColor(0xff0000)
          .addFields(
            { name: 'User', value: `${message.author}`, inline: true },
            { name: 'Channel', value: `${message.channel}`, inline: true },
            { name: 'Reason', value: result.reason, inline: false },
            { name: 'Current Content', value: '```' + currentContent.substring(0, 400) + '```', inline: false },
            { name: 'Original Content', value: originalContent ? '```' + originalContent.substring(0, 400) + '```' : 'None', inline: false },
            { name: 'Forwarded?', value: originalMessage ? 'Yes' : 'No', inline: true }
          )
          .setTimestamp();

        logChannel.send({ embeds: [embed] }).catch(() => {});
      }
    }

  } catch (err) {
    console.log('Action failed:', err.message);
  }
});

client.once('clientReady', () => {
  console.log(`Bot is ONLINE as ${client.user.tag}`);
  client.user.setActivity('Deleting scams', { type: 'WATCHING' });
});

client.login(process.env.DISCORD_TOKEN);
// THIS ALLOWS ME TO DEPLOY ON RENDER AS WEBSITE
const http = require('http');
http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Bot is alive!');
}).listen(process.env.PORT || 3000);

console.log('HTTP server running for Render');