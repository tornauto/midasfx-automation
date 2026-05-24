const puppeteer = require('puppeteer-core');

const CHROME_PATH = process.env.CHROME_PATH || '/usr/bin/chromium';

const SELECTORS = {
  email:        '#RegistrationForm_email',
  demo1Btn:     '#account-type > div.btn.btn__61.btn__block.btn__transparent.btn__up.registration__choose-active > span',
  demo2Btn:     '#account-type > div:nth-child(2) > span',
  checkbox:     '#registration-form > div.checkbox__container.success > label > span',
  submit:       '#form-submit',
  resultPara:   'body > section > section > div.text.text__18 > div:nth-child(4) > p'
};

function launchBrowser(useProxy = false) {
  const args = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--no-zygote',
    '--single-process'
  ];

  // If proxy credentials are set in Railway env vars, use them for Demo2
  if (useProxy && process.env.PROXY_SERVER) {
    args.push(`--proxy-server=${process.env.PROXY_SERVER}`);
  }

  return puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args
  });
}

async function registerAccount(email, demoButtonSelector, useProxy = false) {
  const browser = await launchBrowser(useProxy);

  try {
    const page = await browser.newPage();

    // Authenticate proxy if credentials provided
    if (useProxy && process.env.PROXY_USER && process.env.PROXY_PASS) {
      await page.authenticate({
        username: process.env.PROXY_USER,
        password: process.env.PROXY_PASS
      });
    }

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36');

    await page.goto('https://my.midasfx.com/registration', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(r => setTimeout(r, 2000));

    await page.waitForSelector(SELECTORS.email, { timeout: 20000 });
    await page.click(SELECTORS.email);
    await page.type(SELECTORS.email, email, { delay: 80 });

    await page.waitForSelector(demoButtonSelector, { timeout: 20000 });
    await page.click(demoButtonSelector);
    await new Promise(r => setTimeout(r, 2000));

    await page.waitForSelector(SELECTORS.checkbox, { timeout: 20000 });
    await page.click(SELECTORS.checkbox);
    await new Promise(r => setTimeout(r, 1000));

    await page.waitForSelector(SELECTORS.submit, { timeout: 20000 });
    await page.click(SELECTORS.submit);

    await page.waitForSelector(SELECTORS.resultPara, { timeout: 40000 });
    await new Promise(r => setTimeout(r, 2000));

    const fullText = await page.$eval(SELECTORS.resultPara, el => el.innerText.trim());
    console.log(`[AUTO] Raw confirmation text: ${fullText}`);

    const lines = fullText.split('\n').map(l => l.trim()).filter(Boolean);
    let login = 'NOT FOUND';
    let password = 'NOT FOUND';

    for (const line of lines) {
      if (line.toLowerCase().startsWith('number:')) {
        login = line.substring(line.indexOf(':') + 1).trim();
      }
      if (line.toLowerCase().startsWith('password:')) {
        password = line.substring(line.indexOf(':') + 1).trim();
      }
    }

    console.log(`[AUTO] Parsed login=${login} password=${password}`);
    return { login, password };

  } finally {
    await browser.close();
  }
}

async function runAutomation(firstName, lastName) {
  const email1 = `${firstName}${lastName}@gmail.com`;
  const email2 = `${firstName}${lastName}D@gmail.com`;

  console.log(`[AUTO] Starting Demo1 for ${email1}`);
  const demo1 = await registerAccount(email1, SELECTORS.demo1Btn, false);
  console.log(`[AUTO] Demo1 done: login=${demo1.login} password=${demo1.password}`);

  // Wait 15 seconds between registrations
  console.log(`[AUTO] Waiting 15s before Demo2...`);
  await new Promise(r => setTimeout(r, 15000));

  console.log(`[AUTO] Starting Demo2 for ${email2}`);
  const demo2 = await registerAccount(email2, SELECTORS.demo2Btn, true); // uses proxy if set
  console.log(`[AUTO] Demo2 done: login=${demo2.login} password=${demo2.password}`);

  return { email: email1, demo1, demo2 };
}

module.exports = { runAutomation };
