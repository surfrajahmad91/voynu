import "./globals.css";
import VehicleCategoryBootstrap from "./components/VehicleCategoryBootstrap";

export const metadata = {
  title: "Voynu",
  description: "Book your perfect trip with Voynu",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <VehicleCategoryBootstrap />
        {children}
      </body>
    </html>
  );
}
