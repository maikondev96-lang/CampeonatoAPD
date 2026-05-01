import { History as HistoryIcon, Star, Trophy, Users, Flag, Loader2 } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { Season } from '../types';

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
  const [champions, setChampions] = React.useState<Season[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchChampions = async () => {
      const { data } = await supabase
        .from('seasons')
        .select('*, competition:competitions(name), champion_team:teams!champion_team_id(*), runner_up_team:teams!runner_up_team_id(*)')
        .eq('status', 'finished')
        .order('year', { ascending: false });
      
      if (data) setChampions(data);
      setLoading(false);
    };
    fetchChampions();
  }, []);

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

      {/* HALL OF FAME */}
      <div style={{ marginTop: '8rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <h2 style={{ fontWeight: 950, fontSize: '2rem', display: 'flex', alignItems: 'center', gap: '15px', justifyContent: 'center' }}>
            <Trophy size={32} color="#eab308" /> GALERIA DE CAMPEÕES
          </h2>
          <p style={{ color: 'var(--text-muted)' }}>O hall da fama eterno da APD.</p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}><Loader2 className="animate-spin" /></div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
            {champions.map(s => (
              <div key={s.id} className="premium-card" style={{ padding: '2rem', border: '2px solid #eab308', background: 'linear-gradient(145deg, var(--card-bg), #fffbeb)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 950, color: '#854d0e' }}>{s.year}</div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#b45309', background: '#fef08a', padding: '4px 12px', borderRadius: '20px' }}>
                    {s.competition?.name}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                   <div style={{ position: 'relative' }}>
                      <img src={s.champion_team?.logo_url} style={{ width: '80px', height: '80px', objectFit: 'contain' }} />
                      <div style={{ position: 'absolute', bottom: -5, right: -5, background: '#eab308', borderRadius: '50%', padding: '4px' }}>
                        <Trophy size={14} color="white" />
                      </div>
                   </div>
                   <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '4px' }}>CAMPEÃO</div>
                      <h3 style={{ fontSize: '1.5rem', fontWeight: 950, color: 'var(--text-main)', margin: 0 }}>{s.champion_team?.name}</h3>
                   </div>
                </div>

                {s.runner_up_team && (
                  <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <img src={s.runner_up_team.logo_url} style={{ width: '40px', height: '40px', objectFit: 'contain', opacity: 0.6 }} />
                    <div style={{ fontSize: '0.85rem' }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-muted)' }}>Vice-campeão:</span> {s.runner_up_team.name}
                    </div>
                  </div>
                )}
              </div>
            ))}
            {champions.length === 0 && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>
                Aguardando a coroação do primeiro campeão oficial.
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ marginTop: '5rem', textAlign: 'center', background: 'var(--surface-alt)', padding: '3rem', borderRadius: '24px' }}>
         <h2 style={{ fontWeight: 950, marginBottom: '1rem' }}>Faça parte do próximo capítulo</h2>
         <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Estamos apenas começando. O futuro da APD é com você.</p>
         <button className="btn btn-primary">Inscrever meu Time</button>
      </div>
    </div>
  );
}
