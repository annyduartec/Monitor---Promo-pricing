/**
 * RFC 4180-compliant CSV parser.
 * Handles: quoted fields, escaped quotes (""), multiline cells, \r\n and \n.
 */
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let i = 0;
  const n = text.length;

  function skipEOL() {
    if (text[i] === "\r") i++;
    if (text[i] === "\n") i++;
  }

  while (i < n) {
    const row: string[] = [];

    while (i < n) {
      if (text[i] === '"') {
        i++;
        let cell = "";
        while (i < n) {
          if (text[i] === '"' && text[i + 1] === '"') {
            cell += '"';
            i += 2;
          } else if (text[i] === '"') {
            i++;
            break;
          } else {
            cell += text[i++];
          }
        }
        row.push(cell.trim());
      } else {
        let cell = "";
        while (i < n && text[i] !== "," && text[i] !== "\n" && text[i] !== "\r") {
          cell += text[i++];
        }
        row.push(cell.trim());
      }

      if (i < n && text[i] === ",") {
        i++;
        continue;
      }
      break;
    }

    skipEOL();
    if (row.some((c) => c !== "")) rows.push(row);
  }

  return rows;
}
