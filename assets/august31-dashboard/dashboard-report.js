(function () {
  const D = window.CLIMATE_DASHBOARD;
  const root = document.getElementById('reportRoot');
  const requested = new URLSearchParams(location.search).get('view');
  const allowedViews = ['sales', 'revenue', 'production'];
  const view = allowedViews.includes(requested) ? requested : 'sales';
  const pageNames = { sales: 'Продажи', revenue: 'Выручка', production: 'Выработка' };
  let period = 'week';
  let productionMetric = 'total';
  let projectsExpanded = false;
  let planProjectsExpanded = false;

  document.body.classList.add(`report-${view}`);
  document.title = `${pageNames[view]} · Climate`;
  document.getElementById('pageLabel').textContent = '';
  document.querySelectorAll('[data-view]').forEach(link => {
    if (link.dataset.view === view) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    }
  });

  const fmt = value => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(Math.round(Number(value) || 0));
  const money = value => `${fmt(value)} ₽`;
  const last = values => Array.isArray(values) && values.length ? Number(values[values.length - 1]) || 0 : 0;
  const sum = values => (values || []).reduce((total, value) => total + (Number(value) || 0), 0);
  const esc = value => String(value).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
  const monthNames = { '01':'Янв', '02':'Фев', '03':'Мар', '04':'Апр', '05':'Май', '06':'Июн', '07':'Июл', '08':'Авг', '09':'Сен', '10':'Окт', '11':'Ноя', '12':'Дек' };

  function monthly(values) {
    const grouped = new Map();
    D.dates.forEach((date, index) => {
      const month = String(date).split('.')[1];
      grouped.set(month, (grouped.get(month) || 0) + (Number(values[index]) || 0));
    });
    return { labels:[...grouped.keys()].map(month => monthNames[month] || month), values:[...grouped.values()] };
  }

  function chartData(values) {
    if (period === 'month') return monthly(values);
    const dayMs = 24 * 60 * 60 * 1000;
    const baseStart = Date.UTC(2026, 5, 11); // 11.06.2026
    const firstSwitch = Date.UTC(2026, 8, 2); // за день до четверга 03.09
    const now = new Date();
    const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    const fourWeeks = 28 * dayMs;
    const shifts = today < firstSwitch ? 0 : Math.floor((today - firstSwitch) / fourWeeks) + 1;
    const windowStart = baseStart + shifts * fourWeeks;
    const valueByDate = new Map(D.dates.map((date, index) => [date, Number(values[index]) || 0]));
    const labels = Array.from({ length:12 }, (_, index) => {
      const date = new Date(windowStart + index * 7 * dayMs);
      return `${String(date.getUTCDate()).padStart(2, '0')}.${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
    });
    return { labels, values:labels.map(date => valueByDate.get(date) || 0) };
  }

  function periodSwitch() {
    return `<div class="period-switch" role="group" aria-label="Период графика">
      <button class="period-btn ${period === 'week' ? 'active' : ''}" data-period="week">Недели</button>
      <button class="period-btn ${period === 'month' ? 'active' : ''}" data-period="month">Месяц</button>
    </div>`;
  }

  function metricSwitch() {
    return `<div class="metric-switch" role="group" aria-label="Вид выработки">
      <button class="metric-btn ${productionMetric === 'total' ? 'active' : ''}" data-metric="total">Общая</button>
      <button class="metric-btn ${productionMetric === 'services' ? 'active' : ''}" data-metric="services">Услуги</button>
    </div>`;
  }

  function compact(value) {
    const number = Number(value) || 0;
    if (number >= 1000000) return `${(number / 1000000).toFixed(number >= 10000000 ? 0 : 1).replace('.', ',')} млн`;
    if (number >= 1000) return `${Math.round(number / 1000)} тыс.`;
    return fmt(number);
  }

  function axisCaption(label) {
    return { main:label, sub:'' };
  }

  function niceMaximum(value) {
    const maxValue = Math.max(Number(value) || 0, 1);
    const magnitude = Math.pow(10, Math.floor(Math.log10(maxValue)));
    const fraction = maxValue / magnitude;
    const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 4 ? 4 : fraction <= 5 ? 5 : fraction <= 8 ? 8 : 10;
    return nice * magnitude;
  }

  function chart(dataset) {
    const labels = dataset.labels || [];
    const values = dataset.values || [];
    if (!labels.length || !values.length) return '<div class="chart-empty">Нет данных</div>';
    const average = sum(values) / Math.max(values.length, 1);
    const max = niceMaximum(Math.max(...values));
    const W = 1240;
    const padLeft = 88;
    const padRight = 112;
    const padTop = 42;
    const padBottom = 78;
    const plotH = 470;
    const H = padTop + plotH + padBottom;
    const plotW = W - padLeft - padRight;
    const x = index => padLeft + (labels.length === 1 ? plotW / 2 : index * plotW / (labels.length - 1));
    const y = value => padTop + plotH - (Number(value) || 0) / max * plotH;

    let grid = '';
    for (let index = 0; index <= 4; index++) {
      const value = max / 4 * index;
      const yy = y(value);
      grid += `<line x1="${padLeft}" y1="${yy}" x2="${W - padRight}" y2="${yy}" class="report-grid-line"/>
        <text x="${padLeft - 16}" y="${yy + 4}" text-anchor="end" class="report-axis-value">${compact(value)}</text>`;
    }

    let linePath = '';
    let areaPath = '';
    values.forEach((value, index) => {
      const xx = x(index);
      const yy = y(value);
      if (index === 0) {
        linePath = `M ${xx} ${yy}`;
        areaPath = `M ${xx} ${padTop + plotH} L ${xx} ${yy}`;
      } else {
        const previousX = x(index - 1);
        const previousY = y(values[index - 1]);
        const controlX = (previousX + xx) / 2;
        linePath += ` C ${controlX} ${previousY}, ${controlX} ${yy}, ${xx} ${yy}`;
        areaPath += ` C ${controlX} ${previousY}, ${controlX} ${yy}, ${xx} ${yy}`;
      }
    });
    areaPath += ` L ${x(values.length - 1)} ${padTop + plotH} Z`;

    const points = values.map((value, index) => {
      const xx = x(index);
      const yy = y(value);
      const color = value >= average ? 'var(--ok)' : 'var(--warn)';
      const caption = axisCaption(labels[index]);
      const isLast = index === values.length - 1;
      return `<g>
        ${isLast ? `<circle cx="${xx}" cy="${yy}" r="12" fill="${color}" opacity=".20"/>` : ''}
        <circle cx="${xx}" cy="${yy}" r="6.5" fill="${color}" stroke="#fff" stroke-width="2.5"><title>${esc(labels[index])} — ${money(value)}</title></circle>
        <text class="lead-chart-value" x="${xx}" y="${Math.max(18, yy - 15)}" text-anchor="middle">${compact(value)}</text>
        <text class="lead-chart-main-label" x="${xx}" y="${padTop + plotH + 28}" text-anchor="middle">${esc(caption.main)}</text>
        ${caption.sub ? `<text class="lead-chart-sub-label" x="${xx}" y="${padTop + plotH + 48}" text-anchor="middle">${esc(caption.sub)}</text>` : ''}
      </g>`;
    }).join('');

    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(pageNames[view])} — график">
      <defs>
        <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="var(--chart-start)"/><stop offset="100%" stop-color="var(--chart-end)"/></linearGradient>
        <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="var(--chart-fill)" stop-opacity=".25"/><stop offset="72%" stop-color="var(--chart-fill)" stop-opacity=".06"/><stop offset="100%" stop-color="var(--chart-fill)" stop-opacity="0"/></linearGradient>
      </defs>
      ${grid}
      <path d="${areaPath}" fill="url(#areaGradient)"/>
      <path d="${linePath}" fill="none" stroke="url(#lineGradient)" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
      ${points}
    </svg>`;
  }

  function miniItem(label, value, tone = '') {
    return `<div class="dash-mini-item ${tone}"><span>${esc(label)}</span><b>${esc(value)}</b></div>`;
  }

  function managerList(data, tone = '') {
    return `<div class="dash-mini-list">
      ${miniItem('Анна', money(last(data.anna)), tone)}
      ${miniItem('Георгий', money(last(data.george)), tone)}
      ${miniItem('Виталий', money(last(data.vitaly)), tone)}
    </div>`;
  }

  function salesFact() {
    return `<aside class="dash-side-card">
      <div class="dash-side-title">Факт</div>
      <div class="dash-side-primary"><strong>${money(last(D.sales.total))}</strong></div>
      ${managerList(D.sales)}
      <div class="dash-side-divider"></div>
      <div class="dash-kp-title"><span>КП</span></div>
      <div class="dash-kp-grid">
        <div class="dash-kp"><b>${fmt(last(D.kp.total))}</b></div>
        <div class="dash-kp"><b>${fmt(last(D.kp.anna))}</b><span>Анна</span></div>
        <div class="dash-kp"><b>${fmt(last(D.kp.george))}</b><span>Георгий</span></div>
        <div class="dash-kp"><b>${fmt(last(D.kp.vitaly))}</b><span>Виталий</span></div>
      </div>
    </aside>`;
  }

  function planCard(plan) {
    const overall = ['anna', 'george', 'vitaly'].reduce((value, manager) => value + (Number(plan[manager]?.total) || 0), 0);
    const managers = [
      ['anna', 'Анна'],
      ['george', 'Георгий'],
      ['vitaly', 'Виталий']
    ];
    const groups = managers.map(([key, name]) => ({
      key,
      name,
      items:(plan[key]?.items || []).slice().sort((left, right) => Number(right[1]) - Number(left[1]))
    })).filter(group => group.items.length);
    const previewCount = 3;
    const hiddenCount = groups.reduce((count, group) => count + Math.max(0, group.items.length - previewCount), 0);
    const projectGroups = groups.map(group => {
      const items = planProjectsExpanded ? group.items : group.items.slice(0, previewCount);
      return `<div class="plan-project-group">
        <div class="plan-project-manager"><span>${group.name}</span><b>${group.items.length}</b></div>
        ${items.map(item => `<div class="plan-project" title="${esc(item[0])}"><span>${esc(item[0])}</span><b>${money(item[1])}</b></div>`).join('')}
      </div>`;
    }).join('');
    return `<aside class="dash-side-card dash-plan-card">
      <div class="dash-side-title">${view === 'sales' || view === 'revenue' ? 'Квота' : 'План'}</div>
      <div class="dash-side-primary"><strong>${money(overall)}</strong></div>
      <div class="dash-mini-list">
        ${miniItem('Анна', money(plan.anna?.total), 'plan-tone')}
        ${miniItem('Георгий', money(plan.george?.total), 'plan-tone')}
        ${miniItem('Виталий', money(plan.vitaly?.total), 'plan-tone')}
      </div>
      ${groups.length ? `<div class="dash-side-divider plan-project-divider"></div>
        <div class="plan-projects-head">Проекты</div>
        <div class="plan-project-groups">${projectGroups}</div>
        ${hiddenCount ? `<button class="projects-toggle plan-projects-toggle" type="button" data-plan-projects-toggle>${planProjectsExpanded ? 'Скрыть проекты' : `Показать ещё (${hiddenCount})`}</button>` : ''}` : ''}
    </aside>`;
  }

  function revenueFact() {
    return `<aside class="dash-side-card">
      <div class="dash-side-title">Факт</div>
      <div class="dash-side-primary"><strong>${money(last(D.revenue.total))}</strong></div>
      ${managerList(D.revenue)}
    </aside>`;
  }

  function mainMetric(label, value, tone = '') {
    return `<div class="dash-main-metric ${tone}"><span>${esc(label)}</span><strong>${money(value)}</strong></div>`;
  }

  function productionFact() {
    return `<aside class="dash-side-card">
      <div class="dash-side-title">Факт</div>
      <div class="dash-dual-metrics">
        ${mainMetric('Общая', last(D.production.total))}
        ${mainMetric('Услуги', last(D.production.services), 'services')}
      </div>
    </aside>`;
  }

  function productionPlan() {
    const valueIndex = productionMetric === 'services' ? 1 : 2;
    const projects = (D.productionPlan.projects || []).slice()
      .filter(project => Number(project[valueIndex]) > 0)
      .sort((left, right) => Number(right[valueIndex]) - Number(left[valueIndex]));
    const previewCount = 10;
    const visibleProjects = projectsExpanded ? projects : projects.slice(0, previewCount);
    const projectRows = visibleProjects
      .map(project => `<div class="production-project" title="${esc(project[0])}"><span>${esc(project[0])}</span><b>${money(project[valueIndex])}</b></div>`)
      .join('');
    return `<aside class="dash-side-card">
      <div class="dash-side-title">План</div>
      <div class="dash-dual-metrics">
        ${mainMetric('Общая', D.productionPlan.total)}
        ${mainMetric('Услуги', D.productionPlan.services, 'services')}
      </div>
      <div class="dash-side-divider"></div>
      <div class="production-project-head"><span>Проекты</span></div>
      <div class="production-projects">${projectRows}</div>
      ${projects.length > previewCount ? `<button class="projects-toggle" type="button" data-projects-toggle>${projectsExpanded ? 'Скрыть проекты' : `Показать ещё (${projects.length - previewCount})`}</button>` : ''}
    </aside>`;
  }

  function chartCard(values, title) {
    const services = view === 'production' && productionMetric === 'services';
    return `<section class="dash-chart-card ${services ? 'services-theme' : ''}">
      <div class="dash-chart-head"><h2>${esc(title)}</h2><div class="dash-controls">${view === 'production' ? metricSwitch() : ''}${periodSwitch()}</div></div>
      <div class="chart-box">${chart(chartData(values))}</div>
    </section>`;
  }

  function salesPage() {
    root.innerHTML = `<div class="dash-main-grid">${salesFact()}${chartCard(D.sales.total, 'Продажи')}${planCard(D.salesPlan)}</div>`;
  }

  function revenuePage() {
    root.innerHTML = `<div class="dash-main-grid">${revenueFact()}${chartCard(D.revenue.total, 'Выручка')}${planCard(D.revenuePlan)}</div>`;
  }

  function productionPage() {
    const services = productionMetric === 'services';
    const values = services ? D.production.services : D.production.total;
    root.innerHTML = `<div class="dash-main-grid">${productionFact()}${chartCard(values, services ? 'Выработка · услуги' : 'Выработка')}${productionPlan()}</div>`;
  }

  function render() {
    document.body.classList.toggle('services-selected', view === 'production' && productionMetric === 'services');
    if (view === 'production') productionPage();
    else if (view === 'revenue') revenuePage();
    else salesPage();
    root.querySelectorAll('[data-period]').forEach(button => button.addEventListener('click', () => { period = button.dataset.period; render(); }));
    root.querySelectorAll('[data-metric]').forEach(button => button.addEventListener('click', () => { productionMetric = button.dataset.metric; render(); }));
    root.querySelector('[data-projects-toggle]')?.addEventListener('click', () => { projectsExpanded = !projectsExpanded; render(); });
    root.querySelector('[data-plan-projects-toggle]')?.addEventListener('click', () => { planProjectsExpanded = !planProjectsExpanded; render(); });
  }

  window.addEventListener('climate-data-updated', render);
  render();
})();
