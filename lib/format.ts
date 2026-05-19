export function yen(value:number|null|undefined){return Number(value||0).toLocaleString('ja-JP',{style:'currency',currency:'JPY',maximumFractionDigits:0});}
