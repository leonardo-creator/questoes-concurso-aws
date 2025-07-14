-- CreateTable
CREATE TABLE "saved_filters" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "filtros" JSONB NOT NULL,
    "favorito" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saved_filters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" SERIAL NOT NULL,
    "questaoId" INTEGER NOT NULL,
    "dificuldade" INTEGER NOT NULL,
    "bancasNome" TEXT NOT NULL,
    "bancasDescricao" TEXT NOT NULL,
    "bancasSigla" TEXT NOT NULL,
    "bancasOab" BOOLEAN NOT NULL,
    "cargosDescricao" TEXT NOT NULL,
    "orgaosNome" TEXT NOT NULL,
    "orgaosSigla" TEXT NOT NULL,
    "orgaosUf" TEXT NOT NULL,
    "anos" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "grupoQuestaoEnunciado" TEXT NOT NULL,
    "enunciado" TEXT NOT NULL,
    "hasImage" BOOLEAN NOT NULL,
    "hasImageItens" BOOLEAN NOT NULL,
    "provasNivel" TEXT NOT NULL,
    "areasDescricao" TEXT,
    "itens" JSONB NOT NULL,
    "resposta" TEXT NOT NULL,
    "assuntosPalavrasChave" TEXT[],
    "codigoReal" TEXT NOT NULL,
    "disciplinaReal" TEXT NOT NULL,
    "assuntoReal" TEXT NOT NULL,
    "anulada" BOOLEAN NOT NULL,
    "desatualizada" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_stats" (
    "id" TEXT NOT NULL,
    "totalQuestoes" INTEGER NOT NULL,
    "totalBancas" INTEGER NOT NULL,
    "totalAnos" INTEGER NOT NULL,
    "totalOrgaos" INTEGER NOT NULL,
    "atualizadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "question_stats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "saved_filters_userId_idx" ON "saved_filters"("userId");

-- CreateIndex
CREATE INDEX "saved_filters_userId_favorito_idx" ON "saved_filters"("userId", "favorito");

-- CreateIndex
CREATE UNIQUE INDEX "questions_questaoId_key" ON "questions"("questaoId");

-- CreateIndex
CREATE UNIQUE INDEX "questions_codigoReal_key" ON "questions"("codigoReal");

-- CreateIndex
CREATE INDEX "idx_questions_disciplina" ON "questions"("disciplinaReal");

-- CreateIndex
CREATE INDEX "idx_questions_banca" ON "questions"("bancasSigla");

-- CreateIndex
CREATE INDEX "idx_questions_ano" ON "questions"("anos");

-- CreateIndex
CREATE INDEX "idx_questions_dificuldade" ON "questions"("dificuldade");

-- CreateIndex
CREATE INDEX "idx_questions_uf" ON "questions"("orgaosUf");

-- CreateIndex
CREATE INDEX "idx_questions_tipo" ON "questions"("tipo");

-- CreateIndex
CREATE INDEX "idx_questions_nivel" ON "questions"("provasNivel");

-- CreateIndex
CREATE INDEX "idx_questions_anulada" ON "questions"("anulada");

-- CreateIndex
CREATE INDEX "idx_questions_desatualizada" ON "questions"("desatualizada");

-- CreateIndex
CREATE INDEX "idx_questions_disciplina_ano" ON "questions"("disciplinaReal", "anos");

-- CreateIndex
CREATE INDEX "idx_questions_banca_ano" ON "questions"("bancasSigla", "anos");

-- AddForeignKey
ALTER TABLE "saved_filters" ADD CONSTRAINT "saved_filters_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
