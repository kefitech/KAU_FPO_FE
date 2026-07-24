import packageJson from "../../package.json";

const currentYear = new Date().getFullYear();

export const APP_CONFIG = {
  name: "Studio Admin",
  version: packageJson.version,
  copyright: `© ${currentYear}, Kefi Tech Solutions Pvt Ltd.`,
  meta: {
    title: "KAU FPO Plateform - Modern FPO Dashboard by Kerala Agriculture University",
    description:
      "A unified digital platform connecting Farmer Producer Organizations (FPOs) with knowledge resources, experts, institutions, schemes, and growth opportunities.",
  },
};
