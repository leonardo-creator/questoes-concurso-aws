// Tipos para as questões e dados relacionados

export type ItemQuestao = {
  texto: string;
  id_alternativa: number;
  letra: string; // Ex: "C", "E"
};

export type Questao = {
  id: number;
  codigo_real: string;
  dificuldade: 'Fácil' | 'Média' | 'Difícil';
  bancas_nome: string;
  bancas_sigla: string;
  cargos_descricao: string;
  orgaos_nome: string;
  orgaos_sigla: string;
  ano: number;
  enunciado: string; // HTML
  itens: ItemQuestao[];
  resposta: string; // id_alternativa da resposta correta
  disciplina_real: string;
  assunto_real: string;
  anulada: boolean;
  desatualizada: boolean;
};

export type QuestaoManifesto = Pick<Questao, 
  'codigo_real' | 
  'disciplina_real' | 
  'assunto_real' | 
  'bancas_sigla' | 
  'ano' | 
  'dificuldade' |
  'anulada' |
  'desatualizada'
>;

// Tipos para filtros
export type FiltroQuestoes = {
  disciplinas?: string[];
  assuntos?: string[];
  bancas?: string[];
  anos?: number[];
  dificuldades?: string[];
  incluirAnuladas?: boolean;
  incluirDesatualizadas?: boolean;
  naoRepetirRespondidas?: boolean;
  statusResposta?: 'acertadas' | 'erradas' | 'todas';
  codigosPersonalizados?: string[];
  cadernoId?: string;
};

export type OrdenacaoQuestoes = 'relevancia' | 'data_asc' | 'data_desc' | 'dificuldade_asc' | 'dificuldade_desc';

// Tipos para paginação
export type PaginacaoParams = {
  page: number;
  limit: number;
};

export type ResponsePaginado<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

// Tipos para índices gerados durante build
export type IndiceDisciplinas = {
  nome: string;
  count: number;
  assuntos: {
    nome: string;
    count: number;
  }[];
}[];

export type IndiceBancas = {
  sigla: string;
  nome: string;
  count: number;
}[];

export type IndiceAnos = {
  ano: number;
  count: number;
}[];

// Tipos para usuário e autenticação
export type Usuario = {
  id: string;
  email: string;
  name?: string;
  image?: string;
  createdAt: Date;
  updatedAt: Date;
};

// Tipos para respostas do usuário
export type RespostaUsuario = {
  id: string;
  userId: string;
  questaoCodigoReal: string;
  alternativaSelecionada: string;
  acertou: boolean;
  tempoResposta?: number; // em segundos
  createdAt: Date;
};

// Tipos para listas/cadernos personalizados
export type CadernoPersonalizado = {
  id: string;
  userId: string;
  nome: string;
  descricao?: string;
  questionCodes: string[]; // Array de codigo_real
  createdAt: Date;
  updatedAt: Date;
};

// Tipos para estatísticas do usuário
export type EstatisticasUsuario = {
  totalRespondidas: number;
  totalAcertos: number;
  percentualAcertos: number;
  estatisticasPorDisciplina: {
    disciplina: string;
    total: number;
    acertos: number;
    percentual: number;
  }[];
  estatisticasPorBanca: {
    banca: string;
    total: number;
    acertos: number;
    percentual: number;
  }[];
  estatisticasPorDificuldade: {
    dificuldade: string;
    total: number;
    acertos: number;
    percentual: number;
  }[];
};

// Tipos para sincronização offline
export type AcaoOffline = {
  id: string;
  tipo: 'resposta' | 'criar_caderno' | 'editar_caderno' | 'excluir_caderno';
  dados: any;
  timestamp: number;
  sincronizado: boolean;
};

// Tipos para API responses
export type ApiResponse<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};

export type QuestoesApiResponse = ResponsePaginado<Questao> & {
  filtrosAplicados: FiltroQuestoes;
  ordenacao: OrdenacaoQuestoes;
};

// Tipos para contextos React
export type AuthContextType = {
  user: Usuario | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<boolean>;
};

export type OfflineContextType = {
  isOnline: boolean;
  acoesPendentes: AcaoOffline[];
  adicionarAcao: (acao: Omit<AcaoOffline, 'id' | 'timestamp' | 'sincronizado'>) => void;
  sincronizar: () => Promise<void>;
};

// Tipos para componentes
export type QuestaoComponentProps = {
  questao: Questao;
  onResposta: (alternativa: string) => void;
  respostaUsuario?: RespostaUsuario;
  showResult?: boolean;
};

export type FiltrosComponentProps = {
  filtros: FiltroQuestoes;
  onFiltrosChange: (novosFiltros: FiltroQuestoes) => void;
  indices: {
    disciplinas: IndiceDisciplinas;
    bancas: IndiceBancas;
    anos: IndiceAnos;
  };
  cadernos: CadernoPersonalizado[];
};
