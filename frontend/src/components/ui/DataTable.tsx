import type { ReactNode } from "react";
import { EmptyState } from "./EmptyState";

export interface Column<T> {
  key: string;
  header: string;
  cell: (item: T) => ReactNode;
}
export function DataTable<T extends { id: string }>({
  caption,
  columns,
  rows,
  loading,
  emptyTitle,
}: {
  caption: string;
  columns: Column<T>[];
  rows: T[];
  loading: boolean;
  emptyTitle: string;
}) {
  return (
    <div className="table-scroll" aria-busy={loading}>
      <table>
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th scope="col" key={column.key}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((item) => (
            <tr
              key={item.id}
              className="hover:bg-dexa-bg focus-within:bg-dexa-bg"
            >
              {columns.map((column) => (
                <td key={column.key}>{column.cell(item)}</td>
              ))}
            </tr>
          ))}
          {!loading && rows.length === 0 && (
            <tr>
              <td colSpan={columns.length}>
                <EmptyState title={emptyTitle} />
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
