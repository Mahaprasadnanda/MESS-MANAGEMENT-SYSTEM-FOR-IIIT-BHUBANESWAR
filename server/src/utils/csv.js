function escapeCsvCell(value) {
  if (value === null || value === undefined) return '';
  let str = String(value);
  // Mitigate CSV formula injection in spreadsheet tools
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildCsv(headers, rows) {
  const headerLine = headers.map((h) => escapeCsvCell(h.label)).join(',');
  const lines = rows.map((row) =>
    headers.map((h) => escapeCsvCell(row[h.key])).join(',')
  );
  return [headerLine, ...lines].join('\r\n');
}

module.exports = {
  escapeCsvCell,
  buildCsv,
};
