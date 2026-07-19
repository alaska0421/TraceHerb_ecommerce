/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  ADMIN_USERNAME?: string;
  ADMIN_EMAIL?: string;
  ADMIN_PHONE?: string;
  ADMIN_PASSWORD?: string;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

const seedProducts = [
  [1,"宁夏特级枸杞","药食同源","宁夏 · 中宁",68,238,1260,4.9,"TH-NX-20260701","一物一码","大果薄皮，低温锁鲜，第三方农残检测合格","杞"],
  [2,"岷县当归片","滋补药材","甘肃 · 岷县",89,86,860,4.8,"TH-GS-20260618","产地直采","头片精选，香气浓郁，全链路产地溯源","归"],
  [3,"新会陈皮八年藏","养生茶饮","广东 · 新会",128,62,536,4.9,"TH-GD-20260408","年份认证","核心产区，干仓陈化，年份与仓储双认证","陈"],
  [4,"古法艾草足浴包","手作养生","湖北 · 蕲春",39.9,310,2180,4.7,"TH-HB-20260708","匠心手作","蕲艾、老姜、花椒科学配伍，独立便携装","艾"],
  [5,"云南三七超细粉","滋补药材","云南 · 文山",158,45,402,4.8,"TH-YN-20260521","权威质检","20头春三七，低温破壁，批次检验可查","七"],
  [6,"桂圆红枣养生茶","养生茶饮","福建 · 莆田",45,188,932,4.6,"TH-FJ-20260710","配方公开","0香精0色素，独立三角包，办公室轻养生","茶"],
  [7,"长白山五年人参","滋补药材","吉林 · 长白山",198,52,368,4.9,"TH-JL-20260712","林下参认证","五年参龄，参体完整，低温干燥保留自然参香","参"],
  [8,"桐乡胎菊精选","养生茶饮","浙江 · 桐乡",49,260,1186,4.8,"TH-ZJ-20260703","头采花蕾","头茬花蕾颗颗饱满，汤色清亮，清香自然","菊"],
  [9,"温县铁棍山药片","药食同源","河南 · 温县",58,176,754,4.7,"TH-HN-20260626","道地产区","垆土地铁棍山药，低温烘干，粉糯清甜","药"],
  [10,"川贝母精选粒","滋补药材","四川 · 阿坝",268,38,206,4.9,"TH-SC-20260516","人工精选","颗粒均匀、质地坚实，每批次含量检测","贝"],
  [11,"陇西黄芪片","滋补药材","甘肃 · 陇西",76,142,685,4.8,"TH-GS-20260629","核心产区","绵芪切片，菊花心明显，甘香自然","芪"],
  [12,"封丘金银花","养生茶饮","河南 · 封丘",69,120,594,4.7,"TH-HN-20260706","晨采锁鲜","花蕾完整，晨采低温烘制，清香不焦","花"],
  [13,"建宁通芯白莲","药食同源","福建 · 建宁",72,205,812,4.8,"TH-FJ-20260622","手工通芯","颗粒圆润，手工通芯，炖煮软糯清香","莲"],
  [14,"云南茯苓丁","药食同源","云南 · 普洱",65,164,477,4.7,"TH-YN-20260612","洁净切制","松根茯苓洁净切丁，色白质实，易煮易搭配","苓"],
  [15,"永福罗汉果","养生茶饮","广西 · 桂林",42,228,1064,4.8,"TH-GX-20260702","低温脱水","果形完整，低温脱水，泡饮甘甜无焦苦","罗"],
  [16,"新疆黑桑葚干","药食同源","新疆 · 吐鲁番",55,190,983,4.7,"TH-XJ-20260709","自然成熟","成熟黑桑葚低温烘干，果肉饱满，酸甜适口","桑"],
  [17,"霍山铁皮石斛","滋补药材","安徽 · 霍山",238,34,172,4.9,"TH-AH-20260508","基地认证","仿野生种植，鲜条低温加工，胶质丰富","斛"],
  [18,"广西炒决明子","养生茶饮","广西 · 百色",36,286,1245,4.6,"TH-GX-20260711","古法轻炒","颗粒饱满，轻火炒制，焦香柔和适合日常泡饮","明"],
];

