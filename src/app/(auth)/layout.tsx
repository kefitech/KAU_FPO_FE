import "@/app/globals.css";
import BackNavigationHandler from "./_components/back-navigation-handler";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen overflow-hidden">
      <BackNavigationHandler />
      {children}
    </div>
  );
}
