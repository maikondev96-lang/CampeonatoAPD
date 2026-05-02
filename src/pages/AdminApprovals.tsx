import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAdminContext } from '../components/AdminContext';
import { 
  Loader2, CheckCircle2, XCircle, Clock, X, FileCheck2, 
  Users, User, Shirt, MapPin, Search 
} from 'lucide-react';
import { RegistrationSubmission, PlayerRegistration } from '../types';
import { useQuery } from '@tanstack/react-query';
import { useQueryEngine } from '../query/useQueryEngine';
import { QueryView } from '../query/QueryView';
import { AdminEngine } from '../admin/adminEngine';

export default function AdminApprovals() {
  const { activeSeason } = useAdminContext();
  const [tab, setTab] = useState<'teams' | 'players' | 'links'>('teams');
  const [selectedSub, setSelectedSub] = useState<RegistrationSubmission | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerRegistration | null>(null);
  const [feedback, setFeedback] = useState('');

  // 1. DATA LAYER (READ)
  const query = useQuery({
    queryKey: ['adminApprovals', activeSeason?.id],
    queryFn: async () => {
      if (!activeSeason) return null;
      
      const [sRes, pRes, lRes] = await Promise.all([
        supabase.from('registration_submissions').select('*, registration_link:registration_links!inner(season_id)').eq('registration_link.season_id', activeSeason.id).order('created_at', { ascending: false }),
        supabase.from('player_registrations').select('*, team:teams(name)').eq('season_id', activeSeason.id).order('created_at', { ascending: false }),
        supabase.from('registration_links').select('*').eq('season_id', activeSeason.id).order('created_at', { ascending: false })
      ]);

      return {
        submissions: (sRes.data || []) as RegistrationSubmission[],
        playerRegs: (pRes.data || []) as PlayerRegistration[],
        regLinks: (lRes.data || []) as any[]
      };
    },
    enabled: !!activeSeason
  });

  const { state, data, refetch } = useQueryEngine(query);

  // 2. ADMIN ENGINE (WRITE)
  const handleApproveTeam = async (submission: RegistrationSubmission) => {
    if (!window.confirm(`Aprovar a equipe ${submission.team_name}? Ela será inserida no torneio oficialmente.`)) return;
    
    await AdminEngine.safeMutation({
      mutationFn: async () => {
        const { data: newTeam, error: teamErr } = await supabase.from('teams').insert([{
          name: submission.team_name,
          short_name: submission.team_short_name || submission.team_name.substring(0, 3).toUpperCase(),
          logo_url: submission.team_logo_url || null,
          active: true
        }]).select().single();
        if (teamErr) throw teamErr;

        await supabase.from('season_teams').insert([{
          season_id: activeSeason!.id,
          team_id: newTeam.id,
        }]);

        const playersToInsert = (submission.players_data || []).map((p: any) => ({
          name: p.name,
          shirt_number: p.number ? parseInt(p.number) : null,
          position: p.position || null,
          team_id: newTeam.id,
          active: true,
          photo_url: p.photo || null
        }));

        if (playersToInsert.length > 0) {
          await supabase.from('players').insert(playersToInsert);
        }

        await supabase.from('registration_submissions').update({ status: 'approved' }).eq('id', submission.id);
      },
      invalidateKeys: [['adminApprovals', activeSeason?.id], ['seasonTeams'], ['players']],
      onSuccess: () => {
        alert('Equipe aprovada e integrada com sucesso!');
        setSelectedSub(null);
        refetch();
      },
      onError: (err: any) => alert(err.message)
    });
  };

  const handleApprovePlayer = async (reg: PlayerRegistration) => {
    await AdminEngine.safeMutation({
      mutationFn: async () => {
        const { error } = await supabase.from('player_registrations').update({ status: 'approved' }).eq('id', reg.id);
        if (error) throw error;
      },
      invalidateKeys: [['adminApprovals', activeSeason?.id], ['players']],
      onSuccess: () => {
        alert('Jogador aprovado!');
        setSelectedPlayer(null);
        refetch();
      },
      onError: (err: any) => alert(err.message)
    });
  };

  const handleGenerateLink = async () => {
    if (!activeSeason) return;
    await AdminEngine.safeMutation({
      mutationFn: async () => {
        const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        const { error } = await supabase.from('registration_links').insert([{
          season_id: activeSeason.id,
          token: token,
          active: true,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        }]);
        if (error) throw error;
      },
      invalidateKeys: [['adminApprovals', activeSeason?.id]],
      onSuccess: () => refetch(),
      onError: (err: any) => alert(err.message)
    });
  };

  const handleToggleLink = async (id: string, current: boolean) => {
    await AdminEngine.safeMutation({
      mutationFn: async () => {
        await supabase.from('registration_links').update({ active: !current }).eq('id', id);
      },
      invalidateKeys: [['adminApprovals', activeSeason?.id]],
      onSuccess: () => refetch(),
      onError: (err: any) => alert(err.message)
    });
  };

  const handleReject = async (type: 'team' | 'player', id: string) => {
    if (!feedback) return alert('Informe o motivo da rejeição.');
    
    await AdminEngine.safeMutation({
      mutationFn: async () => {
        if (type === 'team') {
          await supabase.from('registration_submissions').update({ status: 'rejected', admin_feedback: feedback }).eq('id', id);
        } else {
          await supabase.from('player_registrations').update({ status: 'rejected', feedback: feedback }).eq('id', id);
        }
      },
      invalidateKeys: [['adminApprovals', activeSeason?.id]],
      onSuccess: () => {
        setSelectedSub(null);
        setSelectedPlayer(null);
        setFeedback('');
        refetch();
      },
      onError: (err: any) => alert(err.message)
    });
  };

  return (
    <div className="animate-fade" style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <h1 className="section-title" style={{ margin: 0 }}><FileCheck2 /> Gestão de Inscrições</h1>
        <div style={{ display: 'flex', background: 'var(--surface-alt)', padding: '4px', borderRadius: '12px' }}>
          <button onClick={() => setTab('teams')} style={{ padding: '0.6rem 1.2rem', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem', background: tab === 'teams' ? 'var(--card-bg)' : 'transparent', color: tab === 'teams' ? 'var(--primary-color)' : 'var(--text-muted)', boxShadow: tab === 'teams' ? 'var(--shadow-sm)' : 'none' }}>
            <Users size={16} /> Equipes
          </button>
          <button onClick={() => setTab('links')} style={{ padding: '0.6rem 1.2rem', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem', background: tab === 'links' ? 'var(--card-bg)' : 'transparent', color: tab === 'links' ? 'var(--primary-color)' : 'var(--text-muted)', boxShadow: tab === 'links' ? 'var(--shadow-sm)' : 'none' }}>
            <Search size={16} /> Links de Inscrição
          </button>
        </div>
      </div>

      <QueryView state={state} data={data} onRetry={refetch}>
        {(content) => {
          const pendingTeams = content.submissions.filter(s => s.status === 'pending');
          const pendingPlayers = content.playerRegs.filter(p => p.status === 'pending');

          return (
            <>
              {tab === 'teams' ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
                  {pendingTeams.length === 0 ? (
                    <div style={{ gridColumn: '1 / -1', padding: '4rem', textAlign: 'center', background: 'var(--surface-alt)', borderRadius: '20px' }}>
                        <CheckCircle2 size={48} color="var(--success)" style={{ margin: '0 auto 1rem' }} />
                        <p style={{ fontWeight: 700 }}>Tudo em dia! Nenhuma equipe pendente.</p>
                    </div>
                  ) : (
                    pendingTeams.map(sub => (
                        <div key={sub.id} className="card card-hover" style={{ cursor: 'pointer', padding: '1.5rem' }} onClick={() => setSelectedSub(sub)}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <div style={{ width: '40px', height: '40px', background: 'var(--bg-color)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Users size={20} color="var(--primary-color)" />
                            </div>
                            <span className="badge" style={{ background: 'rgba(234,179,8,0.1)', color: '#eab308' }}>PENDENTE</span>
                          </div>
                          <h3 style={{ fontWeight: 900, fontSize: '1.1rem', marginBottom: '0.5rem' }}>{sub.team_name}</h3>
                          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Responsável: {sub.manager_name}</p>
                          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Jogadores: {sub.players_data?.length || 0}</p>
                        </div>
                    ))
                  )}
                </div>
              ) : tab === 'players' ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
                  {pendingPlayers.length === 0 ? (
                    <div style={{ gridColumn: '1 / -1', padding: '4rem', textAlign: 'center', background: 'var(--surface-alt)', borderRadius: '20px' }}>
                        <CheckCircle2 size={48} color="var(--success)" style={{ margin: '0 auto 1rem' }} />
                        <p style={{ fontWeight: 700 }}>Tudo em dia! Nenhum jogador pendente.</p>
                    </div>
                  ) : (
                    pendingPlayers.map(p => (
                        <div key={p.id} className="card card-hover" style={{ cursor: 'pointer', padding: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }} onClick={() => setSelectedPlayer(p)}>
                          <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'var(--bg-color)', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                            {p.photo_url ? <img src={p.photo_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <User color="var(--text-subtle)" style={{ margin: '10px' }} />}
                          </div>
                          <div style={{ flex: 1 }}>
                            <h3 style={{ fontWeight: 900, fontSize: '1rem', marginBottom: '2px' }}>{p.name}</h3>
                            <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary-color)' }}>{p.team?.name}</p>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.position} • Nº {p.shirt_number}</p>
                          </div>
                          <div style={{ width: '30px', height: '30px', background: 'rgba(234,179,8,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Clock size={14} color="#eab308" />
                          </div>
                        </div>
                    ))
                  )}
                </div>
              ) : (
                <div className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <h3 style={{ margin: 0, fontWeight: 900 }}>Links de Inscrição Ativos</h3>
                    <button className="btn btn-primary" onClick={handleGenerateLink} disabled={AdminEngine.isMutating}>+ Gerar Novo Link</button>
                  </div>

                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Token / Link</th>
                          <th>Expira em</th>
                          <th>Status</th>
                          <th>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {content.regLinks.map(link => (
                          <tr key={link.id}>
                            <td>
                              <code style={{ fontSize: '0.7rem', color: 'var(--primary-color)' }}>{link.token}</code>
                              <button className="btn-icon" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/register/${link.token}`); alert('Link copiado!'); }} style={{ marginLeft: '10px' }}>Copiar URL</button>
                            </td>
                            <td>{link.expires_at ? new Date(link.expires_at).toLocaleDateString() : 'Nunca'}</td>
                            <td><span className={`badge ${link.active ? 'badge-success' : 'badge-danger'}`}>{link.active ? 'ATIVO' : 'DESATIVADO'}</span></td>
                            <td>
                              <button className="btn-icon" onClick={() => handleToggleLink(link.id, link.active)}>
                                {link.active ? <XCircle size={16} /> : <CheckCircle2 size={16} />}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          );
        }}
      </QueryView>

      {/* Modal Jogador */}
      {selectedPlayer && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="card animate-fade" style={{ width: '100%', maxWidth: '450px', padding: 0, overflow: 'hidden' }}>
            <div style={{ height: '120px', background: 'var(--primary-color)', position: 'relative' }}>
              <button onClick={() => setSelectedPlayer(null)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'rgba(0,0,0,0.2)', color: 'white', borderRadius: '50%', width: '32px', height: '32px' }}><X size={18} /></button>
            </div>
            <div style={{ padding: '0 2rem 2rem', marginTop: '-50px', textAlign: 'center' }}>
              <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'white', padding: '4px', margin: '0 auto 1rem', boxShadow: 'var(--shadow)' }}>
                <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'var(--bg-color)', overflow: 'hidden' }}>
                  {selectedPlayer.photo_url ? <img src={selectedPlayer.photo_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <User size={48} color="var(--text-subtle)" style={{ marginTop: '20px' }} />}
                </div>
              </div>
              <h2 style={{ fontWeight: 950, fontSize: '1.5rem', marginBottom: '0.25rem' }}>{selectedPlayer.name}</h2>
              <p style={{ fontWeight: 800, color: 'var(--primary-color)', marginBottom: '1.5rem' }}>{selectedPlayer.team?.name}</p>
              
              <div style={{ background: 'rgba(239, 68, 68, 0.05)', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
                <textarea placeholder="Motivo da rejeição..." value={feedback} onChange={e => setFeedback(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '1rem', fontSize: '0.85rem' }} />
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button onClick={() => handleReject('player', selectedPlayer.id)} className="btn" style={{ flex: 1, background: 'var(--error)', color: 'white' }} disabled={AdminEngine.isMutating}>REJEITAR</button>
                  <button onClick={() => handleApprovePlayer(selectedPlayer)} className="btn btn-primary" style={{ flex: 2 }} disabled={AdminEngine.isMutating}>APROVAR</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Equipe */}
      {selectedSub && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="card animate-fade" style={{ width: '100%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto', padding: 0 }}>
             <div style={{ padding: '1.5rem', background: 'var(--surface-alt)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900 }}>Revisão de Equipe</h2>
              <button onClick={() => setSelectedSub(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X /></button>
            </div>
            <div style={{ padding: '2rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
                 <div>
                   <h4 style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.5rem' }}>DADOS DO TIME</h4>
                   <p><strong>{selectedSub.team_name}</strong> ({selectedSub.team_short_name})</p>
                 </div>
                 <div>
                   <h4 style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.5rem' }}>GESTOR</h4>
                   <p><strong>{selectedSub.manager_name}</strong></p>
                 </div>
              </div>
              <div style={{ background: 'rgba(239, 68, 68, 0.05)', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
                <textarea placeholder="Motivo da rejeição..." value={feedback} onChange={e => setFeedback(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '1rem', fontSize: '0.85rem' }} />
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button onClick={() => handleReject('team', selectedSub.id)} className="btn" style={{ flex: 1, background: 'var(--error)', color: 'white' }} disabled={AdminEngine.isMutating}>REJEITAR</button>
                  <button onClick={() => handleApproveTeam(selectedSub)} className="btn btn-primary" style={{ flex: 2 }} disabled={AdminEngine.isMutating}>APROVAR TUDO</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
