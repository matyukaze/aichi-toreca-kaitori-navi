import Link from 'next/link';
export function Header(){return <header className="header"><div className="wrap"><div className="nav"><Link href="/" className="brand"><div className="logo">愛</div>愛知トレカ買取ナビ</Link><div className="navlinks"><Link href="/">公開サイト</Link><Link href="/prices">買取価格</Link><Link href="/dashboard">マイ資産</Link><Link href="/admin">管理/OCR</Link></div></div></div></header>}
