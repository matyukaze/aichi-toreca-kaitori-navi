import Link from "next/link";

const tabs = [
  { href: "/", label: "トップ" },
  { href: "/prices", label: "買取価格" },
  { href: "/stores", label: "店舗別" },
  { href: "/cards", label: "カード別SEO" },
  { href: "/dashboard", label: "マイ資産" }
];

export function Tabs() {
  return (
    <nav className="tabs">
      {tabs.map((tab) => (
        <Link key={tab.href} href={tab.href}>
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}