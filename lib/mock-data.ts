import {BuyPrice,Shop,UserItem} from './types';
const today=new Date().toISOString().slice(0,10);
export const mockShops:Shop[]=[
{id:'magiNagoya',name:'magi名古屋PARCO店',area:'大須・栄',x_handle:'@magiNagoya',priority:true,valid_default:'当日限り',genres:['ポケカ','ワンピース','遊戯王']},
{id:'osuA',name:'大須サンプルカード店',area:'大須・栄',x_handle:'@sample_osu',priority:false,valid_default:'7日間',genres:['ポケカ','BOX']},
{id:'okazakiA',name:'岡崎サンプルトレカ',area:'岡崎',x_handle:'@sample_okazaki',priority:false,valid_default:'7日間',genres:['ポケカ','ワンピース']},
{id:'anjoA',name:'安城・刈谷サンプル店',area:'安城・刈谷',x_handle:'@sample_anjo',priority:false,valid_default:'7日間',genres:['ポケカ','ユニアリ']}];
export const mockPrices:BuyPrice[]=[
{id:'p1',card_name:'ナンジャモ SAR',card_number:'350/190',tcg_type:'ポケカ',shop_id:'magiNagoya',price_yen:55000,source:'公式X想定',published_at:today,valid_label:'本日限り'},
{id:'p2',card_name:'リーリエの決心 SAR',card_number:'091/063',tcg_type:'ポケカ',shop_id:'magiNagoya',price_yen:1400000,source:'公式X想定',published_at:today,valid_label:'本日限り'},
{id:'p3',card_name:'ゲッコウガex SAR',card_number:'090/066',tcg_type:'ポケカ',shop_id:'okazakiA',price_yen:13000,source:'店舗買取表',published_at:today,valid_label:'7日間'},
{id:'p4',card_name:'モンキー・D・ルフィ SEC',card_number:'OP05-119',tcg_type:'ワンピース',shop_id:'magiNagoya',price_yen:85000,source:'公式X想定',published_at:today,valid_label:'本日限り'},
{id:'p5',card_name:'ポケモンカード 151 BOX',card_number:'BOX',tcg_type:'BOX',shop_id:'osuA',price_yen:18500,source:'店舗買取表',published_at:today,valid_label:'7日間'}];
export const mockItems:UserItem[]=[
{id:'i1',card_name:'ナンジャモ SAR',card_number:'350/190',quantity:1,purchase_price_yen:42000},
{id:'i2',card_name:'ゲッコウガex SAR',card_number:'090/066',quantity:2,purchase_price_yen:9000},
{id:'i3',card_name:'ポケモンカード 151 BOX',card_number:'BOX',quantity:1,purchase_price_yen:5800}];
