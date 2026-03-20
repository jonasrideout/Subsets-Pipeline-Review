// components/Table.tsx

"use client";

import { ReactNode } from "react";

export function TH({ children }: { children: ReactNode }) {
  return (
    <th style={{
      padding: "10px 16px",
      textAlign: "left",
      fontSize: 10,
      fontWeight: 700,
      color: "#9ca3af",
      letterSpacing: "0.06em",
      textTransform: "uppercase",
      borderBottom: "2px solid #f0f1f5",
      background: "#fafbfc",
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
      padding: "12px 16px",
      fontSize: 13,
      fontFamily: "'DM Sans', system-ui, sans-serif",
      fontWeight: 300,
      color: "#0f1117",
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
      border: "1px solid #e2e4ed",
      borderRadius: 16,
      overflow: "hidden",
      marginBottom: 16,
      boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
    }}>
      {children}
    </div>
  );
}

export function TableCardHeader({ children }: { children: ReactNode }) {
  return (
    <div style={{
      padding: "14px 20px",
      borderBottom: "1px solid #f0f1f5",
      fontWeight: 700,
      fontSize: 14,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      color: "#0f1117",
      background: "#fafbfc",
    }}>
      {children}
    </div>
  );
}
