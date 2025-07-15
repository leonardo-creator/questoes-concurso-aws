-- Script SQL para remover constraint do codigoReal
DROP INDEX IF EXISTS questions_codigoReal_key;
DROP INDEX IF EXISTS questions_codigo_real_key;
ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_codigoReal_key;
ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_codigo_real_key;
ALTER TABLE questions DROP CONSTRAINT IF EXISTS Question_codigoReal_key;
ALTER TABLE questions DROP CONSTRAINT IF EXISTS Question_codigo_real_key;
