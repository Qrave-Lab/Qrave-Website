import MenuByToken from "./MenuByToken";

export default async function QRMenuPage({ params }: { params: Promise<{ token: string }> }) {
  const resolvedParams = await params;
  return <MenuByToken token={resolvedParams.token} />;
}
