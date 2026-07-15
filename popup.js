const CURRENCY_SYMBOLS = {
  USD: '$',
  EUR: '\u20ac',
  GBP: '\u00a3',
  TRY: '\u20ba',
  CHF: 'Fr',
  JPY: '\u00a5',
  SAR: '\ufdfc'
};

let lastFetched = null;
let debounceTimer = null;

const amountEl = document.getElementById('amount');
const fromEl = document.getElementById('from-currency');
const toEl = document.getElementById('to-currency');
const resultAmountEl = document.getElementById('result-amount');
const resultRateEl = document.getElementById('result-rate');
const updatedTimeEl = document.getElementById('updated-time');
const swapBtn = document.getElementById('swap-btn');
const googleLink = document.getElementById('google-link');

function formatNumber(value, currency) {
  if (currency === 'JPY') {
    return Math.round(value).toLocaleString('tr-TR');
  }

  if (value >= 1000) {
    return value.toLocaleString('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  return value.toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4
  });
}

async function fetchRate(from, to) {
  const query = `${from} to ${to} exchange rate`;

  try {
    const resp = await fetch(
      `https://www.google.com/search?q=${encodeURIComponent(query)}&hl=en`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36'
        }
      }
    );

    const html = await resp.text();

    const patterns = [
      /data-value="([\d.]+)"/,
      /class="BNeawe[^"]*"[^>]*>([\d.,]+)<\/div>/,
      /"([\d.]+)" [A-Z]{3}/,
      /converter-amount[^>]*value="([\d.]+)"/,
      /\b(\d+\.?\d{2,6})\s*(?:Turkish lira|TRY|EUR|USD|GBP)/i
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (!match) {
        continue;
      }

      const parsed = parseFloat(match[1].replace(',', '.'));
      if (parsed > 0 && parsed < 1e8) {
        return parsed;
      }
    }

    const allNumbers = [...html.matchAll(/(\d{1,6}[.,]\d{2,6})/g)];
    for (const match of allNumbers) {
      const parsed = parseFloat(match[1].replace(',', '.'));
      if (from === 'USD' && to === 'TRY' && parsed > 10 && parsed < 100) {
        return parsed;
      }
      if (from === 'EUR' && to === 'TRY' && parsed > 10 && parsed < 100) {
        return parsed;
      }
      if (from === 'TRY' && to === 'USD' && parsed > 0.01 && parsed < 0.5) {
        return parsed;
      }
    }

    return null;
  } catch (error) {
    return null;
  }
}

function showLoading() {
  resultAmountEl.innerHTML = '<span class="loading">Kur aliniyor...</span>';
  resultRateEl.textContent = '';
  updatedTimeEl.textContent = '';
}

function showError() {
  resultAmountEl.innerHTML = '<span class="error">Kur alinamadi</span>';
  resultRateEl.textContent = "Google'da aramayi deneyin";
  updatedTimeEl.textContent = '';
}

function showResult(amount, rate, from, to) {
  const total = amount * rate;
  const symbol = CURRENCY_SYMBOLS[to] || '';
  resultAmountEl.textContent = `${symbol} ${formatNumber(total, to)}`;
  resultRateEl.textContent = `1 ${from} = ${formatNumber(rate, to)} ${to}`;

  if (lastFetched) {
    updatedTimeEl.textContent = `Guncellendi: ${lastFetched.toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit'
    })}`;
  }
}

function updateGoogleLink(from, to, amount) {
  const query = `${amount} ${from} kac ${to}`;
  googleLink.onclick = () => {
    chrome.tabs.create({
      url: `https://www.google.com/search?q=${encodeURIComponent(query)}`
    });
  };
}

async function convert() {
  const from = fromEl.value;
  const to = toEl.value;
  const amount = parseFloat(amountEl.value) || 0;

  updateGoogleLink(from, to, amount);

  if (from === to) {
    lastFetched = new Date();
    showResult(amount, 1, from, to);
    return;
  }

  showLoading();

  const rate = await fetchRate(from, to);
  if (!rate) {
    showError();
    return;
  }

  lastFetched = new Date();
  showResult(amount, rate, from, to);
}

function triggerConvert() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(convert, 350);
}

amountEl.addEventListener('input', triggerConvert);
fromEl.addEventListener('change', convert);
toEl.addEventListener('change', convert);

swapBtn.addEventListener('click', () => {
  const previousFrom = fromEl.value;
  fromEl.value = toEl.value;
  toEl.value = previousFrom;
  convert();
});

window.addEventListener('load', () => {
  amountEl.focus();
  amountEl.select();
});

convert();
