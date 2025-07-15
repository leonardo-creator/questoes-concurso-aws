'use client';

// Força rendering dinâmico para evitar problemas de build
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default function ErrorBoundary({
  error,
  reset,
}: Readonly<{
  error: Error & { digest?: string }
  reset: () => void
}>) {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      color: '#333',
      textAlign: 'center',
      padding: '20px'
    }}>
      <h2 style={{ marginBottom: '16px', color: '#e74c3c' }}>Algo deu errado!</h2>
      <p style={{ marginBottom: '24px', opacity: 0.7 }}>
        Ocorreu um erro inesperado. Tente novamente.
      </p>
      <button
        onClick={() => reset()}
        style={{
          backgroundColor: '#3498db',
          color: 'white',
          border: 'none',
          padding: '12px 24px',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '16px'
        }}
      >
        Tentar novamente
      </button>
    </div>
  )
}
