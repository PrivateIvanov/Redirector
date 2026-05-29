const FUNCTION_URL = 'https://functions.yandexcloud.net/d4e8tpcuk4s6db55jcpu?url=';

document.getElementById('checkBtn').addEventListener('click', async () => {
  const input = document.getElementById('urlInput');
  const resultDiv = document.getElementById('resultArea');
  let rawUrl = input.value.trim();
  if (!rawUrl) {
    alert('Введите ссылку');
    return;
  }

  resultDiv.style.display = 'block';
  resultDiv.innerHTML = '<div style="padding: 20px; text-align:center;">Запрашиваем цепочку...</div>';

  try {
    const response = await fetch(FUNCTION_URL + encodeURIComponent(rawUrl));
    const data = await response.json();

    if (data.isError) {
      resultDiv.innerHTML = `<div class="chain-item">Ошибка: ${data.chain[data.chain.length-1].error}</div>`;
      return;
    }

    if (!data.chain || data.chain.length === 0) {
      resultDiv.innerHTML = '<div class="chain-item">Нет данных о редиректах.</div>';
      return;
    }

    let html = '';
    for (let item of data.chain) {
      if (item.error) {
        html += `<div class="chain-item">
                  <span class="step-badge">Шаг ${item.step}</span>
                  ${item.error}
                  <div class="url">${escapeHtml(item.url)}</div>
                </div>`;
      } else if (item.status >= 300 && item.status < 400) {
        html += `<div class="chain-item">
                  <span class="step-badge">${item.step} →</span>
                  <div class="url">${escapeHtml(item.url)}</div>
                </div>`;
      } else {
        html += `<div class="chain-item">
                  <span class="step-badge">${item.step}</span>
                  <span>HTTP ${item.status}</span>
                  <div class="url">${escapeHtml(item.url)}</div>
                </div>`;
      }
    }

    // Блок с итоговым URL УБРАН, чтобы не дублировался
    // Финальный URL и так виден в последнем элементе цепочки

    resultDiv.innerHTML = html;
  } catch (err) {
    resultDiv.innerHTML = `<div class="chain-item">Ошибка соединения: ${err.message}</div>`;
  }
});

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}