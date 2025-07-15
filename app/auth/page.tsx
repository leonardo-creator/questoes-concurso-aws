import Link from 'next/link'

export const metadata = {
  title: 'Autenticação - Questões de Concurso',
  description: 'Faça login ou crie uma conta para acessar o sistema'
}

export default function AuthPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Área de Autenticação
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Escolha uma opção para continuar
          </p>
        </div>
        
        <div className="mt-8 space-y-4">
          <Link
            href="/auth/signin"
            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
          >
            Entrar
          </Link>
          
          <Link
            href="/auth/signup"
            className="group relative w-full flex justify-center py-3 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
          >
            Criar Conta
          </Link>
          
          <Link
            href="/"
            className="group relative w-full flex justify-center py-3 px-4 text-sm font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
          >
            ← Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  )
}
