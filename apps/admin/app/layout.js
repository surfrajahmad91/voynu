import "../styles/globals.css";

export const metadata = {
  title: "VOYNU Admin",
  description: "VOYNU administration app",
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
