import React from 'react';
import { useSeasonContext } from '../components/SeasonContext';
import { useOrganizationContext } from '../components/OrganizationContext';
import { Trophy, Plus, Settings, ChevronRight, Globe, Layers, Activity, History as HistoryIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import logoApd from '../assets/logo.png';
import apdNews from '../assets/apd-news.jpg';

export default function AdminHub() {
  const { organization } = useOrganizationContext();
  const { competitions, loading } = useSeasonContext();

  if (loading) return <div style={{ padding: '2rem' }}>Carregando...</div>;

  return (
    <div style={{ padding: '20px', color: 'black', background: 'white', minHeight: '100vh' }}>
      <h1>HUB ADMIN - TESTE SIMPLES</h1>
      <p>Organização: {organization?.name || 'Carregando...'}</p>
      <hr />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {competitions.map(comp => (
          <div key={comp.id} style={{ padding: '15px', border: '1px solid #ccc', borderRadius: '8px' }}>
            <strong>{comp.name}</strong>
            <br />
            <Link to={`/admin/${comp.slug}/2026`} style={{ color: 'blue', fontWeight: 'bold' }}>GERENCIAR</Link>
          </div>
        ))}
      </div>
      <hr />
      <div style={{ marginTop: '20px' }}>
        <Link to="/admin/news" style={{ display: 'block', padding: '10px', background: '#eee', marginBottom: '5px' }}>Notícias</Link>
        <Link to="/admin/history" style={{ display: 'block', padding: '10px', background: '#eee' }}>Histórico</Link>
      </div>
    </div>
  );
}

