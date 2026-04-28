import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Users, Calendar, Settings, ArrowRight, Trophy, Loader2, CheckCircle2, AlertCircle, Zap } from 'lucide-react';
import { supabase } from '../supabaseClient';

interface TournamentStatus {
  total_grupo: number;
  finished_grupo: number;
  bracket_gerado: boolean;
  finais_geradas: boolean;
}

const Admin = () => {
  const [status, setStatus] = useState<TournamentStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [generatingBracket, setGeneratingBracket] = useState(false);
  const [bracketResult, setBracketResult] = useState<{ success: boolean; message: string } | null>(null);

  const loadStatus = async () => {
    setLoadingStatus(true);
    try {
      const [{ count: total }, { count: finished }, { data: meta }] = await Promise.all([
        supabase.from('matches').select('id', { count: 'exact', head: true }).eq('phase', 'grupo'),
        supabase.from('matches').select('id', { count: 'exact', head: true }).eq('phase', 'grupo').eq('status', 'finalizado'),
        supabase.from('tournament_meta').select('key, value_bool'),
      ]);

      const bracketGerado = meta?.find(m => m.key === 'bracket_gerado')?.value_bool ?? false;
      const finaisGeradas = meta?.find(m => m.key === 'finais_geradas')?.value_bool ?? false;

      setStatus({
        total_grupo: total ?? 0,
        finished_grupo: finished ?? 0,
        bracket_gerado: bracketGerado,
        finais_geradas: finaisGeradas,
      });
    } catch (err) {
      console.error('Erro ao carregar status do torneio:', err);
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => { loadStatus(); }, []);

  const handleGenerateBracket = async () => {
    setGeneratingBracket(true);
    setBracketResult(null);
    try {
      const { data, error } = await supabase.rpc('generate_knockout_bracket');
      if (error) throw error;
      setBracketResult({ success: data?.success, message: data?.message });
      if (data?.success) await loadStatus();
    } catch (err: any) {
      setBracketResult({ success: false, message: err.message || 'Erro ao gerar bracket.' });
    } finally {
      setGeneratingBracket(false);
    }
  };

  const groupProgress = status ? Math.round((status.finished_grupo / (status.total_grupo || 1)) * 100) : 0;

  return (
    <div className="animate-fade" style={{ maxWidth: '960px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 className="section-title" style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Settings size={28} /> Painel de Controle
        </h1>
        <p style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.95rem' }}>
          Gestão completa da Copa do Mundo APD.
        </p>
      </div>

      {/* Cards de módulos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
        <Link to="/admin/times" className="card card-hover" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid var(--border-color)' }}>
          <div style={{ background: 'var(--primary-dark)', color: 'white', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={24} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--primary-dark)', marginBottom: '0.35rem' }}>Times</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, lineHeight: 1.4 }}>Cadastre seleções e gerencie escudos.</p>
          </div>
          <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--primary-color)', fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase' }}>
            Acessar <ArrowRight size={14} />
          </div>
        </Link>

        <Link to="/admin/jogadores" className="card card-hover" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid var(--border-color)' }}>
          <div style={{ background: 'var(--primary-dark)', color: 'white', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={24} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--primary-dark)', marginBottom: '0.35rem' }}>Jogadores</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, lineHeight: 1.4 }}>Gerencie o elenco e vincule atletas.</p>
          </div>
          <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--primary-color)', fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase' }}>
            Acessar <ArrowRight size={14} />
          </div>
        </Link>

        <Link to="/admin/jogos" className="card card-hover" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid var(--border-color)' }}>
          <div style={{ background: 'var(--primary-dark)', color: 'white', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Calendar size={24} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--primary-dark)', marginBottom: '0.35rem' }}>Jogos</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, lineHeight: 1.4 }}>Lance resultados e gerencie o calendário.</p>
          </div>
          <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--primary-color)', fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase' }}>
            Acessar <ArrowRight size={14} />
          </div>
        </Link>
      </div>

      {/* ── Automação do Torneio ── */}
      <div className="premium-card" style={{ marginBottom: '1.5rem' }}>
        <div className="premium-card-header" style={{ padding: '1rem 1.25rem' }}>
          <div className="section-label-bar">
            <span className="header-main-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Zap size={16} color="var(--primary-color)" /> Automação do Torneio
            </span>
          </div>
        </div>

        <div style={{ padding: '1.25rem' }}>
          {/* Progress da fase de grupos */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Fase de Grupos
              </span>
              {loadingStatus ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <span style={{ fontSize: '0.8rem', fontWeight: 900, color: groupProgress === 100 ? 'var(--primary-color)' : 'var(--text-muted)' }}>
                  {status?.finished_grupo ?? 0} / {status?.total_grupo ?? 0} jogos
                </span>
              )}
            </div>
            <div style={{ background: 'var(--bg-color)', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
              <div style={{
                background: groupProgress === 100 ? 'var(--primary-color)' : 'var(--secondary-color)',
                width: `${groupProgress}%`,
                height: '100%',
                borderRadius: '4px',
                transition: 'width 0.4s ease',
              }} />
            </div>
          </div>

          {/* Status flags */}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 700 }}>
              {status?.bracket_gerado
                ? <CheckCircle2 size={16} color="var(--primary-color)" />
                : <AlertCircle size={16} color="var(--secondary-color)" />}
              <span style={{ color: status?.bracket_gerado ? 'var(--primary-color)' : 'var(--text-muted)' }}>
                {status?.bracket_gerado ? 'Semifinais geradas' : 'Semifinais pendentes'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 700 }}>
              {status?.finais_geradas
                ? <CheckCircle2 size={16} color="var(--primary-color)" />
                : <AlertCircle size={16} color="var(--secondary-color)" />}
              <span style={{ color: status?.finais_geradas ? 'var(--primary-color)' : 'var(--text-muted)' }}>
                {status?.finais_geradas ? 'Final e 3º lugar gerados' : 'Final e 3º lugar pendentes'}
              </span>
            </div>
          </div>

          {/* Botão de geração */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <button
              onClick={handleGenerateBracket}
              disabled={generatingBracket || status?.bracket_gerado === true}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                background: status?.bracket_gerado ? 'var(--bg-color)' : 'var(--primary-dark)',
                color: status?.bracket_gerado ? 'var(--text-muted)' : '#fff',
                border: 'none', borderRadius: '10px',
                padding: '0.65rem 1.25rem',
                fontWeight: 800, fontSize: '0.85rem',
                cursor: generatingBracket || status?.bracket_gerado ? 'not-allowed' : 'pointer',
                transition: 'opacity 0.2s',
                opacity: generatingBracket ? 0.7 : 1,
              }}
            >
              {generatingBracket
                ? <><Loader2 size={16} className="animate-spin" /> Gerando...</>
                : status?.bracket_gerado
                  ? <><CheckCircle2 size={16} /> Bracket já gerado</>
                  : <><Trophy size={16} /> Gerar Mata-Mata</>
              }
            </button>

            {bracketResult && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                fontSize: '0.82rem', fontWeight: 700,
                color: bracketResult.success ? 'var(--primary-color)' : 'var(--error)',
              }}>
                {bracketResult.success
                  ? <CheckCircle2 size={15} />
                  : <AlertCircle size={15} />
                }
                {bracketResult.message}
              </div>
            )}
          </div>

          <p style={{ marginTop: '1rem', fontSize: '0.72rem', color: 'var(--text-subtle)', fontWeight: 600, lineHeight: 1.5 }}>
            🤖 <strong>Automático:</strong> o bracket também é gerado automaticamente quando o último jogo da fase de grupos for finalizado. A Final e o 3º Lugar são gerados automaticamente após as duas semifinais serem concluídas.
          </p>
        </div>
      </div>

      {/* Aviso */}
      <div style={{ padding: '1rem 1.25rem', background: 'var(--bg-color)', borderRadius: '12px', border: '1px dashed var(--border-color)', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.82rem' }}>
          Qualquer alteração realizada aqui impacta em tempo real o portal público dos torcedores.
        </p>
      </div>
    </div>
  );
};

export default Admin;
