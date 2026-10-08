import { MyProfileLayout } from "@/components/profile/my-profile-layout";

export default function ExpertProfileLayout({ children }: { children: React.ReactNode }) {
  return <MyProfileLayout basePath="/expert/profile">{children}</MyProfileLayout>;
}
