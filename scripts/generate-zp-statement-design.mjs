import fs from "node:fs";
import path from "node:path";

const output = path.resolve("assets/zp-2026-09-04/zp-statement-redesign.svg");

const rows = [
  ["02.09.2026", "ООО «ВЫМПЕЛСТРОЙ18»", "05.2026 / Диагностика клапанов / Звенигородское шоссе, дом 11", "22 893,0", "13 735,8", "4 578,6"],
  ["02.09.2026", "ООО «ВЫМПЕЛСТРОЙ18»", "05.2026 / Диагностика клапанов / Звенигородское шоссе, дом 11", "11 380,0", "0,0", "6 828,0"],
  ["02.09.2026", "ООО «ФосАгро-Сервис»", "06.2026 / ТО / Фосагро / Ленинский проспект 55/1, стр. 1", "7 000,0", "0,0", "7 000,0"],
  ["02.09.2026", "АО «АВИЛОН АГ»", "07.2026 / Авилон / ТО чиллеров Мытищи", "12 000,0", "0,0", "12 000,0"],
  ["02.09.2026", "АО «АВИЛОН АГ»", "07.2026 / ТО сплитов Черри / Волгоградский проспект, 43, стр. 2", "12 825,0", "7 695,0", "5 130,0"],
];

const esc = (value) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");

function wrappedText(text, x, y, maxChars, options = {}) {
  const words = text.split(/\s+/);
  const lines = [];
  let current = "";
  words.forEach((word) => {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  });
  if (current) lines.push(current);
  const size = options.size ?? 25;
  const lineHeight = options.lineHeight ?? Math.round(size * 1.35);
  const weight = options.weight ?? 500;
  const fill = options.fill ?? "#273349";
  const anchor = options.anchor ?? "start";
  return `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="Inter, Arial, sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}">${lines.map((line, index) => `<tspan x="${x}" dy="${index === 0 ? 0 : lineHeight}">${esc(line)}</tspan>`).join("")}</text>`;
}

const tableX = 100;
const tableY = 500;
const headerHeight = 74;
const rowHeight = 178;
const columns = [
  { label: "Дата", x: tableX, width: 170, align: "start" },
  { label: "Контрагент", x: tableX + 170, width: 320, align: "start" },
  { label: "Проект", x: tableX + 490, width: 560, align: "start" },
  { label: "Ставка", x: tableX + 1050, width: 180, align: "end" },
  { label: "Выплачено", x: tableX + 1230, width: 180, align: "end" },
  { label: "Остаток", x: tableX + 1410, width: 190, align: "end" },
];

const rowMarkup = rows.map((row, rowIndex) => {
  const y = tableY + headerHeight + rowIndex * rowHeight;
  const fill = rowIndex % 2 === 0 ? "#ffffff" : "#f8faff";
  const cells = row.map((value, cellIndex) => {
    const column = columns[cellIndex];
    const isMoney = cellIndex >= 3;
    const x = isMoney ? column.x + column.width - 20 : column.x + 20;
    const maxChars = cellIndex === 1 ? 25 : cellIndex === 2 ? 46 : 18;
    return wrappedText(value, x, y + 57, maxChars, {
      size: isMoney ? 25 : 23,
      lineHeight: 31,
      weight: isMoney ? 700 : cellIndex === 1 ? 650 : 500,
      anchor: isMoney ? "end" : "start",
      fill: isMoney ? "#17233a" : "#334159",
    });
  }).join("\n");
  return `<g><rect x="${tableX}" y="${y}" width="1600" height="${rowHeight}" fill="${fill}"/><line x1="${tableX}" y1="${y + rowHeight}" x2="1700" y2="${y + rowHeight}" stroke="#e6ebf4" stroke-width="2"/>${cells}</g>`;
}).join("\n");

