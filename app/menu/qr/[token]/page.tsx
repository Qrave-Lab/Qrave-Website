import MenuByToken from "./MenuByToken";

export default function QRMenuPage({ params }: { params: { token: string } }) {
  return <MenuByToken token={params.token} />;
}
