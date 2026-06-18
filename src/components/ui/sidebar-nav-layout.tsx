"use client";

export interface SidebarNavItem {
  key: string;
  label: string;
  icon: React.ElementType;
}

interface SidebarNavLayoutProps {
  items: SidebarNavItem[];
  activeKey: string;
  onNavigate: (key: string) => void;
  action?: React.ReactNode;
  children: React.ReactNode;
}

export function SidebarNavLayout({
  items,
  activeKey,
  onNavigate,
  action,
  children,
}: SidebarNavLayoutProps) {
  const activeLabel = items.find((i) => i.key === activeKey)?.label ?? "";

  return (
    <div className="flex gap-0">
      {/* Left nav */}
      <nav className="w-52 shrink-0 border-r pr-5 sticky top-6 self-start">
        <ul className="flex flex-col gap-0.5">
          {items.map(({ key, label, icon: Icon }) => {
            const isActive = activeKey === key;
            return (
              <li key={key}>
                <button
                  type="button"
                  onClick={() => onNavigate(key)}
                  className={`w-full flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                    isActive
                      ? "bg-muted text-foreground font-medium"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground font-normal"
                  }`}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-foreground" : "text-muted-foreground/70"}`} />
                  {label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Right content */}
      <div className="flex-1 min-w-0 pl-12 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold tracking-tight">{activeLabel}</h2>
          {action}
        </div>
        {children}
      </div>
    </div>
  );
}
