(function () {
  const D = window.CLIMATE_DASHBOARD;
  if (!D) return;

  const STATS_ID = '1Fg-5k-zmft2goGfMP722XNe6_KGQhWqtuEVAooBqXyg';
  const WORK_ID = '1tZFDTfb0AtUB5l7I5KbSSUUUaNOP6ux7M9SWYHb4BMc';
  const REFRESH_MS = 5000;
  const CACHE_KEY = 'climateDashboard_report_cache_v1';
  const DYNAMIC_KEYS = ['dates','updated','sales','revenue','production','kp','salesPlan','revenuePlan','productionPlan'];
  let requestNumber = 0;
  let refreshInFlight = false;

  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
    if (cached?.data) DYNAMIC_KEYS.forEach(key => { if (key in cached.data) D[key] = cached.data[key]; });
  } catch (error) {}

  function snapshot() {
    return Object.fromEntries(DYNAMIC_KEYS.map(key => [key, D[key]]));
  }

  function loadSheet(spreadsheetId, sheet, range) {
    return new Promise((resolve, reject) => {
      const callback = `__climateLive${Date.now()}_${requestNumber++}`;
      const script = document.createElement('script');
      const timeout = setTimeout(() => finish(new Error('Превышено время обновления')), 12000);

      function finish(error, value) {
        clearTimeout(timeout);
        delete window[callback];
        script.remove();
        if (error) reject(error); else resolve(value);
      }

      window[callback] = response => {
        if (!response || response.status === 'error' || !response.table) {
          finish(new Error('Таблица не вернула данные'));
          return;
        }
        finish(null, response.table);
      };

      const base = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq`;
      const query = new URLSearchParams({
        sheet,
        range,
        tqx: `out:json;responseHandler:${callback}`,
        _: String(Date.now())
      });
      script.async = true;
      script.onerror = () => finish(new Error('Не удалось подключиться к таблице'));
      script.src = `${base}?${query}`;
      document.head.appendChild(script);
    });
  }

  const raw = (row, index) => row?.c?.[index]?.v ?? null;
  const shown = (row, index) => row?.c?.[index]?.f ?? raw(row, index) ?? '';
  const number = (row, index) => {
    const value = raw(row, index);
    if (typeof value === 'number') return value;
    const normalized = String(value ?? '').replace(/\s/g, '').replace(',', '.').replace(/[^\d.-]/g, '');
    return Number(normalized) || 0;
  };
  const label = value => String(value ?? '').trim().toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ');
  const rows = table => table?.rows || [];

  function findRowIndex(tableRows, wanted, start = 0) {
    const target = label(wanted);
    return tableRows.findIndex((row, index) => index >= start && label(shown(row, 0)) === target);
  }

  function findNextRow(tableRows, start, wanted) {
    const target = label(wanted);
    for (let index = start + 1; index < Math.min(tableRows.length, start + 7); index++) {
      if (label(shown(tableRows[index], 0)) === target) return index;
    }
    return -1;
  }

  function valuesFrom(tableRows, rowIndex, lastColumn) {
    if (rowIndex < 0) return [];
    return Array.from({ length:lastColumn }, (_, index) => number(tableRows[rowIndex], index + 1));
  }

  function applyStats(table) {
    const tableRows = rows(table);
    if (!tableRows.length) return;

    const salesTotalRow = findRowIndex(tableRows, 'Продажи (Общие)');
    const revenueTotalRow = findRowIndex(tableRows, 'Выручка (Общая)');
    const productionTotalRow = findRowIndex(tableRows, 'Выработка (Общ)');
    const productionServicesRow = findRowIndex(tableRows, 'Выработка (Усл)');
    const kpTotalRow = findRowIndex(tableRows, 'КП (Общие)');
    const revenueAnnaRow = findRowIndex(tableRows, 'Выручка (Анна)');
    const revenueGeorgeRow = findRowIndex(tableRows, 'Выручка (Георгий)');
    const revenueVitalyRow = findRowIndex(tableRows, 'Выручка (Виталий)');
    const salesAnnaRow = findNextRow(tableRows, revenueAnnaRow, 'Продажи');
    const salesGeorgeRow = findNextRow(tableRows, revenueGeorgeRow, 'Продажи');
    const salesVitalyRow = findNextRow(tableRows, revenueVitalyRow, 'Продажи');
    const kpAnnaRow = findNextRow(tableRows, revenueAnnaRow, 'КП');
    const kpGeorgeRow = findNextRow(tableRows, revenueGeorgeRow, 'КП');
    const kpVitalyRow = findNextRow(tableRows, revenueVitalyRow, 'КП');
    const metricRows = [salesTotalRow, revenueTotalRow, productionTotalRow, productionServicesRow, kpTotalRow].filter(index => index >= 0);

    let lastColumn = 0;
    const width = Math.max(...tableRows.map(row => row.c?.length || 0), 0);
    for (let column = 1; column < width; column++) {
      if (metricRows.some(rowIndex => number(tableRows[rowIndex], column) !== 0)) lastColumn = column;
    }
    if (!lastColumn) return;

    D.dates = Array.from({ length:lastColumn }, (_, index) => {
      const text = String(shown(tableRows[0], index + 1));
      const match = text.match(/(\d{1,2})[./](\d{1,2})/);
      return match ? `${match[1].padStart(2, '0')}.${match[2].padStart(2, '0')}` : text.slice(0, 5);
    });
    D.updated = D.dates[D.dates.length - 1] || D.updated;
    D.sales = {
      total: valuesFrom(tableRows, salesTotalRow, lastColumn),
      anna: valuesFrom(tableRows, salesAnnaRow, lastColumn),
      george: valuesFrom(tableRows, salesGeorgeRow, lastColumn),
      vitaly: valuesFrom(tableRows, salesVitalyRow, lastColumn)
    };
    D.revenue = {
      total: valuesFrom(tableRows, revenueTotalRow, lastColumn),
      anna: valuesFrom(tableRows, revenueAnnaRow, lastColumn),
      george: valuesFrom(tableRows, revenueGeorgeRow, lastColumn),
      vitaly: valuesFrom(tableRows, revenueVitalyRow, lastColumn)
    };
    D.production = {
      total: valuesFrom(tableRows, productionTotalRow, lastColumn),
      services: valuesFrom(tableRows, productionServicesRow, lastColumn)
    };
    D.kp = {
      total: valuesFrom(tableRows, kpTotalRow, lastColumn),
      anna: valuesFrom(tableRows, kpAnnaRow, lastColumn),
      george: valuesFrom(tableRows, kpGeorgeRow, lastColumn),
      vitaly: valuesFrom(tableRows, kpVitalyRow, lastColumn)
    };
  }

  const managerKeys = { 'анна':'anna', 'георгий':'george', 'виталий':'vitaly' };

  function parseManagerPlan(table, amountColumn, deadlineColumn) {
    const result = {
      anna: { total:0, items:[] },
      george: { total:0, items:[] },
      vitaly: { total:0, items:[] }
    };
    // В рабочих вкладках строки Анны идут первыми, без отдельной строки-заголовка.
    let manager = 'anna';
    rows(table).forEach(row => {
      const first = String(shown(row, 0)).trim();
      const possibleManager = managerKeys[label(first)];
      if (possibleManager) {
        manager = possibleManager;
        return;
      }
      if (!manager || number(row, deadlineColumn) !== 1) return;
      const amount = number(row, amountColumn);
      if (!amount) return;
      result[manager].total += amount;
      result[manager].items.push([first || 'Без названия', amount]);
    });
    return result;
  }

  function applyProductionPlan(table) {
    const projects = [];
    let services = 0;
    let total = 0;
    rows(table).forEach(row => {
      const name = String(shown(row, 1)).trim();
      if (!name) return;
      const servicesValue = number(row, 2);
      const totalValue = number(row, 3);
      if (label(name).includes('итого')) {
        services = servicesValue;
        total = totalValue;
        return;
      }
      if (servicesValue || totalValue) projects.push([name, servicesValue, totalValue]);
    });
    if (total || services) D.productionPlan = { services, total, projects };
  }

  async function refresh() {
    if (refreshInFlight) return;
    refreshInFlight = true;
    const before = JSON.stringify(snapshot());
    try {
      const requests = await Promise.allSettled([
        loadSheet(STATS_ID, '2026', 'A1:BA21'),
        loadSheet(WORK_ID, 'Продажи', 'A1:D301'),
        loadSheet(WORK_ID, 'Оплаты', 'A1:E368'),
        loadSheet(WORK_ID, 'План', 'A1:V52')
      ]);
      let received = false;
      if (requests[0].status === 'fulfilled') { applyStats(requests[0].value); received = true; }
      if (requests[1].status === 'fulfilled') { D.salesPlan = parseManagerPlan(requests[1].value, 2, 3); received = true; }
      if (requests[2].status === 'fulfilled') { D.revenuePlan = parseManagerPlan(requests[2].value, 1, 4); received = true; }
      if (requests[3].status === 'fulfilled') { applyProductionPlan(requests[3].value); received = true; }
      const after = JSON.stringify(snapshot());
      if (received) {
        try { localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt:Date.now(), data:snapshot() })); } catch (error) {}
      }
      if (received && before !== after) window.dispatchEvent(new CustomEvent('climate-data-updated'));
    } finally {
      refreshInFlight = false;
    }
  }

  setTimeout(refresh, 500);
  setInterval(refresh, REFRESH_MS);
})();
