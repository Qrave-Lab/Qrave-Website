import MenuClient from "./MenuClient";

export default async function MenuPage({ searchParams }: { searchParams: Promise<{ table?: string }> }) {
  const params = await searchParams;
  const table = params.table ?? null;

  return <MenuClient table={table} />;
}
