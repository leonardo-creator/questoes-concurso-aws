'use client';

import { useState } from 'react';
import type { BuscaHierarquica, AssuntoHierarquico } from '@/types';

interface AssuntosHierarquicosProps {
  disciplinas: BuscaHierarquica['disciplinas'];
  assuntosSelecionados: string[];
  onAssuntosChange: (assuntos: string[]) => void;
}

export function AssuntosHierarquicos({ 
  disciplinas, 
  assuntosSelecionados, 
  onAssuntosChange 
}: AssuntosHierarquicosProps) {
  const [disciplinasAbertas, setDisciplinasAbertas] = useState<Record<string, boolean>>({});
  const [assuntosAbertos, setAssuntosAbertos] = useState<Record<string, boolean>>({});

  const toggleDisciplina = (disciplina: string) => {
    setDisciplinasAbertas(prev => ({
      ...prev,
      [disciplina]: !prev[disciplina]
    }));
  };

  const toggleAssunto = (codigo: string) => {
    setAssuntosAbertos(prev => ({
      ...prev,
      [codigo]: !prev[codigo]
    }));
  };

  const toggleSelecaoAssunto = (assunto: string) => {
    const current = [...assuntosSelecionados];
    const index = current.indexOf(assunto);
    
    if (index > -1) {
      current.splice(index, 1);
    } else {
      current.push(assunto);
    }
    
    onAssuntosChange(current);
  };

  const renderAssunto = (assunto: AssuntoHierarquico, disciplinaNome: string) => {
    const temFilhos = assunto.temFilhos;
    const isAberto = assuntosAbertos[assunto.codigo];
    const isChecked = assuntosSelecionados.includes(assunto.titulo);
    const indentLevel = (assunto.nivel - 1) * 20;

    return (
      <div key={assunto.codigo} style={{ paddingLeft: `${indentLevel}px` }}>
        <div className="flex items-center p-1 hover:bg-gray-50 rounded">
          {temFilhos && (
            <button
              onClick={() => toggleAssunto(assunto.codigo)}
              className="mr-1 text-xs w-4 h-4 flex items-center justify-center text-gray-600 hover:text-gray-800"
            >
              {isAberto ? '−' : '+'}
            </button>
          )}
          
          {!temFilhos && <div className="w-5" />}
          
          <label className="flex items-center flex-1 cursor-pointer">
            <input
              type="checkbox"
              checked={isChecked}
              onChange={() => toggleSelecaoAssunto(assunto.titulo)}
              className="mr-2 text-xs"
            />
            <span className={`text-xs ${temFilhos ? 'font-medium text-gray-700' : 'text-gray-600'}`}>
              {assunto.titulo}
            </span>
          </label>
        </div>

        {/* Renderizar filhos se estiver aberto */}
        {temFilhos && isAberto && (
          <div className="ml-2">
            {disciplinas[disciplinaNome]?.assuntos
              .filter(a => a.pai === assunto.codigo)
              .map(assuntoFilho => renderAssunto(assuntoFilho, disciplinaNome))
            }
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-2">
      {Object.entries(disciplinas).map(([nome, disciplina]) => (
        <div key={nome} className="border border-gray-200 rounded">
          <button
            onClick={() => toggleDisciplina(nome)}
            className="flex justify-between items-center w-full text-left p-2 bg-gray-50 hover:bg-gray-100 rounded"
          >
            <span className="font-medium text-sm truncate">{nome}</span>
            <span className="text-xs text-gray-500 ml-2">
              {disciplinasAbertas[nome] ? '−' : '+'}
            </span>
          </button>
          
          {disciplinasAbertas[nome] && (
            <div className="p-2 max-h-64 overflow-y-auto">
              {/* Renderizar apenas assuntos raiz (nível 1) */}
              {disciplina.assuntos
                .filter(assunto => assunto.nivel === 1)
                .map(assunto => renderAssunto(assunto, nome))
              }
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
