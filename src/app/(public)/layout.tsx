import { AgrulStyles } from "./_components/agrul-styles";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AgrulStyles />
      {children}
    </>
  );
}
