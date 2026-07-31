-- Sales Agent PDF: client investment unit field (وحدة استثمارية).

alter table clients
  add column if not exists investment_unit text;
