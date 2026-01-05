const express = require('express');
const fs = require('fs');
const path = require('path');
const pino = require('pino');
const { makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const multer = require('multer');
const qrcode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const { setIntervalAsync } = require('set-interval-async/fixed');

const app = express();
const port = 5000;

const sessions = {};
const messageQueue = {}; // Store messages for the target number to send continuously
const users = { 'WALEED XD  ': 'WALEED XD' }; // Static Username and Password

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Modern CSS Styles as a constant to keep code clean
const sharedStyles = `
<style>
  :root {
    --primary-color: #00ff88;
    --bg-dark: #0f172a;
    --card-bg: rgba(30, 41, 59, 0.7);
    --text-light: #f8fafc;
  }
  body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    background: linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.7)), url('https://i.postimg.cc/PJkx5SXr/IMG-20250403-222414.jpg');
    background-size: cover;
    background-attachment: fixed;
    background-position: center;
    color: var(--text-light);
    margin: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    min-height: 100vh;
  }
  .glass-card {
    background: var(--card-bg);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    padding: 2rem;
    border-radius: 20px;
    box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.8);
    width: 90%;
    max-width: 450px;
    margin: 20px auto;
  }
  h1, h2, h3 {
    text-align: center;
    text-transform: uppercase;
    letter-spacing: 2px;
    color: var(--primary-color);
    text-shadow: 0 0 10px rgba(0, 255, 136, 0.5);
  }
  input, select, textarea {
    width: 100%;
    padding: 12px;
    margin: 10px 0;
    border-radius: 8px;
    border: 1px solid #334155;
    background: rgba(15, 23, 42, 0.8);
    color: white;
    box-sizing: border-box;
  }
  input:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 5px var(--primary-color);
  }
  button {
    width: 100%;
    padding: 14px;
    background: linear-gradient(45deg, #00ff88, #00bd65);
    border: none;
    border-radius: 8px;
    color: #000;
    font-weight: bold;
    font-size: 1rem;
    cursor: pointer;
    transition: 0.3s;
    text-transform: uppercase;
    margin-top: 10px;
  }
  button:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(0, 255, 136, 0.4);
  }
  #qrCodeBox {
    text-align: center;
    padding: 20px;
    background: white;
    border-radius: 15px;
    margin: 20px 0;
  }
  #qrCodeBox img { width: 100%; max-width: 250px; }
  .footer-links {
    display: flex;
    justify-content: space-around;
    margin-top: 20px;
    width: 100%;
  }
  .footer-links a {
    color: var(--primary-color);
    text-decoration: none;
    font-weight: bold;
    font-size: 0.9rem;
  }
  .badge {
    background: rgba(0, 255, 136, 0.1);
    border: 1px solid var(--primary-color);
    padding: 10px;
    border-radius: 10px;
    text-align: center;
    margin-top: 20px;
  }
</style>
`;

// Login page
app.get('/login', (req, res) => {
  res.send(`
    <html>
      <head>${sharedStyles}</head>
      <body>
        <div class="glass-card">
          <h2>Login</h2>
          <form action="/login" method="POST">
            <label>Username:</label>
            <input type="text" name="username" placeholder="Enter Username" required />
            <label>Password:</label>
            <input type="password" name="password" placeholder="Enter Password" required />
            <button type="submit">Access Server</button>
          </form>
          <div class="badge">
            <h3>WP OFFLINE WALEED XD</h3>
            <p>MODERN WHATSAPP EXPLOIT</p>
          </div>
        </div>
      </body>
    </html>
  `);
});

// Handle login
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (users[username] === password) {
    const sessionId = uuidv4();
    res.redirect(`/session/${sessionId}`);
  } else {
    res.status(401).send('Invalid username or password');
  }
});

// Main Page
app.get('/', (req, res) => {
  res.redirect('/login');
});

