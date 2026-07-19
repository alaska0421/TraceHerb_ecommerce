"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";

type Product = { id:number; name:string; category:string; origin:string; price:number; stock:number; sales:number; rating:number; traceCode:string; badge:string; description:string; icon:string };
type CartLine = Product & { qty:number };
type Toast = { text:string; kind?:"ok"|"warn" };
type Role = "buyer"|"seller"|"admin";
type User = { id:number; username:string; email:string; phone:string; points:number; role:Role };
type OrderItem = { id:number; name:string; price:number; qty:number };
type Order = { id:string; items:OrderItem[]; amount:number; status:string; time:string; paymentMethod?:string; transactionId?:string; shippedAt?:string; completedAt?:string };
type PaymentMethod = "alipay_sandbox"|"wechat_mock";

const fallbackProducts: Product[] = [
  { id:1,name:"宁夏特级枸杞",category:"药食同源",origin:"宁夏 · 中宁",price:68,stock:238,sales:1260,rating:4.9,traceCode:"TH-NX-20260701",badge:"一物一码",description:"大果薄皮，低温锁鲜，第三方农残检测合格",icon:"杞" },
  { id:2,name:"岷县当归片",category:"滋补药材",origin:"甘肃 · 岷县",price:89,stock:86,sales:860,rating:4.8,traceCode:"TH-GS-20260618",badge:"产地直采",description:"头片精选，香气浓郁，全链路产地溯源",icon:"归" },
  { id:3,name:"新会陈皮八年藏",category:"养生茶饮",origin:"广东 · 新会",price:128,stock:62,sales:536,rating:4.9,traceCode:"TH-GD-20260408",badge:"年份认证",description:"核心产区，干仓陈化，年份与仓储双认证",icon:"陈" },
  { id:4,name:"古法艾草足浴包",category:"手作养生",origin:"湖北 · 蕲春",price:39.9,stock:310,sales:2180,rating:4.7,traceCode:"TH-HB-20260708",badge:"匠心手作",description:"蕲艾、老姜、花椒科学配伍，独立便携装",icon:"艾" },
  { id:5,name:"云南三七超细粉",category:"滋补药材",origin:"云南 · 文山",price:158,stock:45,sales:402,rating:4.8,traceCode:"TH-YN-20260521",badge:"权威质检",description:"20头春三七，低温破壁，批次检验可查",icon:"七" },
  { id:6,name:"桂圆红枣养生茶",category:"养生茶饮",origin:"福建 · 莆田",price:45,stock:188,sales:932,rating:4.6,traceCode:"TH-FJ-20260710",badge:"配方公开",description:"0香精0色素，独立三角包，办公室轻养生",icon:"茶" },
  { id:7,name:"长白山五年人参",category:"滋补药材",origin:"吉林 · 长白山",price:198,stock:52,sales:368,rating:4.9,traceCode:"TH-JL-20260712",badge:"林下参认证",description:"五年参龄，参体完整，低温干燥保留自然参香",icon:"参" },
  { id:8,name:"桐乡胎菊精选",category:"养生茶饮",origin:"浙江 · 桐乡",price:49,stock:260,sales:1186,rating:4.8,traceCode:"TH-ZJ-20260703",badge:"头采花蕾",description:"头茬花蕾颗颗饱满，汤色清亮，清香自然",icon:"菊" },
  { id:9,name:"温县铁棍山药片",category:"药食同源",origin:"河南 · 温县",price:58,stock:176,sales:754,rating:4.7,traceCode:"TH-HN-20260626",badge:"道地产区",description:"垆土地铁棍山药，低温烘干，粉糯清甜",icon:"药" },
  { id:10,name:"川贝母精选粒",category:"滋补药材",origin:"四川 · 阿坝",price:268,stock:38,sales:206,rating:4.9,traceCode:"TH-SC-20260516",badge:"人工精选",description:"颗粒均匀、质地坚实，每批次含量检测",icon:"贝" },
  { id:11,name:"陇西黄芪片",category:"滋补药材",origin:"甘肃 · 陇西",price:76,stock:142,sales:685,rating:4.8,traceCode:"TH-GS-20260629",badge:"核心产区",description:"绵芪切片，菊花心明显，甘香自然",icon:"芪" },
  { id:12,name:"封丘金银花",category:"养生茶饮",origin:"河南 · 封丘",price:69,stock:120,sales:594,rating:4.7,traceCode:"TH-HN-20260706",badge:"晨采锁鲜",description:"花蕾完整，晨采低温烘制，清香不焦",icon:"花" },
  { id:13,name:"建宁通芯白莲",category:"药食同源",origin:"福建 · 建宁",price:72,stock:205,sales:812,rating:4.8,traceCode:"TH-FJ-20260622",badge:"手工通芯",description:"颗粒圆润，手工通芯，炖煮软糯清香",icon:"莲" },
  { id:14,name:"云南茯苓丁",category:"药食同源",origin:"云南 · 普洱",price:65,stock:164,sales:477,rating:4.7,traceCode:"TH-YN-20260612",badge:"洁净切制",description:"松根茯苓洁净切丁，色白质实，易煮易搭配",icon:"苓" },
  { id:15,name:"永福罗汉果",category:"养生茶饮",origin:"广西 · 桂林",price:42,stock:228,sales:1064,rating:4.8,traceCode:"TH-GX-20260702",badge:"低温脱水",description:"果形完整，低温脱水，泡饮甘甜无焦苦",icon:"罗" },
  { id:16,name:"新疆黑桑葚干",category:"药食同源",origin:"新疆 · 吐鲁番",price:55,stock:190,sales:983,rating:4.7,traceCode:"TH-XJ-20260709",badge:"自然成熟",description:"成熟黑桑葚低温烘干，果肉饱满，酸甜适口",icon:"桑" },
  { id:17,name:"霍山铁皮石斛",category:"滋补药材",origin:"安徽 · 霍山",price:238,stock:34,sales:172,rating:4.9,traceCode:"TH-AH-20260508",badge:"基地认证",description:"仿野生种植，鲜条低温加工，胶质丰富",icon:"斛" },
  { id:18,name:"广西炒决明子",category:"养生茶饮",origin:"广西 · 百色",price:36,stock:286,sales:1245,rating:4.6,traceCode:"TH-GX-20260711",badge:"古法轻炒",description:"颗粒饱满，轻火炒制，焦香柔和适合日常泡饮",icon:"明" },
];

