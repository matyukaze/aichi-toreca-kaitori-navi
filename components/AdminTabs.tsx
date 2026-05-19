import Link from "next/link";

const adminTabs = [
  { href: "/admin", label: "管理/OCR" },
  { href: "/admin/queue", label: "X投稿キュー" },
  { href: "/admin/cards", label: "カードマスター" },
  { href: "/admin/shops", label: "店舗管理" }
];

export function AdminTabs() {
  return (
    <nav className="tabs" style={{ marginTop: 12 }}>
      {adminTabs.map((tab) => (
        <Link key={tab.href} href={tab.href}>
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}