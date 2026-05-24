const express = require('express');
const cors = require('cors');
const { execSync } = require('child_process');
const db = require('./db');
const { runAutomation } = require('./automation');

const app = express();
app.use(express.json());
app.use(cors());

const SECRET = process.env.WEBHOOK_SECRET || 'change_this_secret';

// Health check
app.get('/', (req, res) => res.send('MidasFX Automation Server Running ✅'));

// Debug — shows where Chrome is installed
app.get('/debug', (req, res) => {
  try {
    const which = execSync('which chromium || which chromium-browser || which google-chrome || echo "not found"').toString().trim();
    const ls = execSync('ls /usr/bin/chrom* 2>/dev/null || echo "none in /usr/bin"').toString().trim();
    res.json({ which, ls });
  } catch (e) {
    res.json({ error: e.message });
  }
});

// Wix calls this when a user registers
app.post('/register', async (req, res) => {
  const { secret, firstName, lastName } = req.body;

  if (secret !== SECRET) return res.status(403).json({ error: 'Unauthorized' });
  if (!firstName || !lastName) return res.status(400).json({ error: 'Missing name' });

  res.json({ status: 'queued', message: 'Automation started in background' });

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

  if (secret !== SECRET) return res.status(403).json({ error: 'Unauthorized' });

  const email = `${firstName}${lastName}@gmail.com`;
  const creds = await db.getCredentials(email);

  if (!creds) return res.status(404).json({ error: 'Not ready yet.' });

  res.json({
    demo1: { login: creds.demo1_login, password: creds.demo1_password },
    demo2: { login: creds.demo2_login, password: creds.demo2_password }
  });
});

const PORT = process.env.PORT || 3000;
db.init().then(() => {
  app.listen(PORT, () => console.log(`Server live on port ${PORT}`));
});
