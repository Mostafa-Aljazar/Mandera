export interface ExportColumnDef<TRow, TCtx> {
  key: string;
  getHeader: (ctx: TCtx) => string;
  defaultSelected: boolean;
  getValue: (row: TRow, ctx: TCtx) => string;
}
