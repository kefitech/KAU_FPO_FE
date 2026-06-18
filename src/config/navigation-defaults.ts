import type { NavigationConfig } from "@/types/navigation";

/**
 * Default navigation config for FPO Portal
 */
export const fpoNavigationConfig: NavigationConfig = {
  logo: {
    title: "KAU-FPO Platform",
    subtitle: "FPO Portal",
    icon: "Sprout",
  },
  groups: [
    {
      id: "main",
      label: "Menu",
      labelMl: "മെനു",
      items: [
        {
          id: "dashboard",
          title: "Dashboard",
          titleMl: "ഡാഷ്‌ബോർഡ്",
          url: "/fpo/dashboard",
          icon: "LayoutDashboard",
        },
        {
          id: "profile",
          title: "My Profile",
          titleMl: "എന്റെ പ്രൊഫൈൽ",
          url: "/fpo/profile",
          icon: "User",
        },
        {
          id: "applications",
          title: "Applications",
          titleMl: "അപേക്ഷകൾ",
          url: "/fpo/applications",
          icon: "FileText",
        },
        {
          id: "recommendations",
          title: "AI Recommendations",
          titleMl: "AI ശുപാർശകൾ",
          url: "/fpo/recommendations",
          icon: "Lightbulb",
        },
        {
          id: "team",
          title: "Team",
          titleMl: "ടീം",
          url: "/fpo/team",
          icon: "Users",
        },
        {
          id: "products",
          title: "My Products",
          titleMl: "എന്റെ ഉൽപ്പന്നങ്ങൾ",
          url: "/fpo/products",
          icon: "Package",
        },
        {
          id: "market",
          title: "Market Linkage",
          titleMl: "വിപണി ബന്ധം",
          url: "/fpo/market",
          icon: "Store",
        },
        {
          id: "schemes",
          title: "Schemes",
          titleMl: "പദ്ധതികൾ",
          url: "/fpo/schemes",
          icon: "FileText",
        },
        {
          id: "experts",
          title: "Expert Directory",
          titleMl: "വിദഗ്ധ ഡയറക്ടറി",
          url: "/fpo/experts",
          icon: "BookOpen",
        },
        {
          id: "tier-assessment",
          title: "Tier Assessment",
          titleMl: "ടയർ അസസ്മെന്റ്",
          url: "/fpo/tier-assessment",
          icon: "ClipboardList",
        },
      ],
    },
  ],
  footerItems: [
    {
      id: "settings",
      title: "Settings",
      titleMl: "ക്രമീകരണങ്ങൾ",
      url: "/fpo/settings",
      icon: "Settings",
    },
    {
      id: "logout",
      title: "Logout",
      titleMl: "ലോഗൗട്ട്",
      url: "/logout",
      icon: "LogOut",
    },
  ],
};

/**
 * Default navigation config for Admin Portal
 */
export const adminNavigationConfig: NavigationConfig = {
  logo: {
    title: "KAU-FPO Platform",
    subtitle: "Admin Portal",
    icon: "Sprout",
  },
  groups: [
    {
      id: "main",
      label: "Dashboard",
      labelMl: "ഡാഷ്‌ബോർഡ്",
      items: [
        {
          id: "dashboard",
          title: "Overview",
          titleMl: "അവലോകനം",
          url: "/admin/dashboard",
          icon: "LayoutDashboard",
        },
        {
          id: "analytics",
          title: "Analytics",
          titleMl: "അനലിറ്റിക്സ്",
          url: "/admin/analytics",
          icon: "BarChart3",
        },
      ],
    },
    {
      id: "management",
      label: "Management",
      labelMl: "മാനേജ്‌മെന്റ്",
      items: [
        {
          id: "applications",
          title: "FPO Applications",
          titleMl: "FPO അപേക്ഷകൾ",
          url: "/admin/applications",
          icon: "FileText",
          badge: "12",
        },
        {
          id: "users",
          title: "User Management",
          titleMl: "ഉപയോക്തൃ മാനേജ്‌മെന്റ്",
          url: "/admin/users",
          icon: "Users",
        },
        {
          id: "languages",
          title: "Languages",
          titleMl: "ഭാഷകൾ",
          url: "/admin/languages",
          icon: "Globe",
        },
        {
          id: "notifications",
          title: "Notifications",
          titleMl: "അറിയിപ്പുകൾ",
          url: "/admin/notifications",
          icon: "Bell",
        },
        {
          id: "experts",
          title: "Expert Directory",
          titleMl: "വിദഗ്ധ ഡയറക്ടറി",
          url: "/admin/experts",
          icon: "User",
        },
      ],
    },
    {
      id: "reports",
      label: "Reports",
      labelMl: "റിപ്പോർട്ടുകൾ",
      items: [
        {
          id: "reports",
          title: "Generate Reports",
          titleMl: "റിപ്പോർട്ടുകൾ ജനറേറ്റ് ചെയ്യുക",
          url: "/admin/reports",
          icon: "ClipboardList",
        },
      ],
    },
  ],
  footerItems: [
    {
      id: "settings",
      title: "Settings",
      titleMl: "ക്രമീകരണങ്ങൾ",
      url: "/admin/settings",
      icon: "Settings",
    },
    {
      id: "logout",
      title: "Logout",
      titleMl: "ലോഗൗട്ട്",
      url: "/logout",
      icon: "LogOut",
    },
  ],
};

