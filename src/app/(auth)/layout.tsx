import "@/app/globals.css";
import BackNavigationHandler from "./_components/back-navigation-handler";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh overflow-x-clip">
      <BackNavigationHandler />
      {children}
    </div>
  );
}
