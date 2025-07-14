# Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2025-07-13 | Configuração NEXTAUTH_SECRET e resolução de erro JWT | NextAuth requer uma chave secreta para criptografar/descriptografar tokens JWT. Erro estava ocorrendo porque NEXTAUTH_SECRET não estava definido, causando falhas na autenticação de sessões. Adicionada chave de 32 bytes gerada aleatoriamente para garantir segurança. |
| 2025-07-13 | Atualização do .gitignore para incluir arquivos sensíveis | Adicionado .env e outros arquivos sensíveis ao .gitignore para evitar exposição de credenciais e configurações de ambiente em repositórios públicos. |
