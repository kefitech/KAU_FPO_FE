import { MyProfileLayout } from "@/components/profile/my-profile-layout";

export default function BuyerProfileLayout({ children }: { children: React.ReactNode }) {
  return <MyProfileLayout basePath="/buyer/profile">{children}</MyProfileLayout>;
}
