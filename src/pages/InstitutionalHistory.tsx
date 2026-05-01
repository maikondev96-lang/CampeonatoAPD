import React from 'react';
import { History as HistoryIcon, Star, Trophy, Users, Flag } from 'lucide-react';

const timeline = [
  {
    year: '2022',
    title: 'A Semente',
    desc: 'Um grupo de amigos decide organizar as "peladas" de domingo com placares marcados e uniformes básicos.',
    icon: Flag,
    color: '#64748b'
  },
  {
    year: '2023',
    title: 'Primeiro Torneio Oficial',
    desc: 'A primeira Copa APD é realizada com 8 equipes convidadas. O sucesso foi imediato.',
    icon: Trophy,
    color: '#eab308'
  },
  {
    year: '2024',
    title: 'Expansão Tecnológica',
    desc: 'Lançamento da primeira versão do portal web para acompanhamento de resultados e artilharia.',
    icon: Star,
    color: '#3b82f6'
  },
  {
    year: '2025',
    title: 'Associação APD',
    desc: 'Formalização da Associação Peladeiros de Domingo. Recorde de 24 equipes inscritas e múltiplos torneios no ano.',
    icon: Users,
    color: '#22c55e'
  },
  {
    year: '2026',
    title: 'O Portal Profissional',
    desc: 'Refatoração completa para o modelo institucional GE, permitindo a gestão de campeonatos em larga escala.',
    icon: HistoryIcon,
    color: 'var(--primary-color)'
  }
];

export default function InstitutionalHistory() {
  return (
    <div className="animate-fade" style={{ maxWidth: '900px', margin: '0 auto', paddingBottom: '5rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
        <h1 className="section-title" style={{ justifyContent: 'center', fontSize: '2.5rem' }}>
           <HistoryIcon size={32} /> NOSSA HISTÓRIA
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>A trajetória de quem ama o futebol e acredita na organização.</p>
      </div>

      <div style={{ position: 'relative' }}>
        {/* Linha Central */}
        <div style={{ 
          position: 'absolute', 
          left: '50%', 
          top: 0, 
          bottom: 0, 
          width: '2px', 
          background: 'var(--border-color)', 
          transform: 'translateX(-50%)' 
        }} />

        {timeline.map((item, idx) => (
          <div key={item.year} style={{ 
            display: 'flex', 
            justifyContent: idx % 2 === 0 ? 'flex-start' : 'flex-end', 
            width: '100%', 
            marginBottom: '4rem',
            position: 'relative'
          }}>
            {/* Ponto Central */}
            <div style={{ 
              position: 'absolute', 
              left: '50%', 
              top: '20px', 
              width: '16px', 
              height: '16px', 
              background: item.color, 
              borderRadius: '50%', 
              transform: 'translateX(-50%)',
              border: '4px solid var(--bg-color)',
              zIndex: 2
            }} />

            <div className="premium-card" style={{ 
              width: '45%', 
              padding: '2rem', 
              textAlign: idx % 2 === 0 ? 'right' : 'left',
              position: 'relative'
            }}>
              <div style={{ 
                fontSize: '2rem', 
                fontWeight: 950, 
                color: item.color, 
                marginBottom: '0.5rem',
                fontFamily: 'monospace' 
              }}>
                {item.year}
              </div>
              <h3 style={{ fontWeight: 900, fontSize: '1.2rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '10px', justifyContent: idx % 2 === 0 ? 'flex-end' : 'flex-start' }}>
                 {idx % 2 !== 0 && <item.icon size={20} color={item.color} />}
                 {item.title}
                 {idx % 2 === 0 && <item.icon size={20} color={item.color} />}
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                {item.desc}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '5rem', textAlign: 'center', background: 'var(--surface-alt)', padding: '3rem', borderRadius: '24px' }}>
         <h2 style={{ fontWeight: 950, marginBottom: '1rem' }}>Faça parte do próximo capítulo</h2>
         <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Estamos apenas começando. O futuro da APD é com você.</p>
         <button className="btn btn-primary">Inscrever meu Time</button>
      </div>
    </div>
  );
}
