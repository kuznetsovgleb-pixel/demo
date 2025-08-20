export const metadata = { title: 'Client Portal Lite', description: 'Demo' };
import './globals.css';
export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