/**
 * Default navigation config for Government Portal
 */
export const governmentNavigationConfig: NavigationConfig = {
  logo: {
    title: "KAU-FPO Platform",
    subtitle: "Government Portal",
    icon: "Sprout",
  },
  groups: [
    {
      id: "main",
      label: "Dashboard",
      labelMl: "ഡാഷ്‌ബോർഡ്",
      items: [
        {
          id: "dashboard",
          title: "Overview",
          titleMl: "അവലോകനം",
          url: "/government/dashboard",
          icon: "LayoutDashboard",
        },
        {
          id: "analytics",
          title: "Analytics",
          titleMl: "അനലിറ്റിക്സ്",
          url: "/government/analytics",
          icon: "BarChart3",
        },
      ],
    },
    {
      id: "data",
      label: "Data & Reports",
      labelMl: "ഡാറ്റയും റിപ്പോർട്ടുകളും",
      items: [
        {
          id: "fpos",
          title: "FPO Directory",
          titleMl: "FPO ഡയറക്ടറി",
          url: "/government/fpos",
          icon: "Building2",
        },
        {
          id: "schemes",
          title: "Scheme Linkage",
          titleMl: "സ്കീം ലിങ്കേജ്",
          url: "/government/schemes",
          icon: "FileText",
        },
      ],
    },
  ],
  footerItems: [
    {
      id: "settings",
      title: "Settings",
      titleMl: "ക്രമീകരണങ്ങൾ",
      url: "/government/settings",
      icon: "Settings",
    },
    {
      id: "logout",
      title: "Logout",
      titleMl: "ലോഗൗട്ട്",
      url: "/logout",
      icon: "LogOut",
    },
  ],
};

/**
 * Default navigation config for CBBO/NGO Portal
 */
export const cbboNavigationConfig: NavigationConfig = {
  logo: {
    title: "KAU-FPO Platform",
    subtitle: "CBBO/NGO Portal",
    icon: "Sprout",
  },
  groups: [
    {
      id: "main",
      label: "Dashboard",
      labelMl: "ഡാഷ്‌ബോർഡ്",
      items: [
        {
          id: "dashboard",
          title: "Overview",
          titleMl: "അവലോകനം",
          url: "/cbbo/dashboard",
          icon: "LayoutDashboard",
        },
      ],
    },
    {
      id: "tasks",
      label: "Tasks",
      labelMl: "ടാസ്കുകൾ",
      items: [
        {
          id: "verifications",
          title: "FPO Verifications",
          titleMl: "FPO വെരിഫിക്കേഷനുകൾ",
          url: "/cbbo/verifications",
          icon: "CheckCircle",
        },
        {
          id: "reports",
          title: "Reports",
          titleMl: "റിപ്പോർട്ടുകൾ",
          url: "/cbbo/reports",
          icon: "ClipboardList",
        },
      ],
    },
  ],
  footerItems: [
    {
      id: "settings",
      title: "Settings",
      titleMl: "ക്രമീകരണങ്ങൾ",
      url: "/cbbo/settings",
      icon: "Settings",
    },
    {
      id: "logout",
      title: "Logout",
      titleMl: "ലോഗൗട്ട്",
      url: "/logout",
      icon: "LogOut",
    },
  ],
};