async function ensureDb(db:D1Database){
  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,category TEXT NOT NULL,origin TEXT NOT NULL,price REAL NOT NULL,stock INTEGER NOT NULL DEFAULT 0,sales INTEGER NOT NULL DEFAULT 0,rating REAL NOT NULL DEFAULT 5,trace_code TEXT NOT NULL UNIQUE,badge TEXT NOT NULL,description TEXT NOT NULL,icon TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY,amount REAL NOT NULL,items_json TEXT NOT NULL,status TEXT NOT NULL DEFAULT '待发货',created_at TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS payment_transactions (id TEXT PRIMARY KEY,order_id TEXT NOT NULL,user_id INTEGER NOT NULL,username TEXT NOT NULL,method TEXT NOT NULL,amount REAL NOT NULL,status TEXT NOT NULL,environment TEXT NOT NULL DEFAULT 'sandbox',created_at TEXT NOT NULL,paid_at TEXT)"),
    db.prepare("CREATE TABLE IF NOT EXISTS point_events (id INTEGER PRIMARY KEY AUTOINCREMENT,user_key TEXT NOT NULL,kind TEXT NOT NULL,delta INTEGER NOT NULL,created_at TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT,username TEXT NOT NULL UNIQUE,email TEXT NOT NULL UNIQUE,phone TEXT NOT NULL UNIQUE,password_hash TEXT NOT NULL,password_salt TEXT NOT NULL,points INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY,user_id INTEGER NOT NULL,expires_at TEXT NOT NULL,created_at TEXT NOT NULL,FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE)"),
    db.prepare("CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id)"),
  ]);
  const roleColumn=await db.prepare("SELECT name FROM pragma_table_info('users') WHERE name='role'").first();
  if(!roleColumn)await db.prepare("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'buyer'").run();
  const eventDateColumn=await db.prepare("SELECT name FROM pragma_table_info('point_events') WHERE name='event_date'").first();
  if(!eventDateColumn)await db.prepare("ALTER TABLE point_events ADD COLUMN event_date TEXT").run();
  for(const [name,sql] of [
    ["user_id","ALTER TABLE orders ADD COLUMN user_id INTEGER"],
    ["payment_method","ALTER TABLE orders ADD COLUMN payment_method TEXT"],
    ["transaction_id","ALTER TABLE orders ADD COLUMN transaction_id TEXT"],
    ["paid_at","ALTER TABLE orders ADD COLUMN paid_at TEXT"],
  ]){
    const column=await db.prepare("SELECT name FROM pragma_table_info('orders') WHERE name=?").bind(name).first();
    if(!column)await db.prepare(sql).run();
  }
  await db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS point_events_daily_unique ON point_events(user_key,kind,event_date)").run();
  await db.prepare("CREATE INDEX IF NOT EXISTS payment_transactions_created_at_idx ON payment_transactions(created_at)").run();
  const count=await db.prepare("SELECT COUNT(*) n FROM products").first<{n:number}>();
  if(!count?.n) await db.batch(seedProducts.map(p=>db.prepare("INSERT INTO products VALUES (?,?,?,?,?,?,?,?,?,?,?,?)").bind(...p)));
  else if(count.n<18) await db.batch(seedProducts.slice(6).map(p=>db.prepare("INSERT OR IGNORE INTO products VALUES (?,?,?,?,?,?,?,?,?,?,?,?)").bind(...p)));
}

const encoder = new TextEncoder();
const bytesToHex = (bytes:Uint8Array) => Array.from(bytes,b=>b.toString(16).padStart(2,"0")).join("");
const randomHex = (length:number) => {
  const bytes=new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
};
async function sha256(value:string){
  return bytesToHex(new Uint8Array(await crypto.subtle.digest("SHA-256",encoder.encode(value))));
}
async function hashPassword(password:string,salt:string){
  const key=await crypto.subtle.importKey("raw",encoder.encode(password),"PBKDF2",false,["deriveBits"]);
  const bits=await crypto.subtle.deriveBits({name:"PBKDF2",hash:"SHA-256",salt:encoder.encode(salt),iterations:100000},key,256);
  return bytesToHex(new Uint8Array(bits));
}
function safeEqual(a:string,b:string){
  if(a.length!==b.length)return false;
  let diff=0;
  for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);
  return diff===0;
}
function cookieValue(request:Request,name:string){
  const cookie=request.headers.get("cookie")||"";
  return cookie.split(";").map(v=>v.trim()).find(v=>v.startsWith(`${name}=`))?.slice(name.length+1)||"";
}
async function currentUser(request:Request,db:D1Database){
  const token=cookieValue(request,"traceherb_session");
  if(!token)return null;
  return db.prepare("SELECT u.id,u.username,u.email,u.phone,u.points,u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?")
    .bind(await sha256(token),new Date().toISOString()).first();
}
async function ensureAdmin(env:Env){
  if(!env.ADMIN_USERNAME||!env.ADMIN_EMAIL||!env.ADMIN_PHONE||!env.ADMIN_PASSWORD)return;
  const existing=await env.DB.prepare("SELECT id FROM users WHERE role='admin' LIMIT 1").first();
  if(existing)return;
  const salt=randomHex(16);
  await env.DB.prepare("INSERT INTO users(username,email,phone,password_hash,password_salt,points,role,created_at) VALUES(?,?,?,?,?,0,'admin',?)")
    .bind(env.ADMIN_USERNAME,env.ADMIN_EMAIL.toLowerCase(),env.ADMIN_PHONE,await hashPassword(env.ADMIN_PASSWORD,salt),salt,new Date().toISOString()).run();
}
const sessionCookie=(request:Request,token:string,maxAge=60*60*24*14)=>`traceherb_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${new URL(request.url).protocol==="https:"?"; Secure":""}`;

