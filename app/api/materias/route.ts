import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

// Configurações para static export
export const dynamic = 'force-static';
export const revalidate = false;

interface Materia {
  indice: number;
  disciplina: string;
  codigo: string;
  titulo: string;
}

interface DisciplinaComAssuntos {
  nome: string;
  assuntos: AssuntoItem[];
}

interface AssuntoItem {
  codigo: string;
  titulo: string;
  nivel: number;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const disciplinaSelecionada = searchParams.get('disciplina');

    // Ler o arquivo materias_globais.txt
    const filePath = join(process.cwd(), 'materias_globais.txt');
    const fileContent = readFileSync(filePath, 'utf-8');
    
    // Processar as linhas do arquivo
    const lines = fileContent.split('\n').slice(1); // Remove o cabeçalho
    const materias: Materia[] = [];
    
    for (const line of lines) {
      if (line.trim()) {
        const [indice, disciplina, codigo, titulo] = line.split('\t');
        if (indice && disciplina && codigo && titulo) {
          materias.push({
            indice: parseInt(indice),
            disciplina: disciplina.trim(),
            codigo: codigo.trim(),
            titulo: titulo.trim()
          });
        }
      }
    }

    // Se uma disciplina específica foi solicitada, retornar apenas seus assuntos
    if (disciplinaSelecionada) {
      const assuntosDaDisciplina = materias
        .filter(m => m.disciplina === disciplinaSelecionada)
        .map(m => ({
          codigo: m.codigo,
          titulo: m.titulo,
          nivel: m.codigo.split('.').length
        }))
        .sort((a, b) => {
          // Ordenar por código naturalmente (1.1, 1.2, 1.10, etc.)
          const aParts = a.codigo.split('.').map(Number);
          const bParts = b.codigo.split('.').map(Number);
          
          for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
            const aNum = aParts[i] || 0;
            const bNum = bParts[i] || 0;
            if (aNum !== bNum) return aNum - bNum;
          }
          return 0;
        });

      return NextResponse.json({
        success: true,
        data: {
          disciplina: disciplinaSelecionada,
          assuntos: assuntosDaDisciplina
        }
      });
    }

    // Obter lista única de disciplinas
    const disciplinasUnicas = [...new Set(materias.map(m => m.disciplina))]
      .sort((a, b) => a.localeCompare(b))
      .map(disciplina => {
        const assuntosDaDisciplina = materias
          .filter(m => m.disciplina === disciplina)
          .map(m => ({
            codigo: m.codigo,
            titulo: m.titulo,
            nivel: m.codigo.split('.').length
          }))
          .sort((a, b) => {
            const aParts = a.codigo.split('.').map(Number);
            const bParts = b.codigo.split('.').map(Number);
            
            for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
              const aNum = aParts[i] || 0;
              const bNum = bParts[i] || 0;
              if (aNum !== bNum) return aNum - bNum;
            }
            return 0;
          });

        return {
          nome: disciplina,
          assuntos: assuntosDaDisciplina
        };
      });

    return NextResponse.json({
      success: true,
      data: disciplinasUnicas
    });

  } catch (error) {
    console.error('Erro ao processar arquivo de matérias:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
