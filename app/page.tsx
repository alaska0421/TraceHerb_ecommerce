"use client";

import { useEffect, useMemo, useState } from "react";

type Product = { id:number; name:string; category:string; origin:string; price:number; stock:number; sales:number; rating:number; traceCode:string; badge:string; description:string; icon:string };
type CartLine = Product & { qty:number };
type Toast = { text:string; kind?:"ok"|"warn" };
type User = { id:number; username:string; email:string; phone:string; points:number };

const fallbackProducts: Product[] = [
  { id:1,name:"宁夏特级枸杞",category:"药食同源",origin:"宁夏 · 中宁",price:68,stock:238,sales:1260,rating:4.9,traceCode:"TH-NX-20260701",badge:"一物一码",description:"大果薄皮，低温锁鲜，第三方农残检测合格",icon:"杞" },
  { id:2,name:"岷县当归片",category:"滋补药材",origin:"甘肃 · 岷县",price:89,stock:86,sales:860,rating:4.8,traceCode:"TH-GS-20260618",badge:"产地直采",description:"头片精选，香气浓郁，全链路产地溯源",icon:"归" },
  { id:3,name:"新会陈皮八年藏",category:"养生茶饮",origin:"广东 · 新会",price:128,stock:62,sales:536,rating:4.9,traceCode:"TH-GD-20260408",badge:"年份认证",description:"核心产区，干仓陈化，年份与仓储双认证",icon:"陈" },
  { id:4,name:"古法艾草足浴包",category:"手作养生",origin:"湖北 · 蕲春",price:39.9,stock:310,sales:2180,rating:4.7,traceCode:"TH-HB-20260708",badge:"匠心手作",description:"蕲艾、老姜、花椒科学配伍，独立便携装",icon:"艾" },
  { id:5,name:"云南三七超细粉",category:"滋补药材",origin:"云南 · 文山",price:158,stock:45,sales:402,rating:4.8,traceCode:"TH-YN-20260521",badge:"权威质检",description:"20头春三七，低温破壁，批次检验可查",icon:"七" },
  { id:6,name:"桂圆红枣养生茶",category:"养生茶饮",origin:"福建 · 莆田",price:45,stock:188,sales:932,rating:4.6,traceCode:"TH-FJ-20260710",badge:"配方公开",description:"0香精0色素，独立三角包，办公室轻养生",icon:"茶" },
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
  const [orders,setOrders] = useState([{id:"TH20260716001",item:"岷县当归片 × 1",amount:89,status:"已发货",time:"2026-07-16 14:20"}]);
  const [user,setUser] = useState<User|null>(null);
  const [authOpen,setAuthOpen] = useState(false);
  const [authMode,setAuthMode] = useState<"login"|"register">("login");

  useEffect(()=>{ fetch("/api/products").then(r=>r.ok?r.json():null).then(d=>d?.length&&setProducts(d)).catch(()=>{}); },[]);
  useEffect(()=>{ fetch("/api/auth/me").then(r=>r.json()).then(d=>{if(d.user){setUser(d.user);setPoints(d.user.points||0)}}).catch(()=>{}); },[]);
  const filtered = useMemo(()=>products.filter(p=>(category==="全部"||p.category===category)&&(p.name+p.origin).includes(query)),[products,category,query]);
  const total = cart.reduce((s,x)=>s+x.price*x.qty,0);
  const notify=(text:string,kind:"ok"|"warn"="ok")=>{setToast({text,kind});setTimeout(()=>setToast(null),2200)};
  const add=(p:Product)=>{setCart(c=>{const hit=c.find(x=>x.id===p.id);return hit?c.map(x=>x.id===p.id?{...x,qty:x.qty+1}:x):[...c,{...p,qty:1}]});notify(`${p.name} 已加入购物车`)};
  const placeOrder=async()=>{ if(!cart.length)return; const id=`TH${Date.now().toString().slice(-11)}`; setOrders(o=>[{id,item:cart.map(x=>`${x.name} × ${x.qty}`).join("、"),amount:+total.toFixed(2),status:"待发货",time:new Date().toLocaleString("zh-CN")},...o]); setPoints(p=>p+Math.floor(total)); setCart([]);setCheckout(false);setCartOpen(false);setView("orders");notify("支付成功，积分已到账"); fetch("/api/orders",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({id,amount:total,items:cart})}).catch(()=>{}) };
  const checkin=()=>{if(checked)return notify("今天已经签到过啦","warn");setChecked(true);setPoints(p=>p+20);notify("签到成功，获得 20 健康积分");fetch("/api/checkin",{method:"POST"}).catch(()=>{})};
  const redeem=(cost:number,name:string)=>{if(points<cost)return notify("积分不足","warn");setPoints(p=>p-cost);notify(`已兑换：${name}`)};
  const requireAuth=(action:()=>void)=>{if(user)return action();setAuthMode("login");setAuthOpen(true);notify("请先登录后继续","warn")};
  const logout=async()=>{await fetch("/api/auth/logout",{method:"POST"});setUser(null);setAuthOpen(false);notify("已安全退出登录")};

  return <main>
    {toast&&<div className={`toast ${toast.kind}`}>{toast.kind==="warn"?"!":"✓"} {toast.text}</div>}
    <header>
      <button className="brand" onClick={()=>setView("shop")}><span>草</span><div>迹本草<small>TRACEHERB</small></div></button>
      <nav>{[["shop","本草集市"],["points","健康积分"],["orders","我的订单"],["merchant","商家中心"],["admin","运营看板"]].map(([k,v])=><button key={k} className={view===k?"active":""} onClick={()=>k==="points"||k==="orders"?requireAuth(()=>setView(k as typeof view)):setView(k as typeof view)}>{v}</button>)}</nav>
      <div className="head-actions"><button className="points-pill" onClick={()=>requireAuth(()=>setView("points"))}>叶 {points}</button><button className="cart-btn" onClick={()=>setCartOpen(true)}>购物袋 <b>{cart.reduce((s,x)=>s+x.qty,0)}</b></button>{user?<button className="account-btn" onClick={()=>setAuthOpen(true)}><span className="avatar">{user.username.slice(0,1)}</span><span>{user.username}</span></button>:<button className="login-btn" onClick={()=>{setAuthMode("login");setAuthOpen(true)}}>登录 / 注册</button>}</div>
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
          <div className={`product-visual tone${p.id}`}><span>{p.icon}</span><b>{p.badge}</b><button aria-label="收藏">♡</button></div>
          <div className="product-info"><small>{p.origin}</small><h3>{p.name}</h3><p>{p.description}</p><div className="rating">★★★★★ <span>{p.rating} · 已售 {p.sales}</span></div><div className="price"><strong>¥{p.price}</strong><div><button className="trace-btn" onClick={()=>setTrace(p)}>查溯源</button><button className="add-btn" onClick={()=>add(p)}>＋</button></div></div></div>
        </article>)}</div>
      </section>
      <section className="trace-story section"><div className="trace-ink">溯</div><div><p className="eyebrow">DIGITAL TRACEABILITY</p><h2>一码寻源，真材实证</h2><p>每件商品绑定唯一数字身份。产地、加工、检测、仓储与流通记录清晰可查，让信任有据可依。</p><button className="primary" onClick={()=>setTrace(products[2])}>立即体验溯源</button></div><ol>{traceSteps.map((x,i)=><li key={x}><b>0{i+1}</b><span>{x}</span></li>)}</ol></section>
    </>}

    {view==="points"&&<section className="dashboard section"><div className="page-title"><p className="eyebrow">HEALTH REWARDS</p><h1>健康积分</h1><p>每一次健康选择，都值得被奖励。</p></div><div className="points-hero"><div><small>可用积分</small><strong>{points}</strong><p>白露会员 · 距下一等级还差 820 积分</p><div className="progress"><i style={{width:"72%"}}/></div></div><button onClick={checkin} className={checked?"done":""}><b>{checked?"已签到":"+20"}</b><span>{checked?"明天再来":"今日签到"}</span></button></div><h2>积分任务</h2><div className="task-grid">{[["每日浏览","浏览 3 件溯源商品","+10"],["完成评价","分享真实使用体验","+50"],["健康分享","邀请好友探索本草","+30"]].map(x=><article key={x[0]}><span>✦</span><div><h3>{x[0]}</h3><p>{x[1]}</p></div><button onClick={()=>notify(`${x[0]}任务已领取`)}>{x[2]}</button></article>)}</div><h2>积分好礼</h2><div className="reward-grid">{[[500,"¥5 订单抵扣券"],[1200,"古法艾草足浴包"],[2000,"一对一养生咨询"]].map(x=><article key={x[1] as string}><div>礼</div><h3>{x[1]}</h3><p>{x[0]} 积分</p><button onClick={()=>redeem(x[0] as number,x[1] as string)}>立即兑换</button></article>)}</div></section>}

    {view==="orders"&&(user?<section className="dashboard section"><div className="page-title"><p className="eyebrow">MY ORDERS</p><h1>我的订单</h1><p>查看订单状态、物流与溯源凭证。</p></div><div className="tabs"><button className="on">全部订单</button><button>待付款</button><button>待发货</button><button>已发货</button><button>已完成</button></div><div className="orders">{orders.map(o=><article key={o.id}><div><small>订单号 {o.id} · {o.time}</small><h3>{o.item}</h3></div><strong>¥{o.amount}</strong><span className={`status ${o.status}`}>{o.status}</span><button onClick={()=>notify("物流：包裹已到达上海转运中心")}>查看物流</button></article>)}</div></section>:<LoginRequired onLogin={()=>{setAuthMode("login");setAuthOpen(true)}}/>)}

    {view==="merchant"&&<Merchant products={products} setProducts={setProducts} notify={notify}/>}
    {view==="admin"&&<Admin products={products} orders={orders}/>}

    <footer><div className="brand light"><span>草</span><div>迹本草<small>TRACEHERB</small></div></div><p>让传统本草以可信、年轻的方式融入日常。</p><div><a>关于平台</a><a>商家入驻</a><a>溯源标准</a><a>帮助中心</a></div><small>© 2026 TraceHerb · 本平台展示内容仅作毕业项目演示，不替代医疗建议</small></footer>

    {trace&&<div className="overlay" onClick={()=>setTrace(null)}><section className="modal trace-modal" onClick={e=>e.stopPropagation()}><button className="close" onClick={()=>setTrace(null)}>×</button><div className="verified">✓ 数字凭证已核验</div><h2>{trace.name}</h2><p>{trace.origin} · 溯源码 {trace.traceCode}</p><div className="qr"><div>迹<br/>本<br/>草</div><span>扫描同款商品包装二维码<br/>可再次查看此凭证</span></div><div className="timeline">{traceSteps.map((x,i)=><div key={x}><b>✓</b><span><strong>{x}</strong><small>2026-{String(i+1).padStart(2,"0")}-{String(8+i*3).padStart(2,"0")} · 记录已上链</small></span></div>)}</div><div className="cert"><b>检测结论：合格</b><span>重金属、农残、二氧化硫等 32 项检测</span></div></section></div>}
    {cartOpen&&<div className="overlay side" onClick={()=>setCartOpen(false)}><aside className="cart" onClick={e=>e.stopPropagation()}><button className="close" onClick={()=>setCartOpen(false)}>×</button><h2>我的购物袋 <small>{cart.reduce((s,x)=>s+x.qty,0)} 件</small></h2>{!cart.length?<div className="empty"><span>袋</span><p>购物袋还是空的</p><button onClick={()=>setCartOpen(false)}>去逛逛</button></div>:<><div className="cart-lines">{cart.map(x=><div key={x.id}><span className="mini">{x.icon}</span><div><h3>{x.name}</h3><small>{x.origin}</small><div className="qty"><button onClick={()=>setCart(c=>c.map(i=>i.id===x.id?{...i,qty:Math.max(1,i.qty-1)}:i))}>−</button><b>{x.qty}</b><button onClick={()=>add(x)}>＋</button></div></div><strong>¥{(x.price*x.qty).toFixed(2)}</strong><button className="remove" onClick={()=>setCart(c=>c.filter(i=>i.id!==x.id))}>×</button></div>)}</div><div className="cart-bottom"><p><span>商品合计</span><strong>¥{total.toFixed(2)}</strong></p><small>可获得 {Math.floor(total)} 健康积分 · 全场包邮</small><button className="primary wide" onClick={()=>requireAuth(()=>setCheckout(true))}>去结算</button></div></>}</aside></div>}
    {checkout&&<div className="overlay"><section className="modal checkout"><button className="close" onClick={()=>setCheckout(false)}>×</button><p className="eyebrow">SECURE CHECKOUT</p><h2>确认订单</h2><label>收货人<input defaultValue="林悦"/></label><label>手机号码<input defaultValue="138 0000 7001"/></label><label>收货地址<textarea defaultValue="上海市杨浦区国定路 700 号"/></label><div className="pay"><button className="on">支付宝</button><button>微信支付</button><button>模拟支付</button></div><p className="checkout-total"><span>应付金额</span><strong>¥{total.toFixed(2)}</strong></p><button className="primary wide" onClick={placeOrder}>确认支付</button></section></div>}
    {authOpen&&<AuthModal mode={authMode} setMode={setAuthMode} user={user} onClose={()=>setAuthOpen(false)} onAuth={u=>{setUser(u);setPoints(u.points||0);setAuthOpen(false);notify(authMode==="register"?"注册成功，欢迎加入迹本草":"登录成功，欢迎回来")}} onLogout={logout}/>}
  </main>
}

function LoginRequired({onLogin}:{onLogin:()=>void}){
  return <section className="dashboard section login-required"><div><span>人</span><h1>登录后查看专属内容</h1><p>登录后可同步订单、积分和个人资料。</p><button className="primary" onClick={onLogin}>立即登录</button></div></section>
}

function AuthModal({mode,setMode,user,onClose,onAuth,onLogout}:{mode:"login"|"register";setMode:(m:"login"|"register")=>void;user:User|null;onClose:()=>void;onAuth:(u:User)=>void;onLogout:()=>void}){
  const [form,setForm]=useState({username:"",email:"",phone:"",account:"",password:""});
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(false);
  const submit=async()=>{
    setLoading(true);setError("");
    try{
      const body=mode==="register"?{username:form.username,email:form.email,phone:form.phone,password:form.password}:{account:form.account,password:form.password};
      const res=await fetch(`/api/auth/${mode}`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
      const data=await res.json();
      if(!res.ok)throw new Error(data.error||"操作失败，请稍后重试");
      onAuth(data.user);
    }catch(e){setError(e instanceof Error?e.message:"操作失败，请稍后重试")}finally{setLoading(false)}
  };
  return <div className="overlay"><section className="modal auth-modal"><button className="close" onClick={onClose}>×</button>{user?<><div className="profile-avatar">{user.username.slice(0,1)}</div><h2>{user.username}</h2><p className="profile-sub">{user.email}<br/>{user.phone}</p><div className="profile-points"><span>健康积分</span><strong>{user.points||0}</strong></div><button className="ghost wide" onClick={onLogout}>退出登录</button></>:<><p className="eyebrow">TRACEHERB ACCOUNT</p><h2>{mode==="login"?"欢迎回来":"创建迹本草账户"}</h2><p className="auth-intro">{mode==="login"?"使用邮箱、用户名或手机号登录":"注册后可同步订单、积分和溯源记录"}</p>{mode==="register"&&<><label>用户名<input autoComplete="username" value={form.username} onChange={e=>setForm({...form,username:e.target.value})} placeholder="2–24 位字符"/></label><label>邮箱<input type="email" autoComplete="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="name@example.com"/></label><label>手机号码<input inputMode="tel" autoComplete="tel" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="11 位手机号"/></label></>}{mode==="login"&&<label>账号<input autoComplete="username" value={form.account} onChange={e=>setForm({...form,account:e.target.value})} placeholder="邮箱 / 用户名 / 手机号"/></label>}<label>密码<input type="password" autoComplete={mode==="login"?"current-password":"new-password"} value={form.password} onChange={e=>setForm({...form,password:e.target.value})} placeholder="至少 8 位"/></label>{error&&<p className="auth-error">{error}</p>}<button className="primary wide" disabled={loading} onClick={submit}>{loading?"请稍候…":mode==="login"?"登录":"注册并登录"}</button><button className="auth-switch" onClick={()=>{setError("");setMode(mode==="login"?"register":"login")}}>{mode==="login"?"还没有账户？立即注册":"已有账户？返回登录"}</button></>}</section></div>
}

function Merchant({products,setProducts,notify}:{products:Product[];setProducts:(x:Product[])=>void;notify:(x:string)=>void}) {
  const [show,setShow]=useState(false);
  const [name,setName]=useState("");
  const add=()=>{if(!name)return;const p={...fallbackProducts[0],id:Date.now(),name,price:59,stock:100,sales:0,traceCode:`TH-NEW-${Date.now()}`,badge:"待认证"};setProducts([p,...products]);setShow(false);setName("");notify("商品已发布，溯源码已生成");fetch("/api/products",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(p)}).catch(()=>{})};
  return <section className="dashboard section merchant"><div className="page-title row"><div><p className="eyebrow">MERCHANT CENTER</p><h1>清和本草商家中心</h1><p>轻松管理商品、库存、订单与溯源资料。</p></div><button className="primary" onClick={()=>setShow(true)}>＋ 发布商品</button></div><div className="metrics">{[["今日销售额","¥ 12,680","↑ 18.6%"],["待处理订单","12","需及时处理"],["在售商品",String(products.length),"3 件库存预警"],["溯源查询","1,286","↑ 24.3%"]].map(x=><article key={x[0]}><small>{x[0]}</small><strong>{x[1]}</strong><span>{x[2]}</span></article>)}</div><div className="panel"><div className="panel-head"><h2>商品管理</h2><input placeholder="搜索商品"/></div><table><thead><tr><th>商品</th><th>分类 / 产地</th><th>售价</th><th>库存</th><th>销量</th><th>溯源状态</th><th>操作</th></tr></thead><tbody>{products.map(p=><tr key={p.id}><td><span className="table-icon">{p.icon}</span><b>{p.name}</b></td><td>{p.category}<small>{p.origin}</small></td><td>¥{p.price}</td><td className={p.stock<70?"low":""}>{p.stock}</td><td>{p.sales}</td><td><span className="verified-pill">✓ 已认证</span></td><td><button onClick={()=>notify(`${p.name} 编辑面板已打开`)}>编辑</button></td></tr>)}</tbody></table></div>{show&&<div className="overlay"><section className="modal checkout"><button className="close" onClick={()=>setShow(false)}>×</button><h2>发布新商品</h2><label>商品名称<input value={name} onChange={e=>setName(e.target.value)} placeholder="例如：长白山西洋参片"/></label><label>产地<input defaultValue="吉林 · 长白山"/></label><label>商品描述<textarea defaultValue="道地产区直采，批次质检可查询"/></label><div className="form-grid"><label>价格<input defaultValue="59"/></label><label>库存<input defaultValue="100"/></label></div><button className="primary wide" onClick={add}>发布并生成溯源码</button></section></div>}</section>
}

function Admin({products,orders}:{products:Product[];orders:{amount:number}[]}) {
  const revenue=orders.reduce((s,x)=>s+x.amount,12680);
  return <section className="dashboard section admin"><div className="page-title"><p className="eyebrow">OPERATIONS ANALYTICS</p><h1>平台运营看板</h1><p>用户、交易、商家与溯源数据一屏掌握。</p></div><div className="metrics">{[["平台交易额",`¥ ${revenue.toLocaleString()}`,"较上周 +16.8%"],["活跃用户","18,642","7 日留存 42.6%"],["合作商家","36","本月新增 5 家"],["溯源查询","32,891","查询成功率 99.7%"]].map(x=><article key={x[0]}><small>{x[0]}</small><strong>{x[1]}</strong><span>{x[2]}</span></article>)}</div><div className="analytics-grid"><div className="panel chart"><div className="panel-head"><h2>近 7 日交易趋势</h2><span>单位：元</span></div><div className="bars">{[48,62,54,78,68,91,82].map((h,i)=><div key={i}><i style={{height:`${h}%`}}/><span>{["周一","周二","周三","周四","周五","周六","今天"][i]}</span></div>)}</div></div><div className="panel"><h2>商品品类占比</h2><div className="donut"/><ul className="legend"><li><i/>滋补药材 <b>36%</b></li><li><i/>药食同源 <b>28%</b></li><li><i/>养生茶饮 <b>24%</b></li><li><i/>手作养生 <b>12%</b></li></ul></div><div className="panel wide-panel"><h2>平台健康度</h2><div className="health">{[["订单完成率","94.2%"],["复购率","38.6%"],["溯源覆盖率","100%"],["商家认证率","97.3%"]].map(x=><div key={x[0]}><span>{x[0]}<b>{x[1]}</b></span><i><em style={{width:x[1]}}/></i></div>)}</div></div><div className="panel"><h2>实时动态</h2><div className="feed">{["用户 138****6621 完成积分兑换","宁夏杞源商行发布新商品","订单 TH20260717026 已完成","云南云本堂通过商家认证"].map((x,i)=><p key={x}><i/> {x}<small>{i*4+2} 分钟前</small></p>)}</div></div></div><p className="data-note">当前共管理 {products.length} 件演示商品。数据用于毕业项目业务模型验证。</p></section>
}
