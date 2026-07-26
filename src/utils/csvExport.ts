type CsvColumn<T> = keyof T | ((row: T) => unknown);

export const generateCSV = <T extends object>(
  data: T[],
  columns: CsvColumn<T>[],
  headers: string[]
) => {
  const escapeCsv = (str: unknown) => {
    if (str === null || str === undefined) return '""';
    return `"${String(str).replace(/"/g, '""')}"`;
  };

  const headerRow = headers.map(escapeCsv).join(',');

  const dataRows = data.map(row => {
    return columns.map(col => {
      let val = typeof col === 'function' ? col(row) : row[col];
      if (val === null || val === undefined) val = '';
      return escapeCsv(val);
    }).join(',');
  });

  return [headerRow, ...dataRows].join('\n');
};

export const downloadCSV = (csvContent: string, filename: string) => {
  // Add BOM for UTF-8 to ensure Excel renders Arabic characters correctly
  const bom = '\uFEFF';
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
  
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up
    URL.revokeObjectURL(url);
  }
};