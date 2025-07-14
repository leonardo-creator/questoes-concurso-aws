'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';

interface CodigosEspecificosProps {
  codigos: string[];
  onChange: (codigos: string[]) => void;
  onValidate?: (codigos: string[]) => Promise<{ valid: string[], invalid: string[] }>;
}

export function CodigosEspecificos({ codigos, onChange, onValidate }: CodigosEspecificosProps) {
  const [inputValue, setInputValue] = useState('');
  const [codigosValidos, setCodigosValidos] = useState<string[]>([]);
  const [codigosInvalidos, setCodigosInvalidos] = useState<string[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [showPasteHelper, setShowPasteHelper] = useState(false);

  // Atualizar quando códigos externos mudarem
  useEffect(() => {
    setInputValue(codigos.join('\n'));
  }, [codigos]);

  // Parser inteligente para diferentes formatos
  const parseInput = useCallback((text: string): string[] => {
    if (!text.trim()) return [];

    // Remove espaços desnecessários e quebras de linha múltiplas
    const cleaned = text.trim();
    
    // Detectar diferentes separadores e formatos
    let parsedCodes: string[] = [];

    // Formato: "45.4564","574.45","..." (com aspas)
    if (cleaned.includes('"')) {
      const matches = cleaned.match(/"([^"]+)"/g);
      if (matches) {
        parsedCodes = matches.map(match => match.replace(/"/g, ''));
      }
    }
    // Formato: 45.4564,574.45,... (separado por vírgula)
    else if (cleaned.includes(',') && !cleaned.includes('\n')) {
      parsedCodes = cleaned.split(',').map(code => code.trim());
    }
    // Formato: uma linha por código
    else {
      parsedCodes = cleaned.split('\n').map(code => code.trim());
    }

    // Filtrar códigos vazios e remover duplicatas
    return Array.from(new Set(parsedCodes.filter(code => code.length > 0)));
  }, []);

  // Validar códigos em tempo real
  const validateCodes = useCallback(async (codes: string[]) => {
    if (!onValidate || codes.length === 0) {
      setCodigosValidos(codes);
      setCodigosInvalidos([]);
      return;
    }

    setIsValidating(true);
    try {
      const result = await onValidate(codes);
      setCodigosValidos(result.valid);
      setCodigosInvalidos(result.invalid);
    } catch (error) {
      console.error('Erro ao validar códigos:', error);
      setCodigosValidos([]);
      setCodigosInvalidos(codes);
    } finally {
      setIsValidating(false);
    }
  }, [onValidate]);

  // Handler para mudanças no input
  const handleInputChange = (value: string) => {
    setInputValue(value);
    const parsed = parseInput(value);
    onChange(parsed);
    validateCodes(parsed);
  };

  // Aplicar códigos válidos
  const aplicarCodigos = () => {
    const parsed = parseInput(inputValue);
    onChange(parsed);
    validateCodes(parsed);
  };

  // Limpar todos os códigos
  const limparCodigos = () => {
    setInputValue('');
    onChange([]);
    setCodigosValidos([]);
    setCodigosInvalidos([]);
  };

  // Helper para paste
  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      handleInputChange(text);
      setShowPasteHelper(false);
    } catch (error) {
      console.error('Erro ao colar do clipboard:', error);
    }
  };

  // Formatos de exemplo
  const formatosExemplo = [
    { 
      titulo: 'Lista com aspas', 
      exemplo: '"45.4564","574.45","123.456"',
      descricao: 'Formato mais comum para copy/paste'
    },
    { 
      titulo: 'Lista separada por vírgula', 
      exemplo: '45.4564,574.45,123.456',
      descricao: 'Simples e direto'
    },
    { 
      titulo: 'Uma linha por código', 
      exemplo: '45.4564\n574.45\n123.456',
      descricao: 'Melhor para listas longas'
    }
  ];

  const totalCodigos = codigosValidos.length + codigosInvalidos.length;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Códigos Específicos</span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPasteHelper(!showPasteHelper)}
            >
              💡 Ajuda
            </Button>
            {totalCodigos > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={limparCodigos}
              >
                Limpar
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Helper de formatos */}
        {showPasteHelper && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-blue-900">Formatos Suportados</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePaste}
                className="text-blue-700 hover:text-blue-900"
              >
                📋 Colar do Clipboard
              </Button>
            </div>
            
            {formatosExemplo.map((formato, index) => (
              <div key={index} className="border border-blue-200 rounded p-3 bg-white">
                <div className="font-medium text-sm text-blue-900 mb-1">{formato.titulo}</div>
                <code className="text-xs bg-gray-100 px-2 py-1 rounded block mb-1 font-mono">
                  {formato.exemplo}
                </code>
                <div className="text-xs text-blue-700">{formato.descricao}</div>
              </div>
            ))}
          </div>
        )}

        {/* Área de input */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Cole ou digite os códigos das questões:
          </label>
          <textarea
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="Cole aqui a lista de códigos...&#10;Exemplo: &quot;45.4564&quot;,&quot;574.45&quot;,&quot;123.456&quot;"
            className="w-full h-32 p-3 border border-gray-300 rounded-md text-sm font-mono focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none resize-none transition-all duration-200"
          />
        </div>

        {/* Estatísticas dos códigos */}
        {totalCodigos > 0 && (
          <div className="flex flex-wrap gap-2 items-center">
            <Badge variant="default">
              Total: {totalCodigos}
            </Badge>
            {codigosValidos.length > 0 && (
              <Badge variant="success">
                Válidos: {codigosValidos.length}
              </Badge>
            )}
            {codigosInvalidos.length > 0 && (
              <Badge variant="destructive">
                Inválidos: {codigosInvalidos.length}
              </Badge>
            )}
            {isValidating && (
              <Badge variant="secondary">
                Validando...
              </Badge>
            )}
          </div>
        )}

        {/* Lista de códigos inválidos */}
        {codigosInvalidos.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h4 className="font-medium text-red-900 mb-2">Códigos não encontrados:</h4>
            <div className="flex flex-wrap gap-1">
              {codigosInvalidos.slice(0, 20).map((codigo, index) => (
                <Badge key={index} variant="destructive" className="text-xs">
                  {codigo}
                </Badge>
              ))}
              {codigosInvalidos.length > 20 && (
                <Badge variant="outline" className="text-xs">
                  +{codigosInvalidos.length - 20} mais
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Preview dos códigos válidos */}
        {codigosValidos.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-medium text-green-900 mb-2">Códigos encontrados:</h4>
            <div className="flex flex-wrap gap-1">
              {codigosValidos.slice(0, 20).map((codigo, index) => (
                <Badge key={index} variant="success" className="text-xs">
                  {codigo}
                </Badge>
              ))}
              {codigosValidos.length > 20 && (
                <Badge variant="outline" className="text-xs">
                  +{codigosValidos.length - 20} mais
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Ações */}
        <div className="flex gap-2 pt-2">
          <Button 
            onClick={aplicarCodigos}
            disabled={totalCodigos === 0}
            className="flex-1"
          >
            Aplicar Filtro ({totalCodigos} códigos)
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
