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

async function registerAccount(browser, email, demoButtonSelector) {
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36');

  try {
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

    // Get the full text — looks like:
    // "Account type: MT4.ECN. DemoNumber: 1035433Password: p$2FZ5N?)8,gK9&Currency: USD"
    const fullText = await page.$eval(SELECTORS.resultPara, el => el.innerText.trim());
    console.log(`[AUTO] Raw confirmation text: ${fullText}`);

    // Extract login (DemoNumber)
    const loginMatch = fullText.match(/DemoNumber[:\s]+(\d+)/i);
    const login = loginMatch ? loginMatch[1] : 'NOT FOUND';

    // Extract password (between "Password:" and "Currency:")
    const passwordMatch = fullText.match(/Password[:\s]+(.+?)(?:Currency|$)/i);
    const password = passwordMatch ? passwordMatch[1].trim() : 'NOT FOUND';

    console.log(`[AUTO] Parsed login=${login} password=${password}`);
    return { login, password };

  } finally {
    await page.close();
  }
}

async function runAutomation(firstName, lastName) {
  const email = `${firstName}${lastName}@gmail.com`;

  console.log(`[CHROME] Using path: ${CHROME_PATH}`);

  const browser = await puppeteer.launch({
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

  try {
    console.log(`[AUTO] Starting for ${email}`);

    const demo1 = await registerAccount(browser, email, SELECTORS.demo1Btn);
    console.log(`[AUTO] Demo1 done: login=${demo1.login} password=${demo1.password}`);

    await new Promise(r => setTimeout(r, 5000));

    const demo2 = await registerAccount(browser, email, SELECTORS.demo2Btn);
    console.log(`[AUTO] Demo2 done: login=${demo2.login} password=${demo2.password}`);

    return { email, demo1, demo2 };

  } finally {
    await browser.close();
  }
}

module.exports = { runAutomation };
