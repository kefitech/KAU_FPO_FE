"use client";

import { AlertCircle, Construction } from "lucide-react";
import { useParams } from "next/navigation";

import { DPR_SECTION_KEYS, findSectionInfo, type DprSectionKey } from "@/lib/api/dpr";

import { BaselineSection } from "../_components/baseline-section";
import { IdentificationSection } from "../_components/identification-section";
import { ComponentsSection } from "../_components/components-section";
import { InvestmentSection } from "../_components/investment-section";
import { NatureOfBusinessSection } from "../_components/nature-of-business-section";
import { CapacitySection } from "../_components/capacity-section";
import { CivilSection } from "../_components/civil-section";
import { ComplianceSection } from "../_components/compliance-section";
import { ESSSection } from "../_components/ess-section";
import { FinanceSection } from "../_components/finance-section";
import { HRSection } from "../_components/hr-section";
import { ImplementationSection } from "../_components/implementation-section";
import { SiteSection } from "../_components/site-section";
import { TechnologySection } from "../_components/technology-section";
import { UtilitiesSection } from "../_components/utilities-section";
import { LocationSection } from "../_components/location-section";
import { MachinerySection } from "../_components/machinery-section";
import { MarketSection } from "../_components/market-section";
import { ProductsSection } from "../_components/products-section";
import { RationaleSection } from "../_components/rationale-section";
import { RawMaterialSection } from "../_components/raw-material-section";
import { RiskSection } from "../_components/risk-section";
import { SectionShell } from "../_components/section-shell";

/**
 * Section dispatcher — routes each section key to its dedicated form
 * component. Unknown keys → 404-style error. Known keys without an
 * implementation yet → "coming soon" placeholder inside the shell.
 */
export default function DprSectionPage() {
  const params = useParams<{ uuid: string; key: string }>();
  const { uuid, key } = params;
  const info = findSectionInfo(key);

  if (!info) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <div>
          <p className="text-sm font-medium">
            Unknown section: <code>{key}</code>
          </p>
          <p className="mt-1 text-muted-foreground text-xs">
            Valid keys: {DPR_SECTION_KEYS.join(", ")}
          </p>
        </div>
      </div>
    );
  }

  switch (key as DprSectionKey) {
    case "identification":
      return <IdentificationSection uuid={uuid} />;
    case "components":
      return <ComponentsSection uuid={uuid} />;
    case "nature-of-business":
      return <NatureOfBusinessSection uuid={uuid} />;
    case "investment":
      return <InvestmentSection uuid={uuid} />;
    case "baseline":
      return <BaselineSection uuid={uuid} />;
    case "rationale":
      return <RationaleSection uuid={uuid} />;
    case "products":
      return <ProductsSection uuid={uuid} />;
    case "location":
      return <LocationSection uuid={uuid} />;
    case "capacity":
      return <CapacitySection uuid={uuid} />;
    case "compliance":
      return <ComplianceSection uuid={uuid} />;
    case "civil":
      return <CivilSection uuid={uuid} />;
    case "site":
      return <SiteSection uuid={uuid} />;
    case "hr":
      return <HRSection uuid={uuid} />;
    case "implementation":
      return <ImplementationSection uuid={uuid} />;
    case "risk":
      return <RiskSection uuid={uuid} />;
    case "machinery":
      return <MachinerySection uuid={uuid} />;
    case "ess":
      return <ESSSection uuid={uuid} />;
    case "utilities":
      return <UtilitiesSection uuid={uuid} />;
    case "raw-material":
      return <RawMaterialSection uuid={uuid} />;
    case "market":
      return <MarketSection uuid={uuid} />;
    case "technology":
      return <TechnologySection uuid={uuid} />;
    case "finance":
      return <FinanceSection uuid={uuid} />;
    default:
      return (
        <SectionShell uuid={uuid} sectionKey={key as DprSectionKey}>
          <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-16 text-center">
            <Construction className="h-10 w-10 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Section form coming soon</p>
              <p className="mt-1 text-muted-foreground text-xs">
                Backend API is ready — this form ships in a later milestone.
              </p>
            </div>
          </div>
        </SectionShell>
      );
  }
}
