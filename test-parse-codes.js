// Teste simples de parsing de códigos
const testString = '"140.3.3.3","2.3.3"';

console.log('Original:', testString);

const codigos = testString
  .split(',')
  .filter(Boolean)
  .map(codigo => codigo.trim().replace(/^["']|["']$/g, ''));

console.log('Processado:', codigos);

// Teste com diferentes formatos
const testCases = [
  '"140.3.3.3","2.3.3"',
  '140.3.3.3,2.3.3',
  '"140.3.3.3", "2.3.3"',
  '  140.3.3.3  ,  2.3.3  '
];

testCases.forEach((test, i) => {
  const result = test
    .split(',')
    .filter(Boolean)
    .map(codigo => codigo.trim().replace(/^["']|["']$/g, ''));
  console.log(`Teste ${i + 1}: "${test}" -> [${result.map(r => `"${r}"`).join(', ')}]`);
});
