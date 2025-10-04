import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import type { Metadata } from 'next';
import { Toaster } from '@/components/ui/sonner';

export const metadata: Metadata = {
    title: 'Monad Agent',
    description: 'MetaMask SA on Monad',
    icons: {
        icon: '/monagent.jpeg',
        shortcut: '/monagent.jpeg',
        apple: '/monagent.jpeg',
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang='en' suppressHydrationWarning>
            <body className='min-h-screen bg-background text-foreground antialiased'>
                <ThemeProvider
                    attribute='class'
                    defaultTheme='dark'
                    enableSystem
                >
                    {children}
                </ThemeProvider>
                <Toaster />
            </body>
        </html>
    );
}
