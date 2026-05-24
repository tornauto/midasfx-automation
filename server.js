const express = require('express');
const cors = require('cors');
const db = require('./db');
const { runAutomation } = require('./automation');

const app = express();
app.use(express.json());
app.use(cors());

const SECRET = process.env.WEBHOOK_SECRET || 'change_this_secret';

// Health check
app.get('/', (req, res) => res.send('MidasFX Automation Server Running ✅'));

// Wix calls this when a user registers
app.post('/register', async (req, res) => {
  const { secret, firstName, lastName } = req.body;

  if (secret !== SECRET) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  if (!firstName || !lastName) {
    return res.status(400).json({ error: 'Missing firstName or lastName' });
  }

  // Respond immediately so Wix does not time out
  res.json({ status: 'queued', message: 'Automation started in background' });

  // Run automation in background (non-blocking)
  (async () => {
    try {
      const { email, demo1, demo2 } = await runAutomation(firstName, lastName);
      await db.saveCredentials(email, demo1.login, demo1.password, demo2.login, demo2.password);
      console.log(`[DB] Saved credentials for ${email}`);
    } catch (err) {
      console.error('[AUTO ERROR]', err.message);
    }
  })();
});

// Wix dashboard calls this to retrieve credentials
app.get('/credentials', async (req, res) => {
  const { secret, firstName, lastName } = req.query;

  if (secret !== SECRET) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const email = `${firstName}${lastName}@gmail.com`;
  const creds = await db.getCredentials(email);

  if (!creds) {
    return res.status(404).json({ error: 'Not ready yet. Automation may still be running.' });
  }

  res.json({
    demo1: { login: creds.demo1_login, password: creds.demo1_password },
    demo2: { login: creds.demo2_login, password: creds.demo2_password }
  });
});

const PORT = process.env.PORT || 3000;
db.init().then(() => {
  app.listen(PORT, () => console.log(`Server live on port ${PORT}`));
});
