const express = require('express');
const cors = require('cors');
const db = require('./db');
const { runAutomation } = require('./automation');

const app = express();
app.use(express.json());
app.use(cors());

const SECRET = process.env.WEBHOOK_SECRET || 'change_this_secret';

app.get('/', (req, res) => res.send('MidasFX Automation Server Running ✅'));

app.post('/register', async (req, res) => {
  const { secret, firstName, lastName } = req.body;
  if (secret !== SECRET) return res.status(403).json({ error: 'Unauthorized' });
  if (!firstName || !lastName) return res.status(400).json({ error: 'Missing name' });

  res.json({ status: 'queued' });

  (async () => {
    try {
      const { login, password } = await runAutomation(firstName, lastName);
      const email = `${firstName}${lastName}@gmail.com`;
      await db.saveCredentials(email, login, password);
      console.log(`[DB] Saved for ${email}`);
    } catch (err) {
      console.error('[AUTO ERROR]', err.message);
    }
  })();
});

app.get('/credentials', async (req, res) => {
  const { secret, firstName, lastName } = req.query;
  if (secret !== SECRET) return res.status(403).json({ error: 'Unauthorized' });

  const email = `${firstName}${lastName}@gmail.com`;
  const creds = await db.getCredentials(email);
  if (!creds) return res.status(404).json({ error: 'Not ready yet' });

  res.json({ login: creds.login, password: creds.password });
});

const PORT = process.env.PORT || 3000;
db.init().then(() => app.listen(PORT, () => console.log(`Server live on port ${PORT}`)));
