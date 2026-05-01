import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Match, RegistrationSubmission } from '../types';
import { 
  Users, Calendar, Shield, Trophy, 
  ArrowRight, ClipboardList, CheckCircle, Clock
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAdminContext } from '../components/AdminContext';
import { generateRoundRobin } from '../utils/tournamentGenerator';
import { advanceTeamsToKnockout } from '../utils/knockoutAdvancement';
import { Loader2, Wand2, Trophy as TrophyIcon } from 'lucide-react';

export default function AdminCompetitionDashboard() {
  const { activeCompetition, activeSeason, loading: ctxLoading } = useAdminContext();
  const [stats, setStats] = useState({
    teamsCount: 0,
    playersCount: 0,
    matchesCount: 0,
    pendingApprovals: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeSeason) fetchDashboardData();
  }, [activeSeason]);

  const fetchDashboardData = async () => {
    if (!activeSeason) return;
    setLoading(true);
    try {
      const [
        { count: teamsCount },
        { data: players },
        { count: matchesCount },
        { count: pendingCount }
      ] = await Promise.all([
        supabase.from('season_teams').select('*', { count: 'exact', head: true }).eq('season_id', activeSeason.id),
        supabase.from('season_teams').select('team:teams(players(*))').eq('season_id', activeSeason.id),
        supabase.from('matches').select('*', { count: 'exact', head: true }).eq('season_id', activeSeason.id),
        supabase.from('registration_submissions').select('*', { count: 'exact', head: true }).eq('season_id', activeSeason.id).eq('status', 'pending')
      ]);

      let pCount = 0;
      players?.forEach((p: any) => {
        pCount += p.team?.players?.length || 0;
      });

      setStats({
        teamsCount: teamsCount || 0,
        playersCount: pCount,
        matchesCount: matchesCount || 0,
        pendingApprovals: pendingCount || 0
      });
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateTournament = async () => {
    if (!activeSeason) return;
    if (stats.teamsCount < 2) return alert('É necessário pelo menos 2 times aprovados para gerar o torneio.');
    if (stats.matchesCount > 0) {
      if (!window.confirm('Já existem jogos cadastrados. Gerar novamente irá adicionar novos jogos à tabela. Deseja continuar?')) return;
    }

    setLoading(true);
    try {
      // 1. Buscar Times
      const { data: teamsData } = await supabase
        .from('season_teams')
        .select('team:teams(id, name)')
        .eq('season_id', activeSeason.id);
      
      const teams = teamsData?.map((t: any) => t.team) || [];

      // 2. Buscar Fase de Grupo/Liga
      const { data: stages } = await supabase
        .from('stages')
        .select('*')
        .eq('season_id', activeSeason.id)
        .order('order_index', { ascending: true });

      const groupStage = stages?.find(s => s.type === 'group' || s.type === 'league_round');
      if (!groupStage) throw new Error('Fase de grupo não encontrada. Verifique as configurações do campeonato.');

      // 3. Gerar Round Robin
      const isDoubleRound = activeCompetition?.type === 'hybrid' || activeCompetition?.type === 'league'; // Simplificação
      const schedule = generateRoundRobin(teams, isDoubleRound);

      // 4. Inserir Jogos
      const matchesToInsert = schedule.map(m => ({
        season_id: activeSeason.id,
        stage_id: groupStage.id,
        round: m.round,
        home_team_id: m.home_team_id,
        away_team_id: m.away_team_id,
        phase: groupStage.type === 'group' ? 'grupo' : 'grupo', // Mapping
        status: 'agendado'
      }));

      const { error: matchErr } = await supabase.from('matches').insert(matchesToInsert);
      if (matchErr) throw matchErr;

      alert(`✅ Tabela gerada com sucesso! ${matchesToInsert.length} jogos criados.`);
      fetchDashboardData();
    } catch (err: any) {
      alert('Erro ao gerar torneio: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdvanceToKnockout = async () => {
    if (!activeSeason) return;
    setLoading(true);
    try {
      const result = await advanceTeamsToKnockout(activeSeason.id);
      if (result.error) throw new Error(result.error);
      alert('🚀 Mata-mata gerado com sucesso com os melhores da classificação!');
      fetchDashboardData();
    } catch (err: any) {
      alert('Erro ao avançar: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (ctxLoading || loading) return <div style={{ textAlign: 'center', padding: '5rem' }}>Carregando Painel...</div>;

  const slug = activeCompetition?.slug;
  const year = activeSeason?.year;

  return (
    <div className="animate-fade">
      <div className="admin-header-app">
        <div className="admin-header-title">
          <TrophyIcon size={18} />
          <h1>{activeCompetition?.name}</h1>
        </div>
        <p className="admin-header-subtitle">Gestão da Temporada {year}</p>
      </div>

      {/* STATS MINI BAR (App Style) */}
      <div className="fs-comps-section" style={{ borderTop: 'none' }}>
        <div style={{ display: 'flex', width: '100%', padding: '12px 0' }}>
          <div style={{ flex: 1, textAlign: 'center', borderRight: '1px solid var(--border-color)' }}>
            <span style={{ display: 'block', fontSize: '1.1rem', fontWeight: 900, color: 'var(--success)' }}>{stats.teamsCount}</span>
            <span style={{ fontSize: '0.6rem', fontWeight: 800, color: 'var(--text-muted)' }}>TIMES</span>
          </div>
          <div style={{ flex: 1, textAlign: 'center', borderRight: '1px solid var(--border-color)' }}>
            <span style={{ display: 'block', fontSize: '1.1rem', fontWeight: 900, color: 'var(--primary-color)' }}>{stats.playersCount}</span>
            <span style={{ fontSize: '0.6rem', fontWeight: 800, color: 'var(--text-muted)' }}>ATLETAS</span>
          </div>
          <div style={{ flex: 1, textAlign: 'center', borderRight: '1px solid var(--border-color)' }}>
            <span style={{ display: 'block', fontSize: '1.1rem', fontWeight: 900, color: '#a855f7' }}>{stats.matchesCount}</span>
            <span style={{ fontSize: '0.6rem', fontWeight: 800, color: 'var(--text-muted)' }}>JOGOS</span>
          </div>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <span style={{ display: 'block', fontSize: '1.1rem', fontWeight: 900, color: 'var(--error)' }}>{stats.pendingApprovals}</span>
            <span style={{ fontSize: '0.6rem', fontWeight: 800, color: 'var(--text-muted)' }}>PENDENTES</span>
          </div>
        </div>
      </div>
      {/* QUICK ACCESS (List Style) */}
      <div className="fs-comps-section" style={{ marginTop: '1rem' }}>
        <div className="fs-section-header" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Clock size={12} color="var(--primary-dark)" /> AÇÕES RÁPIDAS
        </div>
        <div className="fs-comps-list">
            <Link to={`/admin/${slug}/${year}/jogos`} className="fs-comp-item">
              <div className="fs-comp-details"><h3 className="fs-comp-name">Lançar Resultados</h3></div>
              <ArrowRight size={14} color="var(--text-muted)" style={{ marginLeft: 'auto' }} />
            </Link>
            <Link to={`/admin/${slug}/${year}/inscricoes`} className="fs-comp-item">
              <div className="fs-comp-details"><h3 className="fs-comp-name">Aprovar Times</h3></div>
              <ArrowRight size={14} color="var(--text-muted)" style={{ marginLeft: 'auto' }} />
            </Link>
            <Link to={`/admin/${slug}/${year}/times`} className="fs-comp-item">
              <div className="fs-comp-details"><h3 className="fs-comp-name">Gerenciar Elencos</h3></div>
              <ArrowRight size={14} color="var(--text-muted)" style={{ marginLeft: 'auto' }} />
            </Link>
            <Link to={`/admin/${slug}/${year}/sorteio`} className="fs-comp-item">
              <div className="fs-comp-details"><h3 className="fs-comp-name">Sorteio de Grupos</h3></div>
              <ArrowRight size={14} color="var(--text-muted)" style={{ marginLeft: 'auto' }} />
            </Link>
        </div>
      </div>

      <div className="fs-comps-section" style={{ marginTop: '1rem' }}>
        <div className="fs-section-header">GERAÇÃO DE TABELAS</div>
        <div className="fs-comps-list" style={{ padding: '12px 16px', gap: '8px', display: 'flex', flexDirection: 'column' }}>
            <button 
              className="btn-app-primary" 
              style={{ width: '100%', background: 'var(--brand-dark)', color: 'var(--primary-color)' }}
              onClick={handleGenerateTournament}
              disabled={loading}
            >
              {loading ? <Loader2 className="animate-spin" size={16} /> : <Wand2 size={16} />} Gerar Tabela Completa
            </button>
            <button 
              className="btn-app-primary" 
              style={{ width: '100%', background: 'var(--surface-alt)', color: '#ca8a04', border: '1px solid #ca8a04' }}
              onClick={handleAdvanceToKnockout}
              disabled={loading}
            >
              {loading ? <Loader2 className="animate-spin" size={16} /> : <TrophyIcon size={16} />} Finalizar Grupos e Gerar Mata-Mata
            </button>
        </div>
      </div>

      <div className="fs-comps-section" style={{ marginTop: '1rem', marginBottom: '2rem' }}>
        <div className="fs-section-header">STATUS DA INSCRIÇÃO</div>
        <div style={{ padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--success)', fontWeight: 800, fontSize: '0.8rem', marginBottom: '8px' }}>
             <CheckCircle size={14} /> INSCRIÇÕES ABERTAS
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: 1.4, margin: 0 }}>
            Você tem {stats.pendingApprovals} solicitações aguardando revisão.
          </p>
        </div>
      </div>
    </div>
  );
}
