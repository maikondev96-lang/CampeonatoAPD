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

  // Busca inicial ultra-leve apenas para listar no menu
  const init = async () => {
    try {
      const { data: comps, error } = await supabase
        .from('competitions')
        .select('id, name, slug, logo_url, is_active')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setCompetitions(comps as any);
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
    setLoading(true);
    try {
      // Busca detalhes completos apenas da competição selecionada
      const { data: comp, error } = await supabase
        .from('competitions')
        .select('*, seasons(*, champion_team:teams!champion_team_id(id, name, logo_url, short_name), runner_up_team:teams!runner_up_team_id(id, name, logo_url, short_name))')
        .eq('slug', slug)
        .single();

      if (error || !comp) return;
      
      setCompetition(comp as any);
      const allSeasons = ((comp as any).seasons || []).sort((a: any, b: any) => b.year - a.year);
      setSeasons(allSeasons);

      if (year) {
        const target = allSeasons.find((s: any) => s.year === year);
        if (target) {
          setSeason(target);
          return;
        }
      }

      const active = allSeasons.find((s: any) => s.status === 'active') || allSeasons[0] || null;
      setSeason(active);
    } catch (err) {
      console.error('Error selecting competition:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const selectSeason = useCallback(async (year: number) => {
    if (!competition || season?.year === year) return;
    const s = seasons.find(sv => sv.year === year);
    if (s) setSeason(s);
  }, [competition, season, seasons]);

  // Tema dinâmico
  useEffect(() => {
    const root = document.documentElement;
    if (competition?.settings_json?.primary_color) {
      const color = competition.settings_json.primary_color;
      root.style.setProperty('--primary-color', color);
      root.style.setProperty('--primary-light', `${color}15`);
    } else {
      root.style.removeProperty('--primary-color');
      root.style.removeProperty('--primary-light');
    }
  }, [competition]);

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
