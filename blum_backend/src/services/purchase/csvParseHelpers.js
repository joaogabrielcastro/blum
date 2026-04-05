function getValueByHeader(headers, values, possibleHeaders) {
  for (const header of possibleHeaders) {
    const index = headers.indexOf(header);
    if (index !== -1 && values[index]) {
      return values[index].trim();
    }
  }
  return "";
}

function parseCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current);
  return result.map((val) => val.replace(/^"|"$/g, "").trim());
}

module.exports = { getValueByHeader, parseCsvLine };
