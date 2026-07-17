/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
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
  ]);
  const count=await db.prepare("SELECT COUNT(*) n FROM products").first<{n:number}>();
  if(!count?.n) await db.batch(seedProducts.map(p=>db.prepare("INSERT INTO products VALUES (?,?,?,?,?,?,?,?,?,?,?,?)").bind(...p)));
}

async function api(request:Request,env:Env,url:URL){
  await ensureDb(env.DB);
  const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{"cache-control":"no-store"}});
  if(url.pathname==="/api/products"&&request.method==="GET"){
    const rows=await env.DB.prepare("SELECT id,name,category,origin,price,stock,sales,rating,trace_code traceCode,badge,description,icon FROM products ORDER BY id").all();
    return json(rows.results);
  }
  if(url.pathname==="/api/products"&&request.method==="POST"){
    const p=await request.json() as Record<string,unknown>;
    await env.DB.prepare("INSERT INTO products(name,category,origin,price,stock,sales,rating,trace_code,badge,description,icon) VALUES(?,?,?,?,?,?,?,?,?,?,?)")
      .bind(p.name,p.category,p.origin,p.price,p.stock,p.sales,p.rating,p.traceCode,p.badge,p.description,p.icon).run();
    return json({ok:true},201);
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
    if(url.pathname.startsWith("/api/")) return api(request,env,url);

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
