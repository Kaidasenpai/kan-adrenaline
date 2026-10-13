// Minimal declarations for the Node 24 SQLite API used by this dependency-free
// integration. The parent app currently supplies older Node type declarations.
declare module "node:sqlite" {
  type SQLInputValue = null | number | bigint | string | NodeJS.ArrayBufferView;
  type SQLOutputValue = null | number | bigint | string | Uint8Array;
  interface StatementSync {
    run(...values: SQLInputValue[]): {
      changes: number | bigint;
      lastInsertRowid: number | bigint;
    };
    get(...values: SQLInputValue[]): Record<string, SQLOutputValue> | undefined;
  }
  export class DatabaseSync {
    constructor(path: string);
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
    close(): void;
  }
}
