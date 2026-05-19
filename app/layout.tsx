import type {Metadata} from 'next'; import './globals.css'; import {Header} from '@/components/Header'; import {Tabs} from '@/components/Tabs'; import {Footer} from '@/components/Footer';
export const metadata:Metadata={title:'愛知トレカ買取ナビ | 愛知県のカード買取価格比較',description:'愛知県内のカードショップ買取価格を比較。大須・栄・名古屋駅・岡崎・安城・刈谷・豊田・豊橋エリアのポケカ、ワンピースカード、BOX買取価格を管理できます。'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="ja"><body><Header/><main className="main"><Tabs/><div className="wrap">{children}</div></main><Footer/></body></html>}