async function api(request:Request,env:Env,url:URL){
  await ensureDb(env.DB);
  await ensureAdmin(env);
  const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{"cache-control":"no-store"}});
  if(url.pathname==="/api/auth/me"&&request.method==="GET"){
    return json({user:await currentUser(request,env.DB)});
  }
  if(url.pathname==="/api/auth/register"&&request.method==="POST"){
    const body=await request.json() as {username?:string;email?:string;phone?:string;password?:string;role?:string};
    const username=(body.username||"").trim();
    const email=(body.email||"").trim().toLowerCase();
    const phone=(body.phone||"").replace(/\s+/g,"");
    const password=body.password||"";
    const role=body.role==="seller"?"seller":"buyer";
    if(!/^[\p{L}\p{N}_-]{2,24}$/u.test(username))return json({error:"用户名需为 2–24 位字符"},400);
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return json({error:"请输入有效邮箱"},400);
    if(!/^1\d{10}$/.test(phone))return json({error:"请输入有效的 11 位手机号"},400);
    if(password.length<8)return json({error:"密码至少需要 8 位"},400);
    const exists=await env.DB.prepare("SELECT id FROM users WHERE username=? OR email=? OR phone=?").bind(username,email,phone).first();
    if(exists)return json({error:"用户名、邮箱或手机号已被注册"},409);
    const salt=randomHex(16);
    const passwordHash=await hashPassword(password,salt);
    const createdAt=new Date().toISOString();
    const result=await env.DB.prepare("INSERT INTO users(username,email,phone,password_hash,password_salt,role,created_at) VALUES(?,?,?,?,?,?,?)")
      .bind(username,email,phone,passwordHash,salt,role,createdAt).run();
    const token=randomHex(32);
    const expiresAt=new Date(Date.now()+14*24*60*60*1000).toISOString();
    await env.DB.prepare("INSERT INTO sessions(token_hash,user_id,expires_at,created_at) VALUES(?,?,?,?)")
      .bind(await sha256(token),result.meta.last_row_id,expiresAt,createdAt).run();
    return new Response(JSON.stringify({user:{id:result.meta.last_row_id,username,email,phone,points:0,role}}),{status:201,headers:{"content-type":"application/json","cache-control":"no-store","set-cookie":sessionCookie(request,token)}});
  }
  if(url.pathname==="/api/auth/login"&&request.method==="POST"){
    const body=await request.json() as {account?:string;password?:string};
    const account=(body.account||"").trim().toLowerCase();
    const user=await env.DB.prepare("SELECT id,username,email,phone,password_hash passwordHash,password_salt passwordSalt,points,role FROM users WHERE lower(username)=? OR lower(email)=? OR phone=?")
      .bind(account,account,account.replace(/\s+/g,"")).first<Record<string,unknown>>();
    if(!user)return json({error:"账号或密码错误"},401);
    const candidate=await hashPassword(body.password||"",String(user.passwordSalt));
    if(!safeEqual(candidate,String(user.passwordHash)))return json({error:"账号或密码错误"},401);
    const token=randomHex(32);
    const createdAt=new Date().toISOString();
    const expiresAt=new Date(Date.now()+14*24*60*60*1000).toISOString();
    await env.DB.prepare("INSERT INTO sessions(token_hash,user_id,expires_at,created_at) VALUES(?,?,?,?)")
      .bind(await sha256(token),user.id,expiresAt,createdAt).run();
    const publicUser={id:user.id,username:user.username,email:user.email,phone:user.phone,points:user.points,role:user.role};
    return new Response(JSON.stringify({user:publicUser}),{headers:{"content-type":"application/json","cache-control":"no-store","set-cookie":sessionCookie(request,token)}});
  }
  if(url.pathname==="/api/auth/logout"&&request.method==="POST"){
    const token=cookieValue(request,"traceherb_session");
    if(token)await env.DB.prepare("DELETE FROM sessions WHERE token_hash=?").bind(await sha256(token)).run();
    return new Response(JSON.stringify({ok:true}),{headers:{"content-type":"application/json","set-cookie":sessionCookie(request,"",0)}});
  }
  if(url.pathname==="/api/products"&&request.method==="GET"){
    const rows=await env.DB.prepare("SELECT id,name,category,origin,price,stock,sales,rating,trace_code traceCode,badge,description,icon FROM products ORDER BY id").all();
    return json(rows.results);
  }
  if(url.pathname==="/api/products"&&request.method==="POST"){
    const user=await currentUser(request,env.DB) as {role?:string}|null;
    if(!user||!["seller","admin"].includes(user.role||""))return json({error:"无权发布商品"},403);
    const p=await request.json() as Record<string,unknown>;
    await env.DB.prepare("INSERT INTO products(name,category,origin,price,stock,sales,rating,trace_code,badge,description,icon) VALUES(?,?,?,?,?,?,?,?,?,?,?)")
      .bind(p.name,p.category,p.origin,p.price,p.stock,p.sales,p.rating,p.traceCode,p.badge,p.description,p.icon).run();
    return json({ok:true},201);
  }
  if(url.pathname.startsWith("/api/products/")&&request.method==="DELETE"){
    const user=await currentUser(request,env.DB) as {role?:string}|null;
    if(user?.role!=="admin")return json({error:"仅管理员可下架商品"},403);
    const id=Number(url.pathname.split("/").pop());
    if(!Number.isInteger(id))return json({error:"商品编号无效"},400);
    await env.DB.prepare("DELETE FROM products WHERE id=?").bind(id).run();
    return json({ok:true});
  }
  if(url.pathname==="/api/orders"&&request.method==="GET"){
    const user=await currentUser(request,env.DB) as {id?:number;role?:string}|null;
    if(!user||user.role!=="buyer")return json({error:"请使用买家账户登录"},403);
    const rows=await env.DB.prepare("SELECT id,amount,items_json itemsJson,status,created_at createdAt,payment_method paymentMethod,transaction_id transactionId FROM orders WHERE user_id=? ORDER BY created_at DESC")
      .bind(user.id).all();
    return json(rows.results.map((row:Record<string,unknown>)=>({...row,items:JSON.parse(String(row.itemsJson||"[]"))})));
  }
  if(url.pathname==="/api/payments/sandbox"&&request.method==="POST"){
    const user=await currentUser(request,env.DB) as {id?:number;username?:string;role?:string}|null;
    if(!user||user.role!=="buyer")return json({error:"请使用买家账户登录后支付"},403);
    const body=await request.json() as {orderId?:string;items?:Array<{id?:number;qty?:number}>;method?:string};
    const method=body.method==="wechat_mock"?"wechat_mock":body.method==="alipay_sandbox"?"alipay_sandbox":"";
    if(!method)return json({error:"请选择支付宝沙箱或微信模拟支付"},400);
    if(!body.orderId||!Array.isArray(body.items)||!body.items.length)return json({error:"订单信息不完整"},400);
    const normalized=body.items.map(item=>({id:Number(item.id),qty:Number(item.qty)}));
    if(normalized.some(item=>!Number.isInteger(item.id)||!Number.isInteger(item.qty)||item.qty<1||item.qty>99))return json({error:"商品数量无效"},400);
    const productRows=await env.DB.batch(normalized.map(item=>env.DB.prepare("SELECT id,name,price,stock FROM products WHERE id=?").bind(item.id)));
    if(productRows.some(result=>!result.results[0]))return json({error:"订单中包含已下架商品"},409);
    let amount=0;
    const storedItems=normalized.map((item,index)=>{
      const product=productRows[index].results[0] as Record<string,unknown>;
      if(Number(product.stock)<item.qty)throw new Error(`${String(product.name)}库存不足`);
      amount+=Number(product.price)*item.qty;
      return {id:item.id,name:String(product.name),price:Number(product.price),qty:item.qty};
    });
    amount=Number(amount.toFixed(2));
    const transactionId=`${method==="alipay_sandbox"?"ALI":"WX"}-SBX-${Date.now()}-${randomHex(3).toUpperCase()}`;
    const now=new Date().toISOString();
    await env.DB.batch([
      env.DB.prepare("INSERT INTO orders(id,amount,items_json,status,created_at,user_id,payment_method,transaction_id,paid_at) VALUES(?,?,?,?,?,?,?,?,?)")
        .bind(body.orderId,amount,JSON.stringify(storedItems),"待发货",now,user.id,method,transactionId,now),
      env.DB.prepare("INSERT INTO payment_transactions(id,order_id,user_id,username,method,amount,status,environment,created_at,paid_at) VALUES(?,?,?,?,?,?,'支付成功','sandbox',?,?)")
        .bind(transactionId,body.orderId,user.id,user.username,method,amount,now,now),
      env.DB.prepare("UPDATE users SET points=points+? WHERE id=?").bind(Math.floor(amount),user.id),
      ...normalized.map(item=>env.DB.prepare("UPDATE products SET stock=stock-?,sales=sales+? WHERE id=? AND stock>=?").bind(item.qty,item.qty,item.id,item.qty)),
    ]);
    const balance=await env.DB.prepare("SELECT points FROM users WHERE id=?").bind(user.id).first<{points:number}>();
    return json({ok:true,orderId:body.orderId,transactionId,status:"支付成功",points:balance?.points||0,paidAt:now},201);
  }
  if(url.pathname==="/api/admin/transactions"&&request.method==="GET"){
    const user=await currentUser(request,env.DB) as {role?:string}|null;
    if(user?.role!=="admin")return json({error:"仅管理员可查看支付流水"},403);
    const rows=await env.DB.prepare("SELECT id,order_id orderId,username,method,amount,status,environment,created_at createdAt,paid_at paidAt FROM payment_transactions ORDER BY created_at DESC").all();
    if(url.searchParams.get("format")==="csv"){
      const escape=(value:unknown)=>`"${String(value??"").replace(/"/g,'""')}"`;
      const labels:Record<string,string>={alipay_sandbox:"支付宝沙箱",wechat_mock:"微信模拟支付"};
      const lines=["流水号,订单号,买家,支付方式,金额,状态,环境,创建时间,支付时间",...rows.results.map((r:Record<string,unknown>)=>[
        r.id,r.orderId,r.username,labels[String(r.method)]||r.method,Number(r.amount).toFixed(2),r.status,"沙箱",r.createdAt,r.paidAt,
      ].map(escape).join(","))];
      return new Response("\uFEFF"+lines.join("\r\n"),{headers:{"content-type":"text/csv; charset=utf-8","content-disposition":`attachment; filename="traceherb-transactions-${new Date().toISOString().slice(0,10)}.csv"`,"cache-control":"no-store"}});
    }
    return json(rows.results);
  }
  if(url.pathname.startsWith("/api/admin/database/")&&request.method==="GET"){
    const user=await currentUser(request,env.DB) as {role?:string}|null;
    if(user?.role!=="admin")return json({error:"仅管理员可访问数据库管理"},403);
    const dataset=url.pathname.split("/").pop();
    const definitions:Record<string,{sql:string;headers:string[];keys:string[]}>={
      users:{
        sql:"SELECT id,username,email,phone,points,role,created_at createdAt FROM users ORDER BY created_at DESC",
        headers:["用户ID","用户名","邮箱","手机号","积分","身份","注册时间"],
        keys:["id","username","email","phone","points","role","createdAt"],
      },
      orders:{
        sql:"SELECT o.id,o.amount,o.items_json itemsJson,o.status,o.payment_method paymentMethod,o.transaction_id transactionId,o.created_at createdAt,o.paid_at paidAt,COALESCE(u.username,'历史/匿名用户') username FROM orders o LEFT JOIN users u ON u.id=o.user_id ORDER BY o.created_at DESC",
        headers:["订单号","买家","金额","商品明细","订单状态","支付方式","支付流水号","下单时间","支付时间"],
        keys:["id","username","amount","itemsJson","status","paymentMethod","transactionId","createdAt","paidAt"],
      },
      points:{
        sql:"SELECT p.id,p.user_key userKey,COALESCE(u.username,'未知用户') username,p.kind,p.delta,p.event_date eventDate,p.created_at createdAt FROM point_events p LEFT JOIN users u ON CAST(u.id AS TEXT)=p.user_key ORDER BY p.created_at DESC",
        headers:["记录ID","用户ID","用户名","积分类型","积分变化","归属日期","记录时间"],
        keys:["id","userKey","username","kind","delta","eventDate","createdAt"],
      },
    };
    const definition=dataset?definitions[dataset]:null;
    if(!definition)return json({error:"不支持的数据类型"},404);
    const rows=await env.DB.prepare(definition.sql).all();
    if(url.searchParams.get("format")==="csv"){
      const escape=(value:unknown)=>`"${String(value??"").replace(/"/g,'""')}"`;
      const roleLabels:Record<string,string>={buyer:"买家",seller:"卖家",admin:"管理员"};
      const methodLabels:Record<string,string>={alipay_sandbox:"支付宝沙箱",wechat_mock:"微信模拟支付"};
      const kindLabels:Record<string,string>={checkin:"每日签到"};
      const normalize=(key:string,value:unknown)=>{
        if(key==="role")return roleLabels[String(value)]||value;
        if(key==="paymentMethod")return methodLabels[String(value)]||value;
        if(key==="kind")return kindLabels[String(value)]||value;
        return value;
      };
      const lines=[definition.headers.map(escape).join(","),...rows.results.map((row:Record<string,unknown>)=>definition.keys.map(key=>escape(normalize(key,row[key]))).join(","))];
      return new Response("\uFEFF"+lines.join("\r\n"),{headers:{"content-type":"text/csv; charset=utf-8","content-disposition":`attachment; filename="traceherb-${dataset}-${new Date().toISOString().slice(0,10)}.csv"`,"cache-control":"no-store"}});
    }
    return json(rows.results);
  }
  if(url.pathname==="/api/checkin"&&request.method==="GET"){
    const user=await currentUser(request,env.DB) as {id?:number;role?:string;points?:number}|null;
    if(!user||user.role!=="buyer")return json({error:"请使用买家账户登录"},403);
    const date=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Shanghai",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
    const event=await env.DB.prepare("SELECT id FROM point_events WHERE user_key=? AND kind='checkin' AND event_date=?").bind(String(user.id),date).first();
    return json({checked:!!event,points:user.points||0});
  }
  if(url.pathname==="/api/checkin"&&request.method==="POST"){
    const user=await currentUser(request,env.DB) as {id?:number;role?:string}|null;
    if(!user||user.role!=="buyer")return json({error:"请使用买家账户登录"},403);
    const now=new Date();
    const date=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Shanghai",year:"numeric",month:"2-digit",day:"2-digit"}).format(now);
    const inserted=await env.DB.prepare("INSERT OR IGNORE INTO point_events(user_key,kind,delta,created_at,event_date) VALUES(?,'checkin',20,?,?)")
      .bind(String(user.id),now.toISOString(),date).run();
    if(inserted.meta.changes===0){
      const balance=await env.DB.prepare("SELECT points FROM users WHERE id=?").bind(user.id).first<{points:number}>();
      return json({ok:true,alreadyChecked:true,delta:0,points:balance?.points||0});
    }
    await env.DB.prepare("UPDATE users SET points=points+20 WHERE id=?").bind(user.id).run();
    const balance=await env.DB.prepare("SELECT points FROM users WHERE id=?").bind(user.id).first<{points:number}>();
    return json({ok:true,alreadyChecked:false,delta:20,points:balance?.points||0});
  }
  if(url.pathname==="/api/dashboard"){
    const user=await currentUser(request,env.DB) as {role?:string}|null;
    if(user?.role!=="admin")return json({error:"仅管理员可查看运营数据"},403);
    const [p,o]=await env.DB.batch([env.DB.prepare("SELECT COUNT(*) products,SUM(sales) sales FROM products"),env.DB.prepare("SELECT COUNT(*) orders,SUM(amount) revenue FROM orders")]);
    return json({products:p.results[0],orders:o.results[0]});
  }
  return json({error:"Not found"},404);
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if(url.pathname.startsWith("/api/")){
      try{
        return await api(request,env,url);
      }catch(error){
        console.error("API request failed",error);
        return Response.json({error:"服务器暂时无法处理请求，请稍后重试"},{status:500,headers:{"cache-control":"no-store"}});
      }
    }

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    return handler.fetch(request, env, ctx);
  },
};

export default worker;
