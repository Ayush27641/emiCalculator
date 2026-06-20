import "./globals.css";

export const metadata = {
  title: "EMI Workspace — Loan EMI Calculator with Shared Workspace",
  description:
    "A collaborative Loan EMI Calculator where changes in one browser tab are instantly reflected across all open tabs. Built with Next.js, React, and BroadcastChannel API.",
  keywords: "EMI calculator, loan calculator, amortization schedule, shared workspace, real-time sync",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