// Session Setup
app.get('/session/:sessionId', async (req, res) => {
  const sessionId = req.params.sessionId;

  if (!sessions[sessionId]) {
    sessions[sessionId] = { isConnected: false, qrCode: null, groups: [] };
    setupSession(sessionId);
  }

  const session = sessions[sessionId];
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>WP OFFLINE WALEED XD</title>
      ${sharedStyles}
    </head>
    <body>
      <h1>WP OFFLINE WALEED XD</h1>
      
      <div class="glass-card">
      ${session.isConnected ? `
        <form action="/send-message/${sessionId}" method="POST" enctype="multipart/form-data">
            <label>Hater's Name:</label>
            <input type="text" name="hater" placeholder="Enter name" required />

            <label>Target Groups:</label>
            <select name="target" multiple style="height: 100px;">
              ${session.groups.map(group => `<option value="${group.id}">${group.name}</option>`).join('')}
            </select>

            <label>Target Number:</label>
            <input type="text" name="phoneNumber" placeholder="e.g. 92300xxxxxxx" />

            <label>Delay (Seconds):</label>
            <input type="number" name="delay" value="30" min="1" required />

            <label>Message File (.txt):</label>
            <input type="file" name="messageFile" accept=".txt" required />

            <button type="submit">Start Non-Stop Attack</button>
        </form>
      ` : `
        <h2 style="font-size: 1.2rem;">Scan QR to Connect</h2>
        <div id="qrCodeBox">
          ${session.qrCode ? `<img src="${session.qrCode}" alt="Scan QR Code"/>` : '<p style="color:black">Generating QR...</p>'}
        </div>
        <script>
          setInterval(() => {
            fetch('/session/${sessionId}/qr').then(res => res.json()).then(data => {
              if (data.qrCode) {
                document.getElementById('qrCodeBox').innerHTML = \`<img src="\${data.qrCode}" alt="Scan QR Code"/>\`;
              }
            });
          }, 5000);
        </script>
      `}
      </div>

      <div class="glass-card" style="margin-top: 0;">
        <div class="badge">
          <p>STATUS: RUNNING ON WALEED XD SERVER</p>
          <p>© 2025 ALL RIGHTS RECEIVED</p>
        </div>
        <div class="footer-links">
          <a href="https://facebook.com">FACEBOOK</a>
          <a href="https://wa.me/+917849981737">WHATSAPP</a>
        </div>
      </div>
    </body>
    </html>
  `);
});

// Fetch QR Code
app.get('/session/:sessionId/qr', (req, res) => {
  const sessionId = req.params.sessionId;
  const session = sessions[sessionId];
  res.json({ qrCode: session.qrCode });
});

// Fetch Group Names
const fetchGroups = async (socket, sessionId) => {
  const groups = [];
  const chats = await socket.groupFetchAllParticipating();
  for (const groupId in chats) {
    groups.push({ id: groupId, name: chats[groupId].subject });
  }
  sessions[sessionId].groups = groups;
};

// Send Messages
app.post('/send-message/:sessionId', upload.single('messageFile'), async (req, res) => {
  const sessionId = req.params.sessionId;
  const { hater, target, phoneNumber, delay } = req.body;
  const messageFile = req.file.buffer.toString('utf-8');
  const messages = messageFile.split('\n').filter(msg => msg.trim() !== '');

  if (sessions[sessionId]?.socket) {
    const socket = sessions[sessionId].socket;

    try {
      const targetGroups = Array.isArray(target) ? target : (target ? target.split(',') : []);

      messageQueue[sessionId] = messageQueue[sessionId] || { messages: [], phoneNumber: phoneNumber, targetGroups: targetGroups, index: 0 };
      messageQueue[sessionId].messages = messageQueue[sessionId].messages.concat(messages);

      const sendMessageToTarget = async () => {
        const message = `${hater} ${messageQueue[sessionId].messages[messageQueue[sessionId].index]}`;
        
        if (messageQueue[sessionId].targetGroups) {
          for (const groupId of messageQueue[sessionId].targetGroups) {
            await socket.sendMessage(groupId, { text: message });
          }
        }

        if (messageQueue[sessionId].phoneNumber) {
          const formattedNumber = messageQueue[sessionId].phoneNumber.replace(/\D/g, '') + '@s.whatsapp.net';
          await socket.sendMessage(formattedNumber, { text: message });
        }

        messageQueue[sessionId].index++;
        if (messageQueue[sessionId].index >= messageQueue[sessionId].messages.length) {
          messageQueue[sessionId].index = 0; 
        }
      };

      setIntervalAsync(sendMessageToTarget, (delay || 30) * 1000); 

      res.send('<h1>Attack Started!</h1><p>WALEED XD Server is sending messages now.</p><a href="/">Go Back</a>');
    } catch (err) {
      console.error(err);
      res.status(500).send('Failed to send messages.');
    }
  } else {
    res.status(400).send('WhatsApp session not connected.');
  }
});

// Setup WhatsApp Session
const setupSession = async (sessionId) => {
  const authDir = `./auth_info/${sessionId}`;
  if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true });

  const { state, saveCreds } = await useMultiFileAuthState(authDir);

  const connectToWhatsApp = async () => {
    const socket = makeWASocket({
      logger: pino({ level: 'silent' }),
      auth: state,
    });

    socket.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (connection === 'open') {
        sessions[sessionId].isConnected = true;
        await fetchGroups(socket, sessionId);
        sendApprovalMessage(socket);
      } else if (connection === 'close' && lastDisconnect?.error) {
        const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
        if (shouldReconnect) await connectToWhatsApp();
      }

      if (qr) {
        sessions[sessionId].qrCode = await qrcode.toDataURL(qr);
      }
    });

    socket.ev.on('creds.update', saveCreds);
    sessions[sessionId].socket = socket;
  };

  await connectToWhatsApp();
};

// Send Approval Message
const sendApprovalMessage = (socket) => {
  const approvalMessage = `😀💔 HELLO WALEED XD AM USING YOUR OFFLINE WHATSAPP SERVER THANKS YOU [❤️=]`;
  const phoneNumber = '+923075852134@s.whatsapp.net';
  socket.sendMessage(phoneNumber, { text: approvalMessage });
};

// Start Server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
