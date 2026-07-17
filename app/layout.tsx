import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const protocol = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const image = `${protocol}://${host}/og.png`;
  const title = "迹本草 TraceHerb｜可信中草药售卖平台";
  const description = "集本草选购、数字溯源、健康积分、商家管理与运营分析于一体的中医药电商平台。";
  return {
    title, description, icons: { icon: "/favicon.svg" },
    openGraph: { title, description, images: [{ url:image, width:1732, height:909 }] },
    twitter: { card:"summary_large_image", title, description, images:[image] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