const traceSteps = ["基地种植","采收初检","洁净加工","权威质检","仓储入库","平台发货"];

export default function Home() {
  const [view,setView] = useState<"shop"|"points"|"merchant"|"admin"|"orders">("shop");
  const [products,setProducts] = useState<Product[]>(fallbackProducts);
  const [cart,setCart] = useState<CartLine[]>([]);
  const [query,setQuery] = useState("");
  const [category,setCategory] = useState("全部");
  const [trace,setTrace] = useState<Product|null>(null);
  const [cartOpen,setCartOpen] = useState(false);
  const [checkout,setCheckout] = useState(false);
  const [points,setPoints] = useState(2680);
  const [checked,setChecked] = useState(false);
  const [toast,setToast] = useState<Toast|null>(null);
  const [orders,setOrders] = useState<Order[]>([]);
  const [orderFilter,setOrderFilter] = useState("全部订单");
  const [payMethod,setPayMethod] = useState<PaymentMethod>("alipay_sandbox");
  const [paying,setPaying] = useState(false);
  const [user,setUser] = useState<User|null>(null);
  const [authOpen,setAuthOpen] = useState(false);
  const [authMode,setAuthMode] = useState<"login"|"register">("login");

  useEffect(()=>{ fetch("/api/products").then(r=>r.ok?r.json():null).then(d=>d?.length&&setProducts(d)).catch(()=>{}); },[]);
  useEffect(()=>{ fetch("/api/auth/me").then(r=>r.json()).then(d=>{if(d.user){setUser(d.user);setPoints(d.user.points||0);setView(d.user.role==="seller"?"merchant":d.user.role==="admin"?"admin":"shop");if(d.user.role==="buyer")fetch("/api/checkin").then(r=>r.json()).then(s=>{setChecked(!!s.checked);setPoints(s.points??d.user.points??0)}).catch(()=>{})}}).catch(()=>{}); },[]);
  useEffect(()=>{if(user?.role==="buyer")fetch("/api/orders").then(r=>r.ok?r.json():[]).then((rows:{id:string;amount:number;items:OrderItem[];status:string;createdAt:string;paymentMethod?:string;transactionId?:string;shippedAt?:string;completedAt?:string}[])=>setOrders(rows.map(o=>({id:o.id,items:o.items,amount:o.amount,status:o.status,time:new Date(o.createdAt).toLocaleString("zh-CN"),paymentMethod:o.paymentMethod,transactionId:o.transactionId,shippedAt:o.shippedAt,completedAt:o.completedAt})))).catch(()=>{})},[user]);
  useEffect(()=>{const code=new URLSearchParams(window.location.search).get("trace");if(code){const product=products.find(p=>p.traceCode===code);if(product)queueMicrotask(()=>setTrace(product))}},[products]);
  const filtered = useMemo(()=>products.filter(p=>(category==="全部"||p.category===category)&&(p.name+p.origin).includes(query)),[products,category,query]);
  const total = cart.reduce((s,x)=>s+x.price*x.qty,0);
  const notify=(text:string,kind:"ok"|"warn"="ok")=>{setToast({text,kind});setTimeout(()=>setToast(null),2200)};
  const add=(p:Product)=>{setCart(c=>{const hit=c.find(x=>x.id===p.id);return hit?c.map(x=>x.id===p.id?{...x,qty:x.qty+1}:x):[...c,{...p,qty:1}]});notify(`${p.name} 已加入购物车`)};
  const placeOrder=async()=>{
    if(!cart.length||paying)return;
    setPaying(true);
    const id=`TH${Date.now().toString().slice(-11)}`;
    try{
      const res=await fetch("/api/payments/sandbox",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({orderId:id,amount:+total.toFixed(2),items:cart,method:payMethod})});
      const data=await res.json();
      if(!res.ok)throw new Error(data.error||"沙箱支付失败");
      setOrders(o=>[{id,items:cart.map(({id,name,price,qty})=>({id,name,price,qty})),amount:+total.toFixed(2),status:"待发货",time:new Date(data.paidAt).toLocaleString("zh-CN"),paymentMethod:payMethod,transactionId:data.transactionId},...o]);
      setPoints(data.points);
      setCart([]);setCheckout(false);setCartOpen(false);setView("orders");
      notify(`${payMethod==="alipay_sandbox"?"支付宝沙箱":"微信模拟"}支付成功，积分已到账`);
    }catch(e){notify(e instanceof Error?e.message:"沙箱支付失败，请稍后重试","warn")}finally{setPaying(false)}
  };
  const checkin=async()=>{if(checked)return notify("今天已经签到过啦","warn");try{const res=await fetch("/api/checkin",{method:"POST"});const data=await res.json();if(!res.ok)return notify(data.error||"签到失败，请稍后重试","warn");setChecked(true);setPoints(data.points);notify(data.alreadyChecked?"今天已经签到过啦":"签到成功，20 积分已存入账户",data.alreadyChecked?"warn":"ok")}catch{notify("签到失败，请检查网络后重试","warn")}};
  const redeem=(cost:number,name:string)=>{if(points<cost)return notify("积分不足","warn");setPoints(p=>p-cost);notify(`已兑换：${name}`)};
  const requireAuth=(action:()=>void)=>{if(user)return action();setAuthMode("login");setAuthOpen(true);notify("请先登录后继续","warn")};
  const logout=async()=>{await fetch("/api/auth/logout",{method:"POST"});setUser(null);setChecked(false);setPoints(0);setView("shop");setAuthOpen(false);notify("已安全退出登录")};
  const receiveOrder=async(orderId:string)=>{const res=await fetch(`/api/orders/${encodeURIComponent(orderId)}`,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({action:"receive"})});const data=await res.json();if(!res.ok)return notify(data.error||"确认收货失败","warn");setOrders(rows=>rows.map(o=>o.id===orderId?{...o,status:"已完成",completedAt:data.completedAt}:o));notify("已确认收货，订单已完成")};
  const visibleOrders=orders.filter(o=>orderFilter==="全部订单"||o.status===orderFilter);

  return <main>
    {toast&&<div className={`toast ${toast.kind}`}>{toast.kind==="warn"?"!":"✓"} {toast.text}</div>}
    <header>
      <button className="brand" onClick={()=>setView("shop")}><span>草</span><div>迹本草<small>TRACEHERB</small></div></button>
      <nav>{(user?.role==="seller"?[["merchant","商家中心"]]:user?.role==="admin"?[["admin","运营中心"]]:[["shop","本草集市"],["points","健康积分"],["orders","我的订单"]]).map(([k,v])=><button key={k} className={view===k?"active":""} onClick={()=>k==="points"||k==="orders"?requireAuth(()=>setView(k as typeof view)):setView(k as typeof view)}>{v}</button>)}</nav>
      <div className="head-actions">{(!user||user.role==="buyer")&&<><button className="points-pill" onClick={()=>requireAuth(()=>setView("points"))}>叶 {points}</button><button className="cart-btn" onClick={()=>setCartOpen(true)}>购物袋 <b>{cart.reduce((s,x)=>s+x.qty,0)}</b></button></>}{user?<button className="account-btn" onClick={()=>setAuthOpen(true)}><span className="avatar">{user.username.slice(0,1)}</span><span>{user.username} · {user.role==="buyer"?"买家":user.role==="seller"?"卖家":"管理员"}</span></button>:<button className="login-btn" onClick={()=>{setAuthMode("login");setAuthOpen(true)}}>登录 / 注册</button>}</div>
    </header>

    {view==="shop"&&<>
      <section className="hero">
        <div><p className="eyebrow">每一味本草，都有来处</p><h1>寻真本草<br/><em>养一方身心</em></h1><p className="hero-copy">严选道地产区与可信商家，以数字溯源记录从田间到手心的每一步。</p><div className="hero-actions"><button className="primary" onClick={()=>document.getElementById("market")?.scrollIntoView({behavior:"smooth"})}>探索本草</button><button className="ghost" onClick={()=>setTrace(products[0])}>体验溯源查询</button></div><div className="proof"><span><b>100%</b> 商品溯源覆盖</span><span><b>32</b> 道地产区</span><span><b>18,600+</b> 安心用户</span></div></div>
        <div className="hero-art"><div className="sun"/><div className="mountain m1"/><div className="mountain m2"/><div className="jar"><span>本草</span></div><i className="leaf l1">❧</i><i className="leaf l2">❧</i><div className="seal">一物<br/>一码</div></div>
      </section>
      <section className="trust-strip"><span>◈ 国家产地标识</span><span>⌁ 全链路数字溯源</span><span>✓ 第三方质检</span><span>♧ 会员积分权益</span></section>
      <section id="market" className="market section">
        <div className="section-head"><div><p className="eyebrow">SEASONAL SELECTION</p><h2>顺时而养 · 本周严选</h2></div><div className="search"><input aria-label="搜索商品" placeholder="搜索药材、产地…" value={query} onChange={e=>setQuery(e.target.value)}/><button>⌕</button></div></div>
        <div className="filters">{["全部","药食同源","滋补药材","养生茶饮","手作养生"].map(x=><button className={category===x?"on":""} onClick={()=>setCategory(x)} key={x}>{x}</button>)}</div>
        <div className="product-grid">{filtered.map(p=><article className="product-card" key={p.id}>
          <div className={`product-visual ${p.id>=1&&p.id<=18?"has-photo":`tone${p.id}`}`} style={p.id>=1&&p.id<=18?{"--photo-col":(p.id-1)%6,"--photo-row":Math.floor((p.id-1)/6)} as React.CSSProperties:undefined}><span>{p.icon}</span><b>{p.badge}</b></div>
          <div className="product-info"><small>{p.origin}</small><h3>{p.name}</h3><p>{p.description}</p><div className="rating">★★★★★ <span>{p.rating} · 已售 {p.sales}</span></div><div className="price"><strong>¥{p.price}</strong><div><button className="trace-btn" onClick={()=>setTrace(p)}>查溯源</button><button className="add-btn" onClick={()=>add(p)}>＋</button></div></div></div>
        </article>)}</div>
      </section>
      <section className="trace-story section"><div className="trace-ink">溯</div><div><p className="eyebrow">DIGITAL TRACEABILITY</p><h2>一码寻源，真材实证</h2><p>每件商品绑定唯一数字身份。产地、加工、检测、仓储与流通记录清晰可查，让信任有据可依。</p><button className="primary" onClick={()=>setTrace(products[2])}>立即体验溯源</button></div><ol>{traceSteps.map((x,i)=><li key={x}><b>0{i+1}</b><span>{x}</span></li>)}</ol></section>
    </>}

    {view==="points"&&<section className="dashboard section"><div className="page-title"><p className="eyebrow">HEALTH REWARDS</p><h1>健康积分</h1><p>每一次健康选择，都值得被奖励。</p></div><div className="points-hero"><div><small>可用积分</small><strong>{points}</strong><p>白露会员 · 距下一等级还差 820 积分</p><div className="progress"><i style={{width:"72%"}}/></div></div><button onClick={checkin} className={checked?"done":""}><b>{checked?"已签到":"+20"}</b><span>{checked?"明天再来":"今日签到"}</span></button></div><h2>积分任务</h2><div className="task-grid">{[["每日浏览","浏览 3 件溯源商品","+10"],["完成评价","分享真实使用体验","+50"],["健康分享","邀请好友探索本草","+30"]].map(x=><article key={x[0]}><span>✦</span><div><h3>{x[0]}</h3><p>{x[1]}</p></div><button onClick={()=>notify(`${x[0]}任务已领取`)}>{x[2]}</button></article>)}</div><h2>积分好礼</h2><div className="reward-grid">{[[500,"¥5 订单抵扣券","coupon"],[1200,"古法艾草足浴包","footbath"],[2000,"一对一养生咨询","consult"]].map(x=><article key={x[1] as string}><div className={`reward-image ${x[2]}`}><span>{x[2]==="coupon"?"¥5":x[2]==="consult"?"养":"艾"}</span></div><h3>{x[1]}</h3><p>{x[0]} 积分</p><button onClick={()=>redeem(x[0] as number,x[1] as string)}>立即兑换</button></article>)}</div></section>}

    {view==="orders"&&(user?<section className="dashboard section"><div className="page-title"><p className="eyebrow">MY ORDERS</p><h1>我的订单</h1><p>按订单状态查看支付、发货与收货进度。</p></div><div className="tabs">{["全部订单","待付款","待发货","已发货","已完成"].map(tab=><button key={tab} className={orderFilter===tab?"on":""} onClick={()=>setOrderFilter(tab)}>{tab}</button>)}</div><div className="orders">{visibleOrders.map(o=><article key={o.id}><div><small>订单号 {o.id} · {o.time}</small><h3>{o.items.map(x=>`${x.name} × ${x.qty}`).join("、")}</h3>{o.transactionId&&<small>{o.paymentMethod==="alipay_sandbox"?"支付宝沙箱":"微信模拟支付"} · {o.transactionId}</small>}</div><strong>¥{o.amount}</strong><span className={`status ${o.status}`}>{o.status}</span>{o.status==="已发货"?<button className="receive-btn" onClick={()=>receiveOrder(o.id)}>确认收货</button>:<span className="order-hint">{o.status==="待发货"?"等待商家发货":o.status==="已完成"?"交易已完成":"等待支付"}</span>}</article>)}{!visibleOrders.length&&<p className="empty-result">当前分类暂无订单。</p>}</div></section>:<LoginRequired onLogin={()=>{setAuthMode("login");setAuthOpen(true)}}/>)}

    {view==="merchant"&&user?.role==="seller"&&<Merchant products={products} setProducts={setProducts} notify={notify}/>}
    {view==="admin"&&user?.role==="admin"&&<Admin products={products} setProducts={setProducts} notify={notify}/>}

    <footer><div className="brand light"><span>草</span><div>迹本草<small>TRACEHERB</small></div></div><p>让传统本草以可信、年轻的方式融入日常。</p><div><a>关于平台</a><a>商家入驻</a><a>溯源标准</a><a>帮助中心</a></div><small>© 2026 TraceHerb · 本平台展示内容仅作毕业项目演示，不替代医疗建议</small></footer>

    {trace&&<div className="overlay" onClick={()=>setTrace(null)}><section className="modal trace-modal" onClick={e=>e.stopPropagation()}><button className="close" onClick={()=>setTrace(null)}>×</button><div className="verified">✓ 数字凭证已核验</div><h2>{trace.name}</h2><p>{trace.origin} · 溯源码 {trace.traceCode}</p><TraceQr product={trace}/><div className="timeline">{traceSteps.map((x,i)=><div key={x}><b>✓</b><span><strong>{x}</strong><small>2026-{String(i+1).padStart(2,"0")}-{String(8+i*3).padStart(2,"0")} · 记录已上链</small></span></div>)}</div><div className="cert"><b>检测结论：合格</b><span>重金属、农残、二氧化硫等 32 项检测</span></div></section></div>}
    {cartOpen&&<div className="overlay side" onClick={()=>setCartOpen(false)}><aside className="cart" onClick={e=>e.stopPropagation()}><button className="close" onClick={()=>setCartOpen(false)}>×</button><h2>我的购物袋 <small>{cart.reduce((s,x)=>s+x.qty,0)} 件</small></h2>{!cart.length?<div className="empty"><span>袋</span><p>购物袋还是空的</p><button onClick={()=>setCartOpen(false)}>去逛逛</button></div>:<><div className="cart-lines">{cart.map(x=><div key={x.id}><span className="mini">{x.icon}</span><div><h3>{x.name}</h3><small>{x.origin}</small><div className="qty"><button onClick={()=>setCart(c=>c.map(i=>i.id===x.id?{...i,qty:Math.max(1,i.qty-1)}:i))}>−</button><b>{x.qty}</b><button onClick={()=>add(x)}>＋</button></div></div><strong>¥{(x.price*x.qty).toFixed(2)}</strong><button className="remove" onClick={()=>setCart(c=>c.filter(i=>i.id!==x.id))}>×</button></div>)}</div><div className="cart-bottom"><p><span>商品合计</span><strong>¥{total.toFixed(2)}</strong></p><small>可获得 {Math.floor(total)} 健康积分 · 全场包邮</small><button className="primary wide" onClick={()=>requireAuth(()=>setCheckout(true))}>去结算</button></div></>}</aside></div>}
    {checkout&&<div className="overlay"><section className="modal checkout"><button className="close" onClick={()=>setCheckout(false)}>×</button><p className="eyebrow">SANDBOX CHECKOUT</p><h2>确认沙箱订单</h2><div className="sandbox-notice"><b>演示环境</b><span>不会扣除真实资金，支付结果和流水会写入平台数据库。</span></div><label>收货人<input defaultValue="林悦"/></label><label>手机号码<input defaultValue="138 0000 7001"/></label><label>收货地址<textarea defaultValue="上海市杨浦区国定路 700 号"/></label><div className="pay"><button className={payMethod==="alipay_sandbox"?"on":""} onClick={()=>setPayMethod("alipay_sandbox")}><b>支付宝沙箱</b><small>官方沙箱流程演示</small></button><button className={payMethod==="wechat_mock"?"on":""} onClick={()=>setPayMethod("wechat_mock")}><b>微信模拟支付</b><small>本地模拟，不调用真实接口</small></button></div><p className="checkout-total"><span>应付金额</span><strong>¥{total.toFixed(2)}</strong></p><button className="primary wide" disabled={paying} onClick={placeOrder}>{paying?"正在生成沙箱支付结果…":`使用${payMethod==="alipay_sandbox"?"支付宝沙箱":"微信模拟支付"}付款`}</button></section></div>}
    {authOpen&&<AuthModal mode={authMode} setMode={setAuthMode} user={user} onClose={()=>setAuthOpen(false)} onAuth={u=>{setUser(u);setPoints(u.points||0);setChecked(false);if(u.role==="buyer")fetch("/api/checkin").then(r=>r.json()).then(s=>{setChecked(!!s.checked);setPoints(s.points??u.points??0)}).catch(()=>{});setView(u.role==="seller"?"merchant":u.role==="admin"?"admin":"shop");setAuthOpen(false);notify(authMode==="register"?"注册成功，欢迎加入迹本草":"登录成功，欢迎回来")}} onLogout={logout}/>}
  </main>
}

