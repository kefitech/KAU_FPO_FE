import Link from "next/link";
import AgrulLayout from "./_components/agrul-layout";

export default function NotFound() {
  return (
    <AgrulLayout>
      <div
        style={{
          background: "#1a5c38",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "60px 20px",
        }}
      >
        <img
          src="/assets/img/shape/34.png"
          alt="404"
          style={{ width: "clamp(280px, 50vw, 600px)", height: "auto" }}
        />
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "60px 20px",
        }}
      >
        <h2
          style={{
            fontSize: "clamp(22px, 4vw, 36px)",
            fontWeight: 700,
            color: "#232323",
            margin: "0 0 12px",
          }}
        >
          Page Not Found
        </h2>
        <p
          style={{
            fontSize: "16px",
            color: "#666",
            maxWidth: "420px",
            marginBottom: "36px",
            lineHeight: 1.7,
          }}
        >
          This page is not available yet. Head back to the home page.
        </p>
        <Link
          href="/"
          style={{
            display: "inline-block",
            background: "#4caf50",
            color: "#fff",
            padding: "14px 36px",
            borderRadius: "4px",
            fontWeight: 600,
            fontSize: "15px",
            textDecoration: "none",
            letterSpacing: "0.5px",
          }}
        >
          Back to Home
        </Link>
      </div>
    </AgrulLayout>
  );
}
