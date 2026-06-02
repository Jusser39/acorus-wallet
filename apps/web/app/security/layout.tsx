import { AuthGuard } from "@/components/auth-guard";

export const metadata = {
  title: "Security Center - Acorus Wallet",
};

export default function SecurityLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>;
}
