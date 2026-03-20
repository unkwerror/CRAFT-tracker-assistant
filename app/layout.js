import './globals.css';

export const metadata = {
  title: 'Крафт Ассистент',
  description: 'Персональный помощник для сотрудников Крафт Групп',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Unbounded:wght@300;400;500;600;700&family=Golos+Text:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-craft-bg text-white font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
