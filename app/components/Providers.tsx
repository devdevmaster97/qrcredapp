'use client';

import { SessionProvider } from 'next-auth/react';
import { Toaster } from 'react-hot-toast';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <Toaster
        position="top-center"
        reverseOrder={false}
        gutter={8}
        containerClassName=""
        containerStyle={{}}
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
            maxWidth: '500px',
            padding: '12px 16px',
            borderRadius: '8px',
            fontSize: '14px'
          },
          success: {
            style: {
              background: '#00875f',
              color: '#fff'
            },
            iconTheme: {
              primary: '#fff',
              secondary: '#00875f'
            }
          },
          error: {
            style: {
              background: '#e53e3e',
              color: '#fff'
            },
            iconTheme: {
              primary: '#fff',
              secondary: '#e53e3e'
            }
          },
          loading: {
            style: {
              background: '#3b82f6',
              color: '#fff'
            }
          }
        }}
      />
      {children}
    </SessionProvider>
  );
} 