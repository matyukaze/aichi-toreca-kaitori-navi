import Link from 'next/link';
export function Footer(){return <footer className="footer"><div className="wrap"><div><strong>愛知トレカ買取ナビ</strong><div className="mini">愛知県カード買取価格比較サイト 本番前プロトタイプ</div></div><div className="mini" style={{display:'flex',gap:12,flexWrap:'wrap'}}><Link href="/policy">利用規約</Link><Link href="/policy">プライバシーポリシー</Link><Link href="/policy">お問い合わせ</Link></div></div></footer>}
