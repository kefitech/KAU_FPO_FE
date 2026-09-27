import AgrulLayout from "../_components/agrul-layout";
import BreadCrumb from "../_components/bread-crumb";
import KVKGrid from "../_components/kvk-grid";

// KAU 2026-09-27: Public /krishi-vigyan-kendra page — lists Krishi Vigyan
// Kendras statewide. Data is admin-managed via the KVK Links tab on
// /admin/site-content, so this page shell stays static.

export default function KrishiVigyanKendraPage() {
  return (
    <AgrulLayout>
      <BreadCrumb
        title="Krishi Vigyan Kendra"
        breadCrumb="Krishi Vigyan Kendra Directory"
      />
      <KVKGrid />
    </AgrulLayout>
  );
}
