import { MyProfileLayout } from "@/components/profile/my-profile-layout";

export default function CbboProfileLayout({ children }: { children: React.ReactNode }) {
  return <MyProfileLayout basePath="/cbbo/profile">{children}</MyProfileLayout>;
}
