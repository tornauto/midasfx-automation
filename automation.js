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

function launchBrowser() {
  return puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-zygote',
      '--single-process'
    ]
  });
}

async function registerAccount(email, demoButtonSelector) {
  // Fresh browser every time — no cookies, no saved sessions
  const browser = await launchBrowser();

  try {
    const page = await browser.newPage();
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
    await browser.close(); // close completely after each registration
  }
}

async function runAutomation(firstName, lastName) {
  const email1 = `${firstName}${lastName}@gmail.com`;
  const email2 = `${firstName}${lastName}D@gmail.com`; // D suffix for Demo2

  console.log(`[AUTO] Starting Demo1 for ${email1}`);
  const demo1 = await registerAccount(email1, SELECTORS.demo1Btn);
  console.log(`[AUTO] Demo1 done: login=${demo1.login} password=${demo1.password}`);

  // Wait between registrations
  await new Promise(r => setTimeout(r, 5000));

  console.log(`[AUTO] Starting Demo2 for ${email2}`);
  const demo2 = await registerAccount(email2, SELECTORS.demo2Btn);
  console.log(`[AUTO] Demo2 done: login=${demo2.login} password=${demo2.password}`);

  return { email: email1, demo1, demo2 };
}

module.exports = { runAutomation };
