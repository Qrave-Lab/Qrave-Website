import type { Metadata } from "next";
import ModernFoodUI from "./ModernFoodUI";

type MenuPageProps = {
  searchParams: Promise<{
    table?: string;
  }>;
};

export async function generateMetadata(
  { searchParams }: MenuPageProps
): Promise<Metadata> {
  const params = await searchParams;
  const table = params.table;

  return {
    title: table ? `Noir | Table ${table}` : "Noir | Digital Menu",
  };
}

export default function MenuPage({
  searchParams,
}: {
  searchParams: { table?: string };
}) {
  return <ModernFoodUI  />;
}

