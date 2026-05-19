import {BuyPrice,Shop,UserItem} from './types';
function norm(v?:string|null){return (v||'').toLowerCase().replace(/\s/g,'')}
export function shopOf(shops:Shop[],id:string){return shops.find(s=>s.id===id)||{id:'unknown',name:'不明店舗',area:'不明'}}
export function bestPriceFor(item:Pick<UserItem,'card_name'|'card_number'>,prices:BuyPrice[]){const c=norm(item.card_name),n=norm(item.card_number); return prices.filter(p=>{const pc=norm(p.card_name),pn=norm(p.card_number); return pc.includes(c)||c.includes(pc)||(!!n&&pn===n)}).sort((a,b)=>b.price_yen-a.price_yen)[0]||null;}
export function calcPortfolio(items:UserItem[],prices:BuyPrice[]){let cost=0,value=0; for(const item of items){const qty=Number(item.quantity||0); cost+=Number(item.purchase_price_yen||0)*qty; const best=bestPriceFor(item,prices); value+=(best?Number(best.price_yen):0)*qty;} return {cost,value,profit:value-cost,count:items.reduce((s,i)=>s+Number(i.quantity||0),0)};}
