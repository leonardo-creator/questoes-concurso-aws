'use client';

import { useState } from 'react';
import type { QuestaoComponentProps } from '@/types';

export function QuestaoComponent({ questao, onResposta, respostaUsuario, showResult = false }: Readonly<QuestaoComponentProps>) {
  const [alternativaSelecionada, setAlternativaSelecionada] = useState<string>('');
  const [mostrarResposta, setMostrarResposta] = useState(showResult);

  const handleSelecionarAlternativa = (idAlternativa: string) => {
    if (mostrarResposta) return;
    
    setAlternativaSelecionada(idAlternativa);
  };

  const handleConfirmarResposta = () => {
    if (!alternativaSelecionada) return;
    
    onResposta(alternativaSelecionada);
    setMostrarResposta(true);
  };

  const proximaQuestao = () => {
    setAlternativaSelecionada('');
    setMostrarResposta(false);
  };

  const getClasseAlternativa = (idAlternativa: string) => {
    const baseClasses = 'p-4 border rounded-lg cursor-pointer transition-all duration-200 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2';
    
    if (mostrarResposta) {
      if (idAlternativa === questao.resposta) {
        return `${baseClasses} bg-green-50 border-green-300 text-green-800`;
      } else if (idAlternativa === alternativaSelecionada && idAlternativa !== questao.resposta) {
        return `${baseClasses} bg-red-50 border-red-300 text-red-800`;
      }
      return `${baseClasses} border-gray-200 opacity-60`;
    } else if (idAlternativa === alternativaSelecionada) {
      return `${baseClasses} bg-blue-50 border-blue-300 ring-2 ring-blue-200`;
    }
    
    return `${baseClasses} border-gray-200 hover:border-gray-300`;
  };

  const dificuldadeColor = (() => {
    switch (questao.dificuldade) {
      case 'Fácil':
        return 'bg-green-100 text-green-800';
      case 'Média':
        return 'bg-yellow-100 text-yellow-800';
      case 'Difícil':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  })();

  return (
    <div className="questao-container fade-in">
      {/* Cabeçalho da questão */}
      <div className="mb-6 pb-4 border-b border-gray-200">
        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-3">
          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
            {questao.codigo_real}
          </span>
          <span>{questao.bancas_sigla} • {questao.ano}</span>
          <span>{questao.disciplina_real}</span>
          <span className={`px-2 py-1 rounded-full text-xs ${dificuldadeColor}`}>
            {questao.dificuldade}
          </span>
          
          {questao.anulada && (
            <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs">
              Anulada
            </span>
          )}
          
          {questao.desatualizada && (
            <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs">
              Desatualizada
            </span>
          )}
        </div>
        
        <div className="text-sm text-gray-600">
          <strong>{questao.orgaos_nome}</strong> • {questao.cargos_descricao}
        </div>
      </div>

      {/* Enunciado */}
      <div 
        className="enunciado mb-6"
        dangerouslySetInnerHTML={{ __html: questao.enunciado }}
      />

      {/* Alternativas */}
      <div className="space-y-3 mb-6">
        {Array.isArray(questao.itens) && questao.itens.length > 0 ? (
          questao.itens.map((item) => {
            // Validação adicional dos dados do item
            if (!item || typeof item !== 'object') {
              console.warn('Item de alternativa inválido:', item);
              return null;
            }

            const idStr = String(item.id_alternativa || '');
            const letra = item.letra || '?';
            const texto = item.texto || 'Alternativa sem texto';

            return (
              <button
                key={`${questao.codigo_real}-${item.id_alternativa}`}
                className={getClasseAlternativa(idStr)}
                onClick={() => handleSelecionarAlternativa(idStr)}
                disabled={mostrarResposta}
                aria-pressed={alternativaSelecionada === idStr}
                aria-label={`Alternativa ${letra}`}
              >
                <div className="flex items-start">
                  <span className="font-semibold mr-3 mt-1 min-w-[20px] text-gray-600">
                    {letra})
                  </span>
                  <div className="flex-1 text-left">
                    {texto.includes('<') ? (
                      <div dangerouslySetInnerHTML={{ __html: texto }} />
                    ) : (
                      <span>{texto}</span>
                    )}
                  </div>
                </div>
              </button>
            );
          }).filter(Boolean)
        ) : (
          <div className="text-red-600 text-sm">
            Esta questão não possui alternativas cadastradas ou os dados estão corrompidos.
          </div>
        )}
      </div>

      {/* Ações */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-600">
          {questao.assunto_real && (
            <span>Assunto: <strong>{questao.assunto_real}</strong></span>
          )}
        </div>

        <div className="flex space-x-3">
          {!mostrarResposta ? (
            <button
              onClick={handleConfirmarResposta}
              disabled={!alternativaSelecionada}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Confirmar Resposta
            </button>
          ) : (
            <div className="flex items-center space-x-4">
              <div className={`text-sm font-medium ${
                alternativaSelecionada === questao.resposta ? 'text-green-600' : 'text-red-600'
              }`}>
                {alternativaSelecionada === questao.resposta ? '✓ Resposta Correta!' : '✗ Resposta Incorreta'}
              </div>
              
              <button
                onClick={proximaQuestao}
                className="btn-primary"
              >
                Próxima Questão
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Feedback adicional para questão respondida */}
      {mostrarResposta && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <div className="text-sm">
            <div className="mb-2">
              <strong>Resposta correta:</strong> 
              {questao.itens.find(item => String(item.id_alternativa) === questao.resposta)?.letra})
              {questao.itens.find(item => String(item.id_alternativa) === questao.resposta)?.texto && (
                <span className="ml-2">
                  {questao.itens.find(item => String(item.id_alternativa) === questao.resposta)?.texto?.substring(0, 100)}...
                </span>
              )}
            </div>
            
            {alternativaSelecionada !== questao.resposta && (
              <div className="text-red-600">
                <strong>Sua resposta:</strong> 
                {questao.itens.find(item => String(item.id_alternativa) === alternativaSelecionada)?.letra})
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
