// components/DealLink.tsx

"use client";

import { dealUrl } from "@/lib/deals";

interface DealLinkProps {
  id: string;
  name: string;
}

export default function DealLink({ id, name }: DealLinkProps) {
  return (
    <a
      href={dealUrl(id)}
      target="_blank"
      rel="noopener noreferrer"
      style={{ color: "#2563eb", textDecoration: "none", fontWeight: 500 }}
      onMouseEnter={e => (e.currentTarget.style.textDecoration = "underline")}
      onMouseLeave={e => (e.currentTarget.style.textDecoration = "none")}
    >
      {name}
    </a>
  );
}
