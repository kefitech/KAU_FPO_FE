import { MyProfileLayout } from "@/components/profile/my-profile-layout";

export default function GovernmentProfileLayout({ children }: { children: React.ReactNode }) {
  return <MyProfileLayout basePath="/government/profile">{children}</MyProfileLayout>;
}
