import type { Metadata } from "next";
import FoodCourtClient from "./FoodCourtClient";

type Props = { params: Promise<{ slug: string }> };

async function courtName(slug: string): Promise<string | null> {
  const apiBase = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");
  if (!apiBase) return null;
  try {
    const res = await fetch(`${apiBase}/public/food-courts/resolve?slug=${encodeURIComponent(slug)}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { court?: { name?: string } };
    return data.court?.name || null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const name = await courtName(slug);
  return {
    title: name ? `${name} · Menus` : "Food court menus",
    description: name
      ? `Browse every stall's menu at ${name}, with photos and 3D dishes.`
      : "Browse every stall's menu, with photos and 3D dishes.",
  };
}

export default async function FoodCourtPage({ params }: Props) {
  const { slug } = await params;
  return <FoodCourtClient slug={slug} />;
}
