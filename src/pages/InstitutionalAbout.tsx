import React from 'react';
import { useOrganizationContext } from '../components/OrganizationContext';
import { Shield, Target, Users, Award, ChevronRight } from 'lucide-react';

export default function InstitutionalAbout() {
  const { organization } = useOrganizationContext();

  return (
    <div className="animate-fade">
      {/* HERO SECTION */}
      <div style={{ 
        padding: '5rem 2rem', 
        background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)', 
        borderRadius: '24px', 
        color: 'white',
        textAlign: 'center',
        marginBottom: '4rem'
      }}>
        <h1 style={{ fontSize: 'clamp(2.5rem, 6vw, 4rem)', fontWeight: 950, marginBottom: '1.5rem', letterSpacing: '-0.04em' }}>
           MAIS QUE UMA LIGA, <br />UMA <span style={{ color: 'var(--primary-color)' }}>COMUNIDADE</span>.
        </h1>
        <p style={{ fontSize: '1.2rem', opacity: 0.8, maxWidth: '700px', margin: '0 auto' }}>
          Desde nossa fundação, a {organization?.name} tem como missão unir amigos através da paixão pelo futebol, promovendo o esporte amador com organização profissional.
        </p>
      </div>

      {/* CORE VALUES */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', marginBottom: '5rem' }}>
        <div className="premium-card" style={{ padding: '2.5rem', textAlign: 'center' }}>
          <div style={{ width: '60px', height: '60px', background: 'rgba(59,130,246,0.1)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
            <Shield size={32} color="var(--primary-color)" />
          </div>
          <h3 style={{ fontWeight: 900, marginBottom: '1rem' }}>Organização</h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            Trazemos a estrutura dos grandes campeonatos para o futebol de domingo. Estatísticas, súmulas e tabelas em tempo real.
          </p>
        </div>
        <div className="premium-card" style={{ padding: '2.5rem', textAlign: 'center' }}>
          <div style={{ width: '60px', height: '60px', background: 'rgba(34,197,94,0.1)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
            <Users size={32} color="var(--success)" />
          </div>
          <h3 style={{ fontWeight: 900, marginBottom: '1rem' }}>Comunidade</h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            Valorizamos o respeito e a amizade acima de tudo. Nosso portal é o ponto de encontro de centenas de atletas.
          </p>
        </div>
        <div className="premium-card" style={{ padding: '2.5rem', textAlign: 'center' }}>
          <div style={{ width: '60px', height: '60px', background: 'rgba(168,85,247,0.1)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
            <Award size={32} color="#a855f7" />
          </div>
          <h3 style={{ fontWeight: 900, marginBottom: '1rem' }}>Excelência</h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            Buscamos sempre a melhor experiência para os jogadores, com campos de qualidade e arbitragem comprometida.
          </p>
        </div>
      </div>

      {/* MISSION & VISION */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'center', marginBottom: '5rem' }}>
         <div>
            <h2 style={{ fontSize: '2rem', fontWeight: 950, marginBottom: '1.5rem' }}>Nossa <span style={{ color: 'var(--primary-color)' }}>Missão</span></h2>
            <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)', lineHeight: 1.8, marginBottom: '2rem' }}>
               Proporcionar uma experiência profissional aos amantes do futebol amador, integrando tecnologia, organização e paixão para elevar o nível das competições regionais.
            </p>
            <ul style={{ listStyle: 'none', padding: 0 }}>
               <li style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', fontWeight: 700 }}>
                  <ChevronRight size={18} color="var(--primary-color)" /> Fomento ao esporte local
               </li>
               <li style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', fontWeight: 700 }}>
                  <ChevronRight size={18} color="var(--primary-color)" /> Inclusão social através do lazer
               </li>
               <li style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', fontWeight: 700 }}>
                  <ChevronRight size={18} color="var(--primary-color)" /> Transparência em dados e resultados
               </li>
            </ul>
         </div>
         <div style={{ background: 'var(--surface-alt)', borderRadius: '24px', padding: '3rem', border: '1px solid var(--border-color)' }}>
            <Target size={48} color="var(--primary-color)" style={{ marginBottom: '1.5rem' }} />
            <h3 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '1rem' }}>Visão de Futuro</h3>
            <p style={{ color: 'var(--text-muted)', lineHeight: 1.7 }}>
               Ser a maior referência em gestão de ligas amadoras do país, utilizando nossa plataforma como base para a expansão de novos núcleos e modalidades esportivas, sempre mantendo a essência da APD.
            </p>
         </div>
      </div>
    </div>
  );
}
