// components/Table.tsx

"use client";

import { ReactNode } from "react";

export function TH({ children }: { children: ReactNode }) {
  return (
    <th style={{
      padding: "10px 16px",
      textAlign: "left",
      fontWeight: 600,
      color: "#94a3b8",
      fontSize: 11,
      letterSpacing: "0.05em",
      textTransform: "uppercase",
      borderBottom: "1px solid rgba(99,102,241,0.08)",
      background: "#f8fafc",
      whiteSpace: "nowrap",
    }}>
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
    <td style={{
      padding: "14px 16px",
      borderBottom: "1px solid #f1f5f9",
      fontSize: 13,
      color: "#0f172a",
      verticalAlign: "middle",
      ...style,
    }}>
      {children}
    </td>
  );
}

export function TableCard({ children }: { children: ReactNode }) {
  return (
    <div style={{
      background: "#ffffff",
      border: "1px solid rgba(99,102,241,0.1)",
      borderRadius: 16,
      overflow: "hidden",
      marginBottom: 16,
      boxShadow: "0 1px 3px rgba(15,10,46,0.06)",
    }}>
      {children}
    </div>
  );
}

export function TableCardHeader({ children }: { children: ReactNode }) {
  return (
    <div style={{
      padding: "14px 18px",
      borderBottom: "1px solid rgba(99,102,241,0.08)",
      fontWeight: 700,
      fontSize: 14,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      color: "#0f172a",
    }}>
      {children}
    </div>
  );
}
