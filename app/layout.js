export const metadata = {
  title: "Voynu",
  description: "Book your perfect trip with Voynu",
};

import "./globals.css";
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
