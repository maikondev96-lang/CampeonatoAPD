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
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 className="section-title" style={{ margin: 0 }}>PAINEL DE CONTROLE</h1>
        <p style={{ color: 'var(--text-muted)' }}>Gestão completa da {activeCompetition?.name}.</p>
      </div>

      {/* STATS GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
        <div className="premium-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'rgba(34,197,94,0.1)', padding: '0.75rem', borderRadius: '12px' }}><Shield color="var(--success)" /></div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 950 }}>{stats.teamsCount}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>TIMES</div>
          </div>
        </div>
        <div className="premium-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'rgba(59,130,246,0.1)', padding: '0.75rem', borderRadius: '12px' }}><Users color="var(--primary-color)" /></div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 950 }}>{stats.playersCount}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>JOGADORES</div>
          </div>
        </div>
        <div className="premium-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'rgba(168,85,247,0.1)', padding: '0.75rem', borderRadius: '12px' }}><Calendar color="#a855f7" /></div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 950 }}>{stats.matchesCount}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>JOGOS</div>
          </div>
        </div>
        <div className="premium-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'rgba(239,68,68,0.1)', padding: '0.75rem', borderRadius: '12px' }}><ClipboardList color="var(--error)" /></div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 950 }}>{stats.pendingApprovals}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>PENDENTES</div>
          </div>
        </div>
      </div>

      {/* QUICK ACCESS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        <div className="premium-card" style={{ padding: '2rem' }}>
          <h3 style={{ fontWeight: 950, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={20} color="var(--primary-color)" /> AÇÕES RÁPIDAS
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <Link to={`/admin/${slug}/${year}/jogos`} className="btn btn-secondary" style={{ justifyContent: 'space-between' }}>
              Lançar Resultados <ArrowRight size={16} />
            </Link>
            <Link to={`/admin/${slug}/${year}/inscricoes`} className="btn btn-secondary" style={{ justifyContent: 'space-between' }}>
              Aprovar Times <ArrowRight size={16} />
            </Link>
            <Link to={`/admin/${slug}/${year}/times`} className="btn btn-secondary" style={{ justifyContent: 'space-between' }}>
              Gerenciar Elencos <ArrowRight size={16} />
            </Link>
            <Link to={`/admin/${slug}/${year}/sorteio`} className="btn btn-secondary" style={{ justifyContent: 'space-between' }}>
              Sorteio de Grupos <ArrowRight size={16} />
            </Link>
            <button 
              className="btn btn-primary" 
              style={{ marginTop: '0.5rem', background: 'var(--brand-dark)', color: 'var(--primary-color)', border: '1px solid var(--primary-color)' }}
              onClick={handleGenerateTournament}
              disabled={loading}
            >
              {loading ? <Loader2 className="animate-spin" /> : <Wand2 size={18} />} Gerar Tabela Completa
            </button>
            <button 
              className="btn btn-secondary" 
              style={{ marginTop: '0.5rem', background: 'rgba(234,179,8,0.1)', color: '#ca8a04', border: '1px solid #ca8a04' }}
              onClick={handleAdvanceToKnockout}
              disabled={loading}
            >
              {loading ? <Loader2 className="animate-spin" /> : <TrophyIcon size={18} />} Finalizar Grupos e Gerar Mata-Mata
            </button>
          </div>
        </div>

        <div className="premium-card" style={{ padding: '2rem', background: 'linear-gradient(135deg, var(--surface-alt) 0%, var(--card-bg) 100%)' }}>
          <h3 style={{ fontWeight: 950, marginBottom: '1rem' }}>STATUS DA COMPETIÇÃO</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--success)', fontWeight: 800, fontSize: '0.9rem', marginBottom: '1.5rem' }}>
             <CheckCircle size={18} /> INSCRIÇÕES ABERTAS
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            O link de inscrição pública está ativo. Você tem {stats.pendingApprovals} solicitações aguardando revisão.
          </p>
          <button className="btn btn-primary" style={{ width: '100%' }}>Configurar Inscrições</button>
        </div>
      </div>
    </div>
  );
}
