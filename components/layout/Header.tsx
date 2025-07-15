'use client';

import { useAuth } from '@/contexts/AuthContext';

export function Header() {
  const { user, signOut } = useAuth();
  const isOnline = true; // Temporário - remover funcionalidade offline
  const acoesPendentes: any[] = []; // Temporário - remover funcionalidade offline

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold text-gray-900">
              Questões de Concurso
            </h1>
            
            {/* Indicador de status */}
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm text-gray-600">
                {isOnline ? 'Online' : 'Offline'}
              </span>
              
              {acoesPendentes.length > 0 && (
                <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                  {acoesPendentes.length} pendente{acoesPendentes.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {user && (
              <>
                <div className="text-sm">
                  <span className="text-gray-600">Olá, </span>
                  <span className="font-medium">{user.name || user.email}</span>
                </div>
                
                <nav className="hidden md:flex space-x-4">
                  <a href="/estudar" className="text-gray-600 hover:text-gray-900">
                    Estudar
                  </a>
                  <a href="/cadernos" className="text-gray-600 hover:text-gray-900">
                    Cadernos
                  </a>
                  <a href="/estatisticas" className="text-gray-600 hover:text-gray-900">
                    Estatísticas
                  </a>
                </nav>
                
                <button
                  onClick={signOut}
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Sair
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
