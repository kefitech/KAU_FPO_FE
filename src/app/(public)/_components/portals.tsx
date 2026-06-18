import Link from "next/link";

import { ArrowRight, Building2, Landmark, ShieldCheck, Sprout } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

const PORTALS = [
  {
    icon: Sprout,
    title: "FPO Portal",
    badge: "For FPO Managers",
    description:
      "Manage your Farmer Producer Organization — register members, track crops, access markets, and get AI-based recommendations.",
    href: "/fpo/dashboard",
    color: "text-green-600",
    bgColor: "bg-green-100",
    badgeColor: "border-green-200 bg-green-50 text-green-700",
  },
  {
    icon: ShieldCheck,
    title: "Admin Portal",
    badge: "For Administrators",
    description:
      "Full system control — manage FPO registrations, approve applications, configure platform settings, and oversee operations.",
    href: "/admin/dashboard",
    color: "text-blue-600",
    bgColor: "bg-blue-100",
    badgeColor: "border-blue-200 bg-blue-50 text-blue-700",
  },
  {
    icon: Landmark,
    title: "Government Portal",
    badge: "For Officials",
    description:
      "Monitor FPO performance across districts, generate compliance reports, and track agricultural programme outcomes.",
    href: "/government/dashboard",
    color: "text-purple-600",
    bgColor: "bg-purple-100",
    badgeColor: "border-purple-200 bg-purple-50 text-purple-700",
  },
  {
    icon: Building2,
    title: "CBBO Portal",
    badge: "For CBBO Coordinators",
    description:
      "Cluster-level oversight of FPO activities, capacity building tracking, and linkage programme management.",
    href: "/cbbo/dashboard",
    color: "text-orange-600",
    bgColor: "bg-orange-100",
    badgeColor: "border-orange-200 bg-orange-50 text-orange-700",
  },
];

export function Portals() {
  return (
    <section id="portals" className="bg-white py-20">
      <div className="container mx-auto max-w-7xl px-4">
        <div className="mb-12 text-center">
          <h2 className="font-bold text-3xl text-gray-900 md:text-4xl">Portals for every stakeholder</h2>
          <p className="mt-4 text-muted-foreground">Each role gets a dedicated, tailored experience</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {PORTALS.map((portal) => {
            const Icon = portal.icon;
            return (
              <Card key={portal.title} className="group flex flex-col border transition-shadow hover:shadow-lg">
                <CardHeader className="pb-3">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${portal.bgColor}`}>
                    <Icon className={`h-6 w-6 ${portal.color}`} />
                  </div>
                  <Badge variant="outline" className={`mt-3 w-fit text-xs ${portal.badgeColor}`}>
                    {portal.badge}
                  </Badge>
                  <h3 className="font-semibold text-base text-gray-900">{portal.title}</h3>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col justify-between gap-4">
                  <p className="text-muted-foreground text-sm">{portal.description}</p>
                  <Button variant="outline" size="sm" className="w-full group-hover:border-green-300" asChild>
                    <Link href={portal.href}>
                      Go to {portal.title}
                      <ArrowRight className="ml-2 h-3 w-3" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