function LoginRequired({onLogin}:{onLogin:()=>void}){
  return <section className="dashboard section login-required"><div><span>人</span><h1>登录后查看专属内容</h1><p>登录后可同步订单、积分和个人资料。</p><button className="primary" onClick={onLogin}>立即登录</button></div></section>
}

function TraceQr({product}:{product:Product}){
  const [src,setSrc]=useState("");
  useEffect(()=>{const url=new URL(window.location.href);url.search=`?trace=${encodeURIComponent(product.traceCode)}`;QRCode.toDataURL(url.toString(),{width:180,margin:1,color:{dark:"#21372c",light:"#ffffff"}}).then(setSrc).catch(()=>setSrc(""))},[product]);
  return <div className="qr">{src?<img src={src} alt={`${product.name}溯源二维码`}/>:<div className="qr-loading">生成中</div>}<span><b>扫描二维码验证商品</b><br/>二维码包含唯一溯源码 {product.traceCode}<br/>扫描后可重新打开此商品的完整溯源凭证</span></div>
}

function AuthModal({mode,setMode,user,onClose,onAuth,onLogout}:{mode:"login"|"register";setMode:(m:"login"|"register")=>void;user:User|null;onClose:()=>void;onAuth:(u:User)=>void;onLogout:()=>void}){
  const [form,setForm]=useState({username:"",email:"",phone:"",account:"",password:"",role:"buyer" as "buyer"|"seller"});
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(false);
  const submit=async()=>{
    setLoading(true);setError("");
    try{
      const body=mode==="register"?{username:form.username,email:form.email,phone:form.phone,password:form.password,role:form.role}:{account:form.account,password:form.password};
      const res=await fetch(`/api/auth/${mode}`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
      const text=await res.text();
      let data:{user?:User;error?:string};
      try{data=JSON.parse(text)}catch{throw new Error("服务器返回异常，请稍后重试")}
      if(!res.ok)throw new Error(data.error||"操作失败，请稍后重试");
      if(!data.user)throw new Error("登录信息返回异常，请稍后重试");
      onAuth(data.user);
    }catch(e){setError(e instanceof Error?e.message:"操作失败，请稍后重试")}finally{setLoading(false)}
  };
  return <div className="overlay"><section className="modal auth-modal"><button className="close" onClick={onClose}>×</button>{user?<><div className="profile-avatar">{user.username.slice(0,1)}</div><h2>{user.username}</h2><p className="profile-sub">{user.email}<br/>{user.phone}<br/><b>{user.role==="buyer"?"买家账户":user.role==="seller"?"卖家账户":"平台管理员"}</b></p>{user.role==="buyer"&&<div className="profile-points"><span>健康积分</span><strong>{user.points||0}</strong></div>}<button className="ghost wide" onClick={onLogout}>退出登录</button></>:<><p className="eyebrow">TRACEHERB ACCOUNT</p><h2>{mode==="login"?"欢迎回来":"创建迹本草账户"}</h2><p className="auth-intro">{mode==="login"?"系统会根据账户身份进入对应工作台":"请选择买家或卖家身份完成注册"}</p>{mode==="register"&&<><div className="role-picker"><button className={form.role==="buyer"?"on":""} onClick={()=>setForm({...form,role:"buyer"})}><b>买家</b><span>选购本草、订单与积分</span></button><button className={form.role==="seller"?"on":""} onClick={()=>setForm({...form,role:"seller"})}><b>卖家</b><span>商品、库存与订单管理</span></button></div><label>用户名<input autoComplete="username" value={form.username} onChange={e=>setForm({...form,username:e.target.value})} placeholder="2–24 位字符"/></label><label>邮箱<input type="email" autoComplete="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="name@example.com"/></label><label>手机号码<input inputMode="tel" autoComplete="tel" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="11 位手机号"/></label></>}{mode==="login"&&<label>账号<input autoComplete="username" value={form.account} onChange={e=>setForm({...form,account:e.target.value})} placeholder="邮箱 / 用户名 / 手机号"/></label>}<label>密码<input type="password" autoComplete={mode==="login"?"current-password":"new-password"} value={form.password} onChange={e=>setForm({...form,password:e.target.value})} placeholder="至少 8 位"/></label>{error&&<p className="auth-error">{error}</p>}<button className="primary wide" disabled={loading} onClick={submit}>{loading?"请稍候…":mode==="login"?"登录":"注册并进入"}</button><button className="auth-switch" onClick={()=>{setError("");setMode(mode==="login"?"register":"login")}}>{mode==="login"?"还没有账户？立即注册":"已有账户？返回登录"}</button></>}</section></div>
}

function Merchant({products,setProducts,notify}:{products:Product[];setProducts:(x:Product[])=>void;notify:(x:string,kind?:"ok"|"warn")=>void}) {
  type MerchantOrder={id:string;amount:number;items:OrderItem[];status:string;createdAt:string;username:string};
  const blank={name:"",category:"滋补药材",origin:"",price:59,stock:100,badge:"待认证",description:""};
  const [show,setShow]=useState(false);
  const [editing,setEditing]=useState<Product|null>(null);
  const [form,setForm]=useState(blank);
  const [orders,setOrders]=useState<MerchantOrder[]>([]);
  const loadOrders=()=>fetch("/api/merchant/orders").then(r=>r.ok?r.json():[]).then(setOrders).catch(()=>setOrders([]));
  useEffect(()=>{loadOrders()},[]);
  const openCreate=()=>{setEditing(null);setForm(blank);setShow(true)};
  const openEdit=(p:Product)=>{setEditing(p);setForm({name:p.name,category:p.category,origin:p.origin,price:p.price,stock:p.stock,badge:p.badge,description:p.description});setShow(true)};
  const save=async()=>{const payload={...form,price:Number(form.price),stock:Number(form.stock)};const res=await fetch(editing?`/api/products/${editing.id}`:"/api/products",{method:editing?"PATCH":"POST",headers:{"content-type":"application/json"},body:JSON.stringify(editing?payload:{...fallbackProducts[0],...payload,id:Date.now(),sales:0,rating:5,traceCode:`TH-NEW-${Date.now()}`,icon:form.name.slice(0,1)||"草"})});const data=await res.json();if(!res.ok)return notify(data.error||"商品保存失败","warn");if(editing&&data.product)setProducts(products.map(p=>p.id===editing.id?data.product:p));else{const refreshed=await fetch("/api/products").then(r=>r.json());setProducts(refreshed)}setShow(false);notify(editing?"商品信息已更新":"商品已发布，溯源码已生成")};
  const ship=async(orderId:string)=>{const res=await fetch(`/api/merchant/orders/${encodeURIComponent(orderId)}`,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({action:"ship"})});const data=await res.json();if(!res.ok)return notify(data.error||"发货失败","warn");setOrders(rows=>rows.map(o=>o.id===orderId?{...o,status:"已发货"}:o));notify("订单已标记为已发货")};
  const pending=orders.filter(o=>o.status==="待发货").length;
  return <section className="dashboard section merchant"><div className="page-title row"><div><p className="eyebrow">MERCHANT CENTER</p><h1>清和本草商家中心</h1><p>管理商品、库存、订单发货与溯源资料。</p></div><button className="primary" onClick={openCreate}>＋ 发布商品</button></div><div className="metrics">{[["订单总额",`¥ ${orders.reduce((s,o)=>s+o.amount,0).toFixed(2)}`,"已支付订单"],["待处理订单",String(pending),"需及时发货"],["在售商品",String(products.length),`${products.filter(p=>p.stock<70).length} 件库存预警`],["已完成订单",String(orders.filter(o=>o.status==="已完成").length),"买家已确认收货"]].map(x=><article key={x[0]}><small>{x[0]}</small><strong>{x[1]}</strong><span>{x[2]}</span></article>)}</div><div className="panel merchant-orders"><div className="panel-head"><h2>订单处理</h2><span>发货后，买家可在订单中确认收货</span></div><table><thead><tr><th>订单 / 买家</th><th>商品</th><th>金额</th><th>状态</th><th>下单时间</th><th>操作</th></tr></thead><tbody>{orders.map(o=><tr key={o.id}><td><b>{o.id}</b><small>{o.username}</small></td><td>{o.items.map(x=>`${x.name} × ${x.qty}`).join("、")}</td><td>¥{o.amount}</td><td><span className={`status ${o.status}`}>{o.status}</span></td><td>{new Date(o.createdAt).toLocaleString("zh-CN")}</td><td>{o.status==="待发货"?<button className="ship-btn" onClick={()=>ship(o.id)}>确认发货</button>:<span>{o.status}</span>}</td></tr>)}</tbody></table>{!orders.length&&<p className="empty-result">暂无待处理订单</p>}</div><div className="panel merchant-products"><div className="panel-head"><h2>商品管理</h2><span>点击编辑可修改商品资料与库存</span></div><table><thead><tr><th>商品</th><th>分类 / 产地</th><th>售价</th><th>库存</th><th>销量</th><th>溯源状态</th><th>操作</th></tr></thead><tbody>{products.map(p=><tr key={p.id}><td><span className="table-icon">{p.icon}</span><b>{p.name}</b></td><td>{p.category}<small>{p.origin}</small></td><td>¥{p.price}</td><td className={p.stock<70?"low":""}>{p.stock}</td><td>{p.sales}</td><td><span className="verified-pill">✓ 已认证</span></td><td><button onClick={()=>openEdit(p)}>编辑</button></td></tr>)}</tbody></table></div>{show&&<div className="overlay"><section className="modal checkout product-editor"><button className="close" onClick={()=>setShow(false)}>×</button><p className="eyebrow">{editing?"EDIT PRODUCT":"NEW PRODUCT"}</p><h2>{editing?"编辑商品信息":"发布新商品"}</h2><label>商品名称<input value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><div className="form-grid"><label>商品分类<select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}><option>药食同源</option><option>滋补药材</option><option>养生茶饮</option><option>手作养生</option></select></label><label>产地<input value={form.origin} onChange={e=>setForm({...form,origin:e.target.value})}/></label></div><label>商品描述<textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label><div className="form-grid"><label>价格<input type="number" min="0.01" value={form.price} onChange={e=>setForm({...form,price:Number(e.target.value)})}/></label><label>库存<input type="number" min="0" value={form.stock} onChange={e=>setForm({...form,stock:Number(e.target.value)})}/></label></div><label>商品标签<input value={form.badge} onChange={e=>setForm({...form,badge:e.target.value})}/></label>{editing&&<p className="trace-code-note">溯源码：{editing.traceCode}（为保证溯源一致性不可修改）</p>}<button className="primary wide" onClick={save}>{editing?"保存修改":"发布并生成溯源码"}</button></section></div>}</section>
}

function Admin({products,setProducts,notify}:{products:Product[];setProducts:(x:Product[])=>void;notify:(x:string,kind?:"ok"|"warn")=>void}) {
  const [query,setQuery]=useState("");
  const [transactions,setTransactions]=useState<{id:string;orderId:string;username:string;method:string;amount:number;status:string;createdAt:string;paidAt:string}[]>([]);
  const [txQuery,setTxQuery]=useState("");
  useEffect(()=>{fetch("/api/admin/transactions").then(r=>r.ok?r.json():[]).then(setTransactions).catch(()=>{})},[]);
  const revenue=transactions.reduce((s,x)=>s+Number(x.amount),0);
  const filtered=products.filter(p=>(p.name+p.category+p.origin+p.traceCode).toLowerCase().includes(query.toLowerCase()));
  const filteredTransactions=transactions.filter(t=>(t.id+t.orderId+t.username+(t.method==="alipay_sandbox"?"支付宝沙箱":"微信模拟支付")).toLowerCase().includes(txQuery.toLowerCase()));
  const remove=async(p:Product)=>{const res=await fetch(`/api/products/${p.id}`,{method:"DELETE"});if(res.ok){setProducts(products.filter(x=>x.id!==p.id));notify(`${p.name} 已下架`)}else notify("下架失败，请稍后重试")};
  const exportCsv=async()=>{try{const res=await fetch("/api/admin/transactions?format=csv");if(!res.ok)throw new Error();const blob=await res.blob();const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`迹本草支付流水-${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(url);notify("支付流水已导出")}catch{notify("流水导出失败，请稍后重试","warn")}};
  return <section className="dashboard section admin"><div className="page-title"><p className="eyebrow">PLATFORM ADMINISTRATION</p><h1>平台运营中心</h1><p>仅平台管理员可查看和管理全站运营数据、支付流水与商品。</p></div><div className="metrics">{[["沙箱交易额",`¥ ${revenue.toLocaleString(undefined,{minimumFractionDigits:2})}`,"数据库实时汇总"],["支付流水",String(transactions.length),"支付宝沙箱 / 微信模拟"],["合作商家","36","本月新增 5 家"],["溯源查询","32,891","查询成功率 99.7%"]].map(x=><article key={x[0]}><small>{x[0]}</small><strong>{x[1]}</strong><span>{x[2]}</span></article>)}</div><div className="analytics-grid"><div className="panel chart"><div className="panel-head"><h2>近 7 日交易趋势</h2><span>单位：元</span></div><div className="bars">{[48,62,54,78,68,91,82].map((h,i)=><div key={i}><i style={{height:`${h}%`}}/><span>{["周一","周二","周三","周四","周五","周六","今天"][i]}</span></div>)}</div></div><div className="panel"><h2>商品品类占比</h2><div className="donut"/><ul className="legend"><li><i/>滋补药材 <b>36%</b></li><li><i/>药食同源 <b>28%</b></li><li><i/>养生茶饮 <b>24%</b></li><li><i/>手作养生 <b>12%</b></li></ul></div></div><div className="panel transaction-panel"><div className="panel-head"><div><p className="eyebrow">PAYMENT TRANSACTIONS</p><h2>沙箱支付流水</h2></div><div className="panel-actions"><input value={txQuery} onChange={e=>setTxQuery(e.target.value)} placeholder="搜索流水号、订单号或买家"/><button className="primary" onClick={exportCsv}>导出 CSV 流水</button></div></div><p className="sandbox-caption">以下均为测试环境记录，不代表真实资金结算。</p><table><thead><tr><th>流水号 / 订单号</th><th>买家</th><th>支付方式</th><th>金额</th><th>状态</th><th>支付时间</th></tr></thead><tbody>{filteredTransactions.map(t=><tr key={t.id}><td><b>{t.id}</b><small>{t.orderId}</small></td><td>{t.username}</td><td><span className={`payment-badge ${t.method}`}>{t.method==="alipay_sandbox"?"支付宝沙箱":"微信模拟支付"}</span></td><td>¥{Number(t.amount).toFixed(2)}</td><td><span className="verified-pill">✓ {t.status}</span></td><td>{new Date(t.paidAt||t.createdAt).toLocaleString("zh-CN")}</td></tr>)}</tbody></table>{!filteredTransactions.length&&<p className="empty-result">暂无匹配的支付流水</p>}</div><DatabaseManager notify={notify}/><div className="panel admin-products"><div className="panel-head"><div><p className="eyebrow">PRODUCT GOVERNANCE</p><h2>全平台商品管理</h2></div><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="搜索商品、分类、产地或溯源码"/></div><table><thead><tr><th>商品</th><th>分类 / 产地</th><th>售价</th><th>库存</th><th>销量</th><th>溯源码</th><th>管理</th></tr></thead><tbody>{filtered.map(p=><tr key={p.id}><td><span className="table-icon">{p.icon}</span><b>{p.name}</b></td><td>{p.category}<small>{p.origin}</small></td><td>¥{p.price}</td><td>{p.stock}</td><td>{p.sales}</td><td>{p.traceCode}</td><td><button className="danger-action" onClick={()=>remove(p)}>下架</button></td></tr>)}</tbody></table>{!filtered.length&&<p className="empty-result">没有找到匹配商品</p>}</div><p className="data-note">当前共管理 {products.length} 件商品。管理员操作会同步到平台数据库。</p></section>
}

function DatabaseManager({notify}:{notify:(text:string,kind?:"ok"|"warn")=>void}){
  type Dataset="users"|"orders"|"points";
  const [dataset,setDataset]=useState<Dataset>("users");
  const [rows,setRows]=useState<Record<string,unknown>[]>([]);
  const [query,setQuery]=useState("");
  const [loading,setLoading]=useState(true);
  useEffect(()=>{setLoading(true);fetch(`/api/admin/database/${dataset}`).then(r=>r.ok?r.json():[]).then(setRows).catch(()=>setRows([])).finally(()=>setLoading(false))},[dataset]);
  const filtered=rows.filter(row=>Object.values(row).join(" ").toLowerCase().includes(query.toLowerCase()));
  const roleLabel=(value:unknown)=>({buyer:"买家",seller:"卖家",admin:"管理员"} as Record<string,string>)[String(value)]||String(value||"");
  const methodLabel=(value:unknown)=>({alipay_sandbox:"支付宝沙箱",wechat_mock:"微信模拟支付"} as Record<string,string>)[String(value)]||String(value||"—");
  const kindLabel=(value:unknown)=>({checkin:"每日签到"} as Record<string,string>)[String(value)]||String(value||"");
  const exportData=async()=>{try{const res=await fetch(`/api/admin/database/${dataset}?format=csv`);if(!res.ok)throw new Error();const blob=await res.blob();const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`迹本草-${dataset==="users"?"用户":dataset==="orders"?"订单":"积分记录"}-${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(url);notify("数据库记录已导出")}catch{notify("导出失败，请稍后重试","warn")}};
  return <div className="panel database-panel"><div className="panel-head"><div><p className="eyebrow">DATABASE MANAGEMENT</p><h2>数据库管理</h2></div><div className="panel-actions"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="搜索当前数据"/><button className="primary" onClick={exportData}>导出当前数据</button></div></div><p className="sandbox-caption">只展示业务所需字段，密码和登录凭证不会显示或导出。</p><div className="db-tabs">{([["users","用户"],["orders","订单"],["points","积分记录"]] as [Dataset,string][]).map(([key,label])=><button key={key} className={dataset===key?"on":""} onClick={()=>{setDataset(key);setQuery("")}}>{label}</button>)}</div>{loading?<p className="empty-result">正在读取数据库…</p>:<div className="db-table-wrap">{dataset==="users"&&<table><thead><tr><th>ID / 用户名</th><th>邮箱</th><th>手机号</th><th>身份</th><th>积分</th><th>注册时间</th></tr></thead><tbody>{filtered.map(r=><tr key={String(r.id)}><td><b>{String(r.username)}</b><small>ID {String(r.id)}</small></td><td>{String(r.email)}</td><td>{String(r.phone)}</td><td>{roleLabel(r.role)}</td><td>{String(r.points)}</td><td>{new Date(String(r.createdAt)).toLocaleString("zh-CN")}</td></tr>)}</tbody></table>}{dataset==="orders"&&<table><thead><tr><th>订单号 / 买家</th><th>金额</th><th>订单状态</th><th>支付方式</th><th>支付流水号</th><th>下单时间</th></tr></thead><tbody>{filtered.map(r=><tr key={String(r.id)}><td><b>{String(r.id)}</b><small>{String(r.username)}</small></td><td>¥{Number(r.amount).toFixed(2)}</td><td>{String(r.status)}</td><td>{methodLabel(r.paymentMethod)}</td><td>{String(r.transactionId||"—")}</td><td>{new Date(String(r.createdAt)).toLocaleString("zh-CN")}</td></tr>)}</tbody></table>}{dataset==="points"&&<table><thead><tr><th>记录ID / 用户</th><th>类型</th><th>积分变化</th><th>归属日期</th><th>记录时间</th></tr></thead><tbody>{filtered.map(r=><tr key={String(r.id)}><td><b>{String(r.username)}</b><small>记录 {String(r.id)} · 用户 {String(r.userKey)}</small></td><td>{kindLabel(r.kind)}</td><td className={Number(r.delta)>=0?"point-plus":"point-minus"}>{Number(r.delta)>=0?"+":""}{String(r.delta)}</td><td>{String(r.eventDate||"—")}</td><td>{new Date(String(r.createdAt)).toLocaleString("zh-CN")}</td></tr>)}</tbody></table>}{!filtered.length&&<p className="empty-result">暂无匹配记录</p>}</div>}</div>
}
