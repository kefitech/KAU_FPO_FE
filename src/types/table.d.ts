import "@tanstack/react-table";

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData, TValue> {
    width?: string;
    /** Caps the header cell's width — a long label wraps onto more lines instead of widening the column. */
    headerMaxWidth?: string;
    hideOnMobile?: boolean;
  }
}
