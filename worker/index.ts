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
];

async function ensureDb(db:D1Database){
  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,category TEXT NOT NULL,origin TEXT NOT NULL,price REAL NOT NULL,stock INTEGER NOT NULL DEFAULT 0,sales INTEGER NOT NULL DEFAULT 0,rating REAL NOT NULL DEFAULT 5,trace_code TEXT NOT NULL UNIQUE,badge TEXT NOT NULL,description TEXT NOT NULL,icon TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY,amount REAL NOT NULL,items_json TEXT NOT NULL,status TEXT NOT NULL DEFAULT '待发货',created_at TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS point_events (id INTEGER PRIMARY KEY AUTOINCREMENT,user_key TEXT NOT NULL,kind TEXT NOT NULL,delta INTEGER NOT NULL,created_at TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT,username TEXT NOT NULL UNIQUE,email TEXT NOT NULL UNIQUE,phone TEXT NOT NULL UNIQUE,password_hash TEXT NOT NULL,password_salt TEXT NOT NULL,points INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY,user_id INTEGER NOT NULL,expires_at TEXT NOT NULL,created_at TEXT NOT NULL,FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE)"),
    db.prepare("CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id)"),
  ]);
  const roleColumn=await db.prepare("SELECT name FROM pragma_table_info('users') WHERE name='role'").first();
  if(!roleColumn)await db.prepare("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'buyer'").run();
  const count=await db.prepare("SELECT COUNT(*) n FROM products").first<{n:number}>();
  if(!count?.n) await db.batch(seedProducts.map(p=>db.prepare("INSERT INTO products VALUES (?,?,?,?,?,?,?,?,?,?,?,?)").bind(...p)));
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
  if(url.pathname==="/api/orders"&&request.method==="POST"){
    const o=await request.json() as {id:string;amount:number;items:unknown[]};
    await env.DB.prepare("INSERT INTO orders(id,amount,items_json,status,created_at) VALUES(?,?,?,?,?)").bind(o.id,o.amount,JSON.stringify(o.items),"待发货",new Date().toISOString()).run();
    return json({ok:true},201);
  }
  if(url.pathname==="/api/checkin"&&request.method==="POST"){
    await env.DB.prepare("INSERT INTO point_events(user_key,kind,delta,created_at) VALUES(?,?,?,?)").bind("demo-user","checkin",20,new Date().toISOString()).run();
    return json({ok:true,delta:20});
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
