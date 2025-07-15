// Força rendering dinâmico para evitar problemas de build
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center flex-col font-sans text-center p-5">
      <h1 className="text-6xl m-0 text-gray-600">404</h1>
      <h2 className="text-2xl my-4 text-gray-800">
        Página não encontrada
      </h2>
      <p className="text-gray-600 mb-6">
        A página que você procura não existe.
      </p>
      <Link 
        href="/"
        className="text-blue-600 no-underline px-6 py-3 border border-blue-600 rounded-md transition-all duration-200 hover:bg-blue-50"
      >
        Voltar ao início
      </Link>
    </div>
  )
}
