import { BarChart3, Brain, Globe, MapPin, MessageSquare, ShieldCheck, ShoppingCart, Users } from "lucide-react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";

const FEATURES = [
  {
    icon: Brain,
    title: "AI Crop Recommendations",
    description:
      "Get intelligent crop suggestions based on soil type, climate, and market demand specific to your district.",
  },
  {
    icon: Users,
    title: "FPO Management",
    description: "Manage members, track registrations, and handle the complete FPO lifecycle digitally.",
  },
  {
    icon: ShoppingCart,
    title: "Market Linkage",
    description: "Connect directly to ONDC and FarmerConnect markets. List products and reach buyers across Kerala.",
  },
  {
    icon: MessageSquare,
    title: "Expert Consultancy",
    description: "Book sessions with agricultural experts and KAU specialists for advice on farming challenges.",
  },
  {
    icon: MapPin,
    title: "GIS Mapping",
    description:
      "Visualize farm locations, crop coverage, and resource distribution across districts on interactive maps.",
  },
  {
    icon: BarChart3,
    title: "Analytics & Reports",
    description: "Track FPO performance, revenue, member growth, and generate government compliance reports.",
  },
  {
    icon: Globe,
    title: "Bilingual Support",
    description: "Full platform support in English and Malayalam (മലയാളം) for all farmers and officials.",
  },
  {
    icon: ShieldCheck,
    title: "Role-Based Access",
    description: "Separate, secure portals for FPO managers, admins, government officials, and CBBO coordinators.",
  },
];

export function Features() {
  return (
    <section id="features" className="bg-gray-50 py-20">
      <div className="container mx-auto max-w-7xl px-4">
        <div className="mb-12 text-center">
          <h2 className="font-bold text-3xl text-gray-900 md:text-4xl">Everything you need to manage an FPO</h2>
          <p className="mt-4 text-muted-foreground">
            A complete digital toolkit built for Kerala's agricultural ecosystem
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.title} className="border-0 shadow-sm transition-shadow hover:shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                    <Icon className="h-5 w-5 text-green-600" />
                  </div>
                  <h3 className="mt-3 font-semibold text-gray-900 text-sm">{feature.title}</h3>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">{feature.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
