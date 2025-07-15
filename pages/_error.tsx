interface ErrorProps {
  readonly statusCode?: number;
}

function ErrorPage({ statusCode }: ErrorProps) {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      fontFamily: 'system-ui, sans-serif',
      textAlign: 'center',
      padding: '20px'
    }}>
      <h1 style={{ fontSize: '4rem', margin: '0', color: '#666' }}>{statusCode || 'Error'}</h1>
      <h2 style={{ fontSize: '1.5rem', margin: '16px 0', color: '#333' }}>
        {statusCode === 404 ? 'Página não encontrada' : 'Erro interno do servidor'}
      </h2>
      <p style={{ color: '#666', marginBottom: '24px' }}>
        {statusCode === 404 ? 'A página que você procura não existe.' : 'Algo deu errado.'}
      </p>
      <a 
        href="/"
        style={{
          color: '#0070f3',
          textDecoration: 'none',
          padding: '12px 24px',
          border: '1px solid #0070f3',
          borderRadius: '6px',
          transition: 'all 0.2s'
        }}
      >
        Voltar ao início
      </a>
    </div>
  )
}

export default ErrorPage
