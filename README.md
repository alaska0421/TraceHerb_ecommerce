# 迹本草 TraceHerb

中草药电商与数字溯源平台，包含商品浏览、购物车、模拟结算、订单、健康积分、商家管理、运营看板，以及独立用户注册与登录。

## 本地运行

需要 Node.js 22.13 或更高版本。

在 Windows PowerShell 中运行：

```powershell
npm.cmd install
$env:HTTP_PROXY=$null; $env:HTTPS_PROXY=$null; $env:ALL_PROXY=$null
$env:WRANGLER_LOG_PATH=".wrangler/wrangler.log"; npx.cmd vinext dev
```

启动后访问终端显示的本地地址，通常为 `http://localhost:3000`。

## 用户账户

- 注册时填写用户名、邮箱、手机号和密码。
- 登录时可使用用户名、邮箱或手机号。
- 密码通过 PBKDF2-SHA256 加盐派生后保存，不保存明文密码。
- 登录会话使用 HttpOnly、SameSite Cookie。
- 用户、登录会话、商品、订单和积分数据均保存在 D1 数据库中。

## 主要目录

- `app/`：页面、交互和样式
- `worker/`：后端接口与身份验证
- `db/`：数据库模型
- `drizzle/`：数据库迁移脚本
- `public/`：网站图片和图标

## 常用操作

```powershell
npx.cmd vinext build
npm.cmd run db:generate
```

`.openai/hosting.json` 仅用于现有网站的托管与数据库资源绑定，不参与用户登录，也不调用任何模型。
