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
    let classes = 'alternativa-item';
    
    if (mostrarResposta) {
      if (idAlternativa === questao.resposta) {
        classes += ' correct';
      } else if (idAlternativa === alternativaSelecionada && idAlternativa !== questao.resposta) {
        classes += ' incorrect';
      }
    } else if (idAlternativa === alternativaSelecionada) {
      classes += ' selected';
    }
    
    return classes;
  };

  const dificuldadeColor =
    questao.dificuldade === 'Fácil'
      ? 'bg-green-100 text-green-800'
      : questao.dificuldade === 'Média'
      ? 'bg-yellow-100 text-yellow-800'
      : 'bg-red-100 text-red-800';

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
            const idStr = String(item.id_alternativa);
            return (
              <div
                key={item.id_alternativa}
                className={getClasseAlternativa(idStr)}
                role="button"
                tabIndex={0}
                aria-pressed={alternativaSelecionada === idStr}
                onClick={() => handleSelecionarAlternativa(idStr)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSelecionarAlternativa(idStr);
                  }
                }}
                style={{ outline: 'none' }}
              >
                <div className="flex items-start">
                  <span className="font-semibold mr-3 mt-1 min-w-[20px]">
                    {item.letra})
                  </span>
                  <div
                    className="flex-1"
                    dangerouslySetInnerHTML={{ __html: item.texto }}
                  />
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-red-600 text-sm">Esta questão não possui alternativas cadastradas.</div>
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
