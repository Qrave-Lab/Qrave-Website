import { Metadata } from "next";
import LoginPage from "./loginPage";

export const metadata: Metadata = {
  title: "Qrave | Login",
  description: "Login to your Qrave account and elevate your dining experience.",
};

export default function Page() {
  return <LoginPage />;
}
