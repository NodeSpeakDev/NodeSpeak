import './globals.css';
import type { Metadata } from 'next';
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { WalletProvider } from '@/contexts/WalletContext';

export const metadata: Metadata = {
    title: 'Node Speak Terminal',
    description: 'Enter the Matrix - A Web3 Community Platform',
    icons: {
        icon: [
            { url: '/favicon.ico' },
            { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
            { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
        ],
        apple: { url: '/apple-touch-icon.png' },
    },
    manifest: '/site.webmanifest',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                <link href="https://fonts.googleapis.com/css2?family=Source+Code+Pro:wght@400;600&display=swap" rel="stylesheet" />
                {/* Explicitly add favicon links for debugging */}
                <link rel="icon" href="/favicon.ico" sizes="any" />
                <link rel="icon" href="/favicon-16x16.png" type="image/png" sizes="16x16" />
                <link rel="icon" href="/favicon-32x32.png" type="image/png" sizes="32x32" />
                <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
                <link rel="manifest" href="/site.webmanifest" />
            </head>
            <body>
                <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
                    <WalletProvider>
                        {children}
                        <Toaster />
                    </WalletProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}