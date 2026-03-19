// components/Table.tsx

"use client";

import { ReactNode } from "react";

export function TH({ children }: { children: ReactNode }) {
  return (
    <th
      style={{
        padding: "9px 14px",
        textAlign: "left",
        fontWeight: 600,
        color: "#64748b",
        fontSize: 12,
        borderBottom: "1px solid #e2e8f0",
        background: "#f8fafc",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </th>
  );
}

export function TD({
  children,
  style = {},
}: {
  children: ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <td
      style={{
        padding: "8px 14px",
        borderBottom: "1px solid #f1f5f9",
        fontSize: 13,
        ...style,
      }}
    >
      {children}
    </td>
  );
}

export function TableCard({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1.5px solid #e2e8f0",
        borderRadius: 12,
        overflow: "hidden",
        marginBottom: 16,
      }}
    >
      {children}
    </div>
  );
}

export function TableCardHeader({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        padding: "12px 18px",
        borderBottom: "1px solid #f1f5f9",
        fontWeight: 700,
        fontSize: 14,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      {children}
    </div>
  );
}
