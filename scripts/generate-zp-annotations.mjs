import fs from "node:fs";
import path from "node:path";

const assetsDir = path.resolve("assets/zp-2026-09-04");

const issues = [
  {
    number: "01",
    source: "zp-payroll.png",
    crop: { x: 0.2, y: 0.035, w: 0.68, h: 0.17 },
    callouts: [{
      targets: [{ x: 0.715, y: 0.055, w: 0.105, h: 0.055, dash: true }],
      lines: ["Добавить выбор налогового режима", "Два взаимоисключающих значения: 7% или 13%"],
    }],
  },
  {
    number: "02",
    source: "zp-payroll.png",
    crop: { x: 0.2, y: 0.37, w: 0.68, h: 0.28 },
    callouts: [{
      targets: [{ x: 0.225, y: 0.548, w: 0.62, h: 0.07 }],
      lines: ["Для режима 7% сохранить расчёт зарплаты", "Сжать 5 полей и добавить шестое «Налог» с +7%"],
    }],
  },
  {
    number: "03",
    source: "zp-payroll.png",
    crop: { x: 0.2, y: 0.37, w: 0.68, h: 0.28 },
    callouts: [{
      targets: [{ x: 0.66, y: 0.595, w: 0.185, h: 0.045 }],
      lines: ["В зарплатной ведомости показать «Налог 7%»", "Итоговая сумма включает зарплату и налог"],
    }],
  },
  {
    number: "04",
    source: "zp-payroll.png",
    crop: { x: 0.2, y: 0.035, w: 0.68, h: 0.61 },
    callouts: [{
      targets: [{ x: 0.625, y: 0.052, w: 0.09, h: 0.045 }],
      lines: ["При загрузке зарплаты в ПК", "налог 7% создавать отдельным платежом"],
    }],
  },
  {
    number: "05",
    source: "zp-payroll.png",
    crop: { x: 0.2, y: 0.37, w: 0.68, h: 0.28 },
    callouts: [{
      targets: [{ x: 0.225, y: 0.548, w: 0.62, h: 0.09 }],
      lines: ["Для режима 13% поле называется «НДФЛ»", "Показывать −13% и сумму со знаком минус"],
    }],
  },
  {
    number: "06",
    source: "zp-payroll.png",
    crop: { x: 0.2, y: 0.035, w: 0.68, h: 0.61 },
    callouts: [{
      targets: [
        { x: 0.625, y: 0.052, w: 0.09, h: 0.045 },
        { x: 0.66, y: 0.595, w: 0.185, h: 0.045 },
      ],
      lines: ["В ПК передавать чистую зарплату за минусом 13%", "НДФЛ 13% создавать отдельным платежом"],
    }],
  },
];

function pngSize(filePath) {
  const header = fs.readFileSync(filePath).subarray(0, 24);
  if (header.toString("ascii", 1, 4) !== "PNG") throw new Error(`Not a PNG: ${filePath}`);
  return { width: header.readUInt32BE(16), height: header.readUInt32BE(20) };
}

