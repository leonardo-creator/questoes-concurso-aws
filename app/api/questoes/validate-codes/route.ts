﻿import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// ConfiguraÃ§Ãµes para static export
export const dynamic = 'force-static';
export const revalidate = false;

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'NÃ£o autorizado' },
        { status: 401 }
      );
    }

    const { codes } = await request.json();

    if (!Array.isArray(codes)) {
      return NextResponse.json(
        { success: false, error: 'CÃ³digos devem ser um array' },
        { status: 400 }
      );
    }

    // Buscar questÃµes existentes no banco
    const questoesExistentes = await prisma.question.findMany({
      where: {
        codigoReal: {
          in: codes,
        },
      },
      select: {
        codigoReal: true,
      },
    });

    const codigosValidos = questoesExistentes.map(q => q.codigoReal);
    const codigosInvalidos = codes.filter(code => !codigosValidos.includes(code));

    return NextResponse.json({
      success: true,
      data: {
        valid: codigosValidos,
        invalid: codigosInvalidos,
        total: codes.length,
        validCount: codigosValidos.length,
        invalidCount: codigosInvalidos.length,
      },
    });
  } catch (error) {
    console.error('Erro ao validar cÃ³digos:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

