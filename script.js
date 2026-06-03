const FUNCTION_URL = 'https://functions.yandexcloud.net/d4e8tpcuk4s6db55jcpu?url=';

const checkBtn = document.getElementById('checkBtn');
const urlInput = document.getElementById('urlInput');
const resultDiv = document.getElementById('resultArea');
const highlightYcpBtn = document.getElementById('highlightYcpBtn');
const highlightEridBtn = document.getElementById('highlightEridBtn');
const screenshotBtn = document.getElementById('screenshotBtn');
const uaBtns = document.querySelectorAll('.ua-btn');

let highlightYcp = false;
let highlightErid = false;
let lastData = null;
let lastYcpValue = null;
let lastEridValue = null;
let currentUa = 'desktop';

const savedUa = localStorage.getItem('redirect_ua');
if (savedUa && ['desktop', 'mobile', 'android'].includes(savedUa)) {
    currentUa = savedUa;
}
// Не вызываем updateUaButtons() при загрузке – кнопки не будут активными

function updateUaButtons() {
    uaBtns.forEach(btn => {
        const ua = btn.getAttribute('data-ua');
        if (ua === currentUa) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

uaBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const ua = btn.getAttribute('data-ua');
        if (ua === currentUa) return;
        currentUa = ua;
        localStorage.setItem('redirect_ua', currentUa);
        updateUaButtons();
    });
});

function getCurrentUa() {
    return currentUa;
}

function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getParamValue(url, paramName) {
    const regex = new RegExp(`[?&]${escapeRegex(paramName)}=([^&]*)`, 'i');
    const match = url.match(regex);
    return match ? match[1] : null;
}

function getVariants(raw) {
    if (!raw) return [];
    const set = new Set();
    set.add(raw);
    try { set.add(decodeURIComponent(raw)); } catch(e) {}
    try { set.add(encodeURIComponent(raw)); } catch(e) {}
    return Array.from(set);
}

function buildStyledUrl(url, highlights = []) {
    const container = document.createElement('div');
    container.className = 'url';
    if (!highlights.length) {
        container.textContent = url;
        return container;
    }
    const matches = [];
    highlights.forEach((item) => {
        if (!item.value) return;
        const variants = getVariants(item.value);
        variants.forEach((variant) => {
            const regex = new RegExp(escapeRegex(variant), 'gi');
            let match;
            while ((match = regex.exec(url)) !== null) {
                matches.push({
                    start: match.index,
                    end: match.index + match[0].length,
                    text: match[0],
                    className: item.className
                });
            }
        });
    });
    if (!matches.length) {
        container.textContent = url;
        return container;
    }
    matches.sort((a, b) => a.start - b.start);
    let currentIndex = 0;
    matches.forEach((match) => {
        if (match.start > currentIndex) {
            container.appendChild(document.createTextNode(url.slice(currentIndex, match.start)));
        }
        const span = document.createElement('span');
        span.className = match.className;
        span.textContent = match.text;
        container.appendChild(span);
        currentIndex = match.end;
    });
    if (currentIndex < url.length) {
        container.appendChild(document.createTextNode(url.slice(currentIndex)));
    }
    return container;
}

function renderChain(data) {
    resultDiv.innerHTML = '';
    if (!data || data.isError || !data.chain || !data.chain.length) {
        const empty = document.createElement('div');
        empty.className = 'chain-item';
        empty.textContent = 'Нет данных';
        resultDiv.appendChild(empty);
        return;
    }
    data.chain.forEach((item) => {
        const chainItem = document.createElement('div');
        chainItem.className = 'chain-item';
        const badge = document.createElement('div');
        badge.className = 'step-badge';
        badge.textContent = (item.status >= 300 && item.status < 400) ? `${item.step} →` : item.step;
        chainItem.appendChild(badge);
        const highlights = [];
        if (highlightYcp && lastYcpValue) {
            highlights.push({ value: lastYcpValue, className: 'highlight-ycp' });
        }
        if (highlightErid && lastEridValue) {
            highlights.push({ value: lastEridValue, className: 'highlight-erid' });
        }
        const urlElement = buildStyledUrl(item.url, highlights);
        chainItem.appendChild(urlElement);
        const status = document.createElement('div');
        status.className = 'http-status';
        status.textContent = `HTTP ${item.status}`;
        chainItem.appendChild(status);
        resultDiv.appendChild(chainItem);
    });
}

async function checkUrl(rawUrl) {
    resultDiv.style.display = 'block';
    resultDiv.innerHTML = 'Загрузка...';
    try {
        const uaParam = `&ua=${getCurrentUa()}`;
        const response = await fetch(FUNCTION_URL + encodeURIComponent(rawUrl) + uaParam);
        const data = await response.json();
        lastData = data;
        if (data.chain?.[0]?.url) {
            const firstUrl = data.chain[0].url;
            lastYcpValue = getParamValue(firstUrl, 'a.ycp') || getParamValue(firstUrl, 'ycp');
            lastEridValue = getParamValue(firstUrl, 'erid');
        }
        renderChain(data);
    } catch (err) {
        resultDiv.innerHTML = '';
        const errorDiv = document.createElement('div');
        errorDiv.className = 'chain-item';
        errorDiv.textContent = `Ошибка: ${err.message}`;
        resultDiv.appendChild(errorDiv);
        lastData = null;
    }
}

checkBtn.addEventListener('click', async () => {
    const rawUrl = urlInput.value.trim();
    if (!rawUrl) {
        alert('Введите ссылку');
        return;
    }
    await checkUrl(rawUrl);
});

highlightYcpBtn.addEventListener('click', () => {
    highlightYcp = !highlightYcp;
    if (highlightYcp) {
        highlightYcpBtn.classList.add('active');
    } else {
        highlightYcpBtn.classList.remove('active');
    }
    if (lastData) {
        renderChain(lastData);
    }
});

highlightEridBtn.addEventListener('click', () => {
    highlightErid = !highlightErid;
    if (highlightErid) {
        highlightEridBtn.classList.add('active');
    } else {
        highlightEridBtn.classList.remove('active');
    }
    if (lastData) {
        renderChain(lastData);
    }
});

screenshotBtn.addEventListener('click', async () => {
    const card = document.querySelector('.card');
    if (!card) return;
    try {
        const canvas = await html2canvas(card, {
            scale: 2,
            backgroundColor: '#ffffff',
            logging: false
        });
        const link = document.createElement('a');
        const timestamp = new Date().toISOString().slice(0,19).replace(/:/g, '-');
        link.download = `redirect-${timestamp}.png`;
        link.href = canvas.toDataURL();
        link.click();
    } catch (err) {
        console.error(err);
    }
});