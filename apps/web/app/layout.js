import "../styles/globals.css";

export const metadata = { title: "VOYNU", description: "Book your perfect trip with VOYNU" };

export default function RootLayout({ children }) {
  return <html lang="en"><body>{children}</body></html>;
}
