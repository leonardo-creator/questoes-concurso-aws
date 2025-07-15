import { redirect } from 'next/navigation';

// Força renderização dinâmica
export const dynamic = 'force-dynamic';

export default function HomePage() {
  // Redirecionar para a página de estudos
  redirect('/estudar');
}
