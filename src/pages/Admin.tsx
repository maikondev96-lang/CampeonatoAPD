import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Users, Calendar, Settings, ArrowRight } from 'lucide-react';

const Admin = () => {
  return (
    <div className="animate-fade" style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ marginBottom: '3rem' }}>
        <h1 className="section-title" style={{ marginBottom: '0.5rem' }}><Settings /> Painel de Controle</h1>
        <p style={{ color: 'var(--text-muted)', fontWeight: 700, fontSize: '1.1rem' }}>
          Gestão completa da Copa do Mundo APD.
        </p>
      </div>
      
      <div className="admin-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
        <Link to="/admin/times" className="card card-hover" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem', border: '2px solid var(--border-color)' }}>
          <div style={{ background: 'var(--primary-dark)', color: 'white', width: '56px', height: '56px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={32} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 950, color: 'var(--primary-dark)', marginBottom: '0.5rem' }}>Times</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 700, lineHeight: 1.4 }}>Cadastre as seleções e gerencie os escudos oficiais.</p>
          </div>
          <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary-color)', fontWeight: 900, fontSize: '0.8rem', textTransform: 'uppercase' }}>
            Acessar Módulo <ArrowRight size={16} />
          </div>
        </Link>
        
        <Link to="/admin/jogadores" className="card card-hover" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem', border: '2px solid var(--border-color)' }}>
          <div style={{ background: 'var(--primary-dark)', color: 'white', width: '56px', height: '56px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={32} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 950, color: 'var(--primary-dark)', marginBottom: '0.5rem' }}>Jogadores</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 700, lineHeight: 1.4 }}>Gerencie o elenco de cada equipe e vincule atletas.</p>
          </div>
          <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary-color)', fontWeight: 900, fontSize: '0.8rem', textTransform: 'uppercase' }}>
            Acessar Módulo <ArrowRight size={16} />
          </div>
        </Link>
        
        <Link to="/admin/jogos" className="card card-hover" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem', border: '2px solid var(--border-color)' }}>
          <div style={{ background: 'var(--primary-dark)', color: 'white', width: '56px', height: '56px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Calendar size={32} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 950, color: 'var(--primary-dark)', marginBottom: '0.5rem' }}>Jogos</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 700, lineHeight: 1.4 }}>Lance resultados, cartões e gerencie o calendário.</p>
          </div>
          <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary-color)', fontWeight: 900, fontSize: '0.8rem', textTransform: 'uppercase' }}>
            Acessar Módulo <ArrowRight size={16} />
          </div>
        </Link>
      </div>

      <div style={{ marginTop: '3rem', padding: '1.5rem', background: '#f8fafc', borderRadius: '16px', border: '2px dashed var(--border-color)', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.9rem' }}>
          Qualquer alteração realizada aqui impacta em tempo real o portal público dos torcedores.
        </p>
      </div>
    </div>
  );
};

export default Admin;