const headerCells = columns.map((column) => {
  const x = column.align === "end" ? column.x + column.width - 20 : column.x + 20;
  return `<text x="${x}" y="${tableY + 47}" text-anchor="${column.align === "end" ? "end" : "start"}" font-family="Inter, Arial, sans-serif" font-size="21" font-weight="750" fill="#64728a" letter-spacing="0.8">${column.label}</text>`;
}).join("\n");

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="1960" viewBox="0 0 1800 1960">
  <defs>
    <linearGradient id="page-bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#f4f7fd"/>
      <stop offset="1" stop-color="#eaf0fb"/>
    </linearGradient>
    <linearGradient id="hero" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#2f6ff1"/>
      <stop offset="1" stop-color="#6f8fff"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="150%">
      <feDropShadow dx="0" dy="22" stdDeviation="32" flood-color="#253a68" flood-opacity="0.14"/>
    </filter>
  </defs>

  <rect width="1800" height="1960" fill="url(#page-bg)"/>
  <rect x="46" y="38" width="1708" height="1878" rx="34" fill="#ffffff" filter="url(#shadow)"/>

  <rect x="70" y="62" width="1660" height="250" rx="28" fill="url(#hero)"/>
  <circle cx="132" cy="128" r="34" fill="#ffffff" fill-opacity="0.2"/>
  <text x="132" y="140" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="27" font-weight="800" fill="#ffffff">БА</text>
  <text x="184" y="154" font-family="Inter, Arial, sans-serif" font-size="54" font-weight="800" fill="#ffffff">Балтабаев Артем</text>
  <text x="184" y="218" font-family="Inter, Arial, sans-serif" font-size="25" font-weight="500" fill="#e9efff">Период расчёта: 27.08.2026 — 02.09.2026</text>

  <text x="100" y="390" font-family="Inter, Arial, sans-serif" font-size="36" font-weight="800" fill="#17233a">Детализация начислений</text>
  <text x="100" y="434" font-family="Inter, Arial, sans-serif" font-size="22" font-weight="500" fill="#748198">За выбранный период</text>

  <rect x="${tableX}" y="${tableY}" width="1600" height="${headerHeight + rowHeight * rows.length}" rx="22" fill="#ffffff" stroke="#e2e8f2" stroke-width="2"/>
  <path d="M ${tableX + 22} ${tableY} H ${1700 - 22} Q 1700 ${tableY} 1700 ${tableY + 22} V ${tableY + headerHeight} H ${tableX} V ${tableY + 22} Q ${tableX} ${tableY} ${tableX + 22} ${tableY}" fill="#f3f6fb"/>
  ${headerCells}
  ${rowMarkup}

  <rect x="100" y="1496" width="1600" height="116" rx="22" fill="#eff4ff"/>
  <text x="132" y="1545" font-family="Inter, Arial, sans-serif" font-size="23" font-weight="650" fill="#5f6d85">Итого по проектам</text>
  <text x="1120" y="1545" text-anchor="end" font-family="Inter, Arial, sans-serif" font-size="27" font-weight="800" fill="#17233a">66 098,0 ₽</text>
  <text x="1320" y="1545" text-anchor="end" font-family="Inter, Arial, sans-serif" font-size="27" font-weight="800" fill="#17233a">21 430,8 ₽</text>
  <text x="1664" y="1545" text-anchor="end" font-family="Inter, Arial, sans-serif" font-size="27" font-weight="800" fill="#17233a">35 536,6 ₽</text>
  <text x="1120" y="1582" text-anchor="end" font-family="Inter, Arial, sans-serif" font-size="17" font-weight="650" fill="#78859b">НАЧИСЛЕНО</text>
  <text x="1320" y="1582" text-anchor="end" font-family="Inter, Arial, sans-serif" font-size="17" font-weight="650" fill="#78859b">ВЫПЛАЧЕНО</text>
  <text x="1664" y="1582" text-anchor="end" font-family="Inter, Arial, sans-serif" font-size="17" font-weight="650" fill="#78859b">ОСТАТОК</text>

  <text x="100" y="1688" font-family="Inter, Arial, sans-serif" font-size="30" font-weight="800" fill="#17233a">Дополнительные начисления</text>
  <rect x="100" y="1720" width="340" height="106" rx="20" fill="#f7f9fd" stroke="#e5eaf3"/>
  <text x="126" y="1761" font-family="Inter, Arial, sans-serif" font-size="19" font-weight="650" fill="#748198">Бензин</text>
  <text x="126" y="1803" font-family="Inter, Arial, sans-serif" font-size="29" font-weight="800" fill="#26344c">0,0 ₽</text>
  <rect x="466" y="1720" width="340" height="106" rx="20" fill="#f7f9fd" stroke="#e5eaf3"/>
  <text x="492" y="1761" font-family="Inter, Arial, sans-serif" font-size="19" font-weight="650" fill="#748198">Расходники</text>
  <text x="492" y="1803" font-family="Inter, Arial, sans-serif" font-size="29" font-weight="800" fill="#26344c">+830,0 ₽</text>
  <rect x="832" y="1720" width="340" height="106" rx="20" fill="#eef9f4" stroke="#ccebdd"/>
  <text x="858" y="1761" font-family="Inter, Arial, sans-serif" font-size="19" font-weight="650" fill="#44836a">Налог 7%</text>
  <text x="858" y="1803" font-family="Inter, Arial, sans-serif" font-size="29" font-weight="800" fill="#17825f">+4 626,9 ₽</text>
  <rect x="1198" y="1686" width="502" height="174" rx="24" fill="#17233a"/>
  <text x="1232" y="1740" font-family="Inter, Arial, sans-serif" font-size="20" font-weight="650" fill="#aebbd1">ИТОГО К ВЫПЛАТЕ</text>
  <text x="1232" y="1809" font-family="Inter, Arial, sans-serif" font-size="44" font-weight="850" fill="#ffffff">40 993,5 ₽</text>
</svg>
`;

fs.writeFileSync(output, svg.trimStart());
console.log(`Generated ${output}`);
