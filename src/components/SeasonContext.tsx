import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import type { Competition, Season } from '../types';

interface SeasonContextType {
  competitions: Competition[];
  competition: Competition | null;
  season: Season | null;
  seasons: Season[];
  loading: boolean;
  selectCompetition: (slug: string, year?: number) => Promise<void>;
  selectSeason: (year: number) => Promise<void>;
}

const SeasonContext = createContext<SeasonContextType>({
  competitions: [],
  competition: null,
  season: null,
  seasons: [],
  loading: true,
  selectCompetition: async () => {},
  selectSeason: async () => {},
});

export const useSeasonContext = () => useContext(SeasonContext);

export const SeasonProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [season, setSeason] = useState<Season | null>(null);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);

  const init = async () => {
    try {
      const { data: comps, error } = await supabase
        .from('competitions')
        .select('*, seasons(*, champion_team:teams!champion_team_id(id, name, logo_url, short_name), runner_up_team:teams!runner_up_team_id(id, name, logo_url, short_name))')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setCompetitions(comps || []);
      return comps || [];
    } catch (err) {
      console.error('Failed to load competitions:', err);
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    init();
  }, []);

  const selectCompetition = useCallback(async (slug: string, year?: number) => {
    // Tenta achar na lista local primeiro
    let comp = competitions.find(c => c.slug === slug);
    
    // Se não achar e ainda estiver carregando, espera um pouco ou busca direto
    if (!comp) {
      const { data } = await supabase
        .from('competitions')
        .select('*, seasons(*, champion_team:teams!champion_team_id(id, name, logo_url, short_name), runner_up_team:teams!runner_up_team_id(id, name, logo_url, short_name))')
        .eq('slug', slug)
        .single();
      if (data) comp = data;
    }

    if (!comp) return;
    
    setCompetition(comp);
    const allSeasons = (comp.seasons || []).sort((a: any, b: any) => b.year - a.year);
    setSeasons(allSeasons);

    if (year) {
      const target = allSeasons.find(s => s.year === year);
      if (target) {
        setSeason(target);
        return;
      }
    }

    const active = allSeasons.find((s: any) => s.status === 'active') || allSeasons[0] || null;
    setSeason(active);
  }, [competitions]);

  const selectSeason = useCallback(async (year: number) => {
    if (!competition || season?.year === year) return;
    const s = seasons.find(sv => sv.year === year);
    if (s) setSeason(s);
  }, [competition, season, seasons]);

  const value = React.useMemo(() => ({
    competitions,
    competition,
    season,
    seasons,
    loading,
    selectCompetition,
    selectSeason,
  }), [competitions, competition, season, seasons, loading, selectCompetition, selectSeason]);

  return (
    <SeasonContext.Provider value={value}>
      {children}
    </SeasonContext.Provider>
  );
};

export default SeasonContext;
