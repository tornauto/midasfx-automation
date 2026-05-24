const puppeteer = require('puppeteer');

const SELECTORS = {
  email: '#RegistrationForm_email',
  demo1Btn: '#account-type > div.btn.btn__61.btn__block.btn__transparent.btn__up.registration__choose-active > span',
  demo2Btn: '#account-type > div:nth-child(2) > span',
  checkbox: '#registration-form > div.checkbox__container.success > label > span',
  submit: '#form-submit',
  loginText: 'body > section > section > div.text.text__18 > div:nth-child(4) > p',
  passwordSpan: 'body > section > section > div.text.text__18 > div:nth-child(4) > p > span'
};

async function registerAccount(page, email, demoButtonSelector) {
  await page.goto('https://my.midasfx.com/registration', {
    waitUntil: 'networkidle2',
    timeout: 60000
  });

  await page.waitForSelector(SELECTORS.email, { timeout: 15000 });
  await page.click(SELECTORS.email);
  await page.type(SELECTORS.email, email, { delay: 80 });

  await page.waitForSelector(demoButtonSelector, { timeout: 15000 });
  await page.click(demoButtonSelector);
  await new Promise(r => setTimeout(r, 1500));

  await page.waitForSelector(SELECTORS.checkbox, { timeout: 15000 });
  await page.click(SELECTORS.checkbox);
  await new Promise(r => setTimeout(r, 800));

  await page.waitForSelector(SELECTORS.submit, { timeout: 15000 });
  await page.click(SELECTORS.submit);

  await page.waitForSelector(SELECTORS.loginText, { timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));

  const fullText = await page.$eval(SELECTORS.loginText, el => el.innerText.trim());
  const password = await page.$eval(SELECTORS.passwordSpan, el => el.innerText.trim());

  const loginMatch = fullText.match(/\d{5,7}/);
  const login = loginMatch ? loginMatch[0] : fullText.replace(password, '').trim();

  return { login, password };
}

async function runAutomation(firstName, lastName) {
  const email = `${firstName}${lastName}@gmail.com`;

  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu'
    ]
  });

  try {
    console.log(`[AUTO] Starting for ${email}`);

    const page1 = await browser.newPage();
    await page1.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36');
    const demo1 = await registerAccount(page1, email, SELECTORS.demo1Btn);
    await page1.close();
    console.log(`[AUTO] Demo1 done: login=${demo1.login}`);

    await new Promise(r => setTimeout(r, 3000));

    const page2 = await browser.newPage();
    await page2.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36');
    const demo2 = await registerAccount(page2, email, SELECTORS.demo2Btn);
    await page2.close();
    console.log(`[AUTO] Demo2 done: login=${demo2.login}`);

    return { email, demo1, demo2 };

  } finally {
    await browser.close();
  }
}

module.exports = { runAutomation };