function esc(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function px(value, size) {
  return Math.round(value * size);
}

function renderIssue(issue) {
  const sourcePath = path.join(assetsDir, issue.source);
  const { width, height } = pngSize(sourcePath);
  const sourceData = `data:image/png;base64,${fs.readFileSync(sourcePath).toString("base64")}`;
  const crop = issue.crop;
  const cropX = px(crop.x, width);
  const cropY = px(crop.y, height);
  const cropWidth = px(crop.w, width);
  const cropHeight = px(crop.h, height);
  const footer = Math.max(260, Math.min(460, Math.round(cropHeight * 0.42)));
  const outputWidth = cropWidth;
  const outputHeight = cropHeight + footer;
  const stroke = Math.max(5, Math.min(18, Math.round(outputWidth * 0.0045)));
  const font = Math.max(28, Math.min(72, Math.round(outputWidth * 0.022)));
  const bubbleRadius = Math.max(24, Math.round(font * 0.85));
  const pad = Math.max(28, Math.round(outputWidth * 0.018));
  const gap = Math.max(20, Math.round(outputWidth * 0.012));
  const color = "#d85656";
  const shapes = [];

  issue.callouts.forEach((callout, calloutIndex) => {
    const boxWidth = Math.round((outputWidth - pad * 2 - gap * (issue.callouts.length - 1)) / issue.callouts.length);
    const boxHeight = Math.round(footer * 0.7);
    const boxX = pad + calloutIndex * (boxWidth + gap);
    const boxY = cropHeight + Math.round(footer * 0.15);
    const boxCenterX = boxX + boxWidth / 2;

    callout.targets.forEach((target) => {
      const x = px(target.x, width) - cropX;
      const y = px(target.y, height) - cropY;
      const w = px(target.w, width);
      const h = px(target.h, height);
      const bubbleX = Math.min(cropWidth - bubbleRadius - stroke, Math.max(bubbleRadius + stroke, x + w));
      const bubbleY = Math.min(cropHeight - bubbleRadius - stroke, Math.max(bubbleRadius + stroke, y));
      shapes.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${Math.max(10, stroke * 2)}" fill="#ffefef" fill-opacity="0.18" stroke="${color}" stroke-width="${stroke}"${target.dash ? ` stroke-dasharray="${stroke * 3} ${stroke * 2}"` : ""} clip-path="url(#screenshot-clip)"/>`);
      shapes.push(`<path d="M ${bubbleX} ${bubbleY + bubbleRadius} L ${boxCenterX} ${boxY}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round"/>`);
      shapes.push(`<circle cx="${bubbleX}" cy="${bubbleY}" r="${bubbleRadius}" fill="${color}" stroke="#ffffff" stroke-width="${Math.max(3, Math.round(stroke * 0.5))}"/>`);
      shapes.push(`<text x="${bubbleX}" y="${bubbleY + Math.round(font * 0.34)}" text-anchor="middle" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="${font}" font-weight="800">${esc(issue.number)}</text>`);
    });

    shapes.push(`<rect x="${boxX}" y="${boxY}" width="${boxWidth}" height="${boxHeight}" rx="${Math.max(16, stroke * 3)}" fill="#fffafa" stroke="${color}" stroke-width="${stroke}"/>`);
    const longestLine = Math.max(...callout.lines.map((line) => line.length));
    const labelFont = Math.max(20, Math.min(font, Math.floor((boxWidth - pad) / Math.max(1, longestLine * 0.58)), Math.floor(boxHeight / (callout.lines.length * 1.55))));
    const lineHeight = Math.round(labelFont * 1.34);
    const totalTextHeight = callout.lines.length * lineHeight;
    const firstBaseline = boxY + (boxHeight - totalTextHeight) / 2 + labelFont;
    const tspans = callout.lines.map((line, lineIndex) => `<tspan x="${boxCenterX}" dy="${lineIndex === 0 ? 0 : lineHeight}">${esc(line)}</tspan>`).join("");
    shapes.push(`<text x="${boxCenterX}" y="${Math.round(firstBaseline)}" text-anchor="middle" fill="#1b2435" font-family="Arial, Helvetica, sans-serif" font-size="${labelFont}" font-weight="700">${tspans}</text>`);
  });

  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${outputWidth}" height="${outputHeight}" viewBox="0 0 ${outputWidth} ${outputHeight}">`,
    `<defs><clipPath id="screenshot-clip"><rect x="0" y="0" width="${cropWidth}" height="${cropHeight}"/></clipPath></defs>`,
    `<rect width="${outputWidth}" height="${outputHeight}" fill="#f4f7fc"/>`,
    `<image href="${sourceData}" x="${-cropX}" y="${-cropY}" width="${width}" height="${height}" clip-path="url(#screenshot-clip)"/>`,
    `<rect x="0" y="${cropHeight}" width="${outputWidth}" height="${footer}" fill="#f8faff"/>`,
    ...shapes,
    `</svg>`,
    "",
  ].join("\n");

  const output = path.join(assetsDir, `annotated-${issue.number}.svg`);
  fs.writeFileSync(output, svg);
  return { number: issue.number, width: outputWidth, height: outputHeight };
}

const results = issues.map(renderIssue);
console.log(`Generated ${results.length} ZP annotation files.`);
results.forEach((result) => console.log(`${result.number}: ${result.width}x${result.height}`));
