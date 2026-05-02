import React, { createContext, useContext, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import type { Competition, Season } from '../types';

interface AdminContextType {
  activeCompetition: Competition | null;
  activeSeason: Season | null;
  loading: boolean;
  setContext: (comp: Competition, season: Season) => void;
}

const AdminContext = createContext<AdminContextType>({
  activeCompetition: null,
  activeSeason: null,
  loading: true,
  setContext: () => {},
});

export const useAdminContext = () => useContext(AdminContext);

export const AdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { slug, year } = useParams<{ slug?: string; year?: string }>();
  const [activeCompetition, setActiveCompetition] = useState<Competition | null>(null);
  const [activeSeason, setActiveSeason] = useState<Season | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadContext = async () => {
      if (!slug) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const { data: comp, error: compErr } = await supabase
          .from('competitions')
          .select('*, seasons(*)')
          .eq('slug', slug)
          .single();

        if (comp) {
          setActiveCompetition(comp);
          const targetYear = year ? parseInt(year) : null;
          const seasons = (comp.seasons || []) as Season[];
          
          const foundSeason = targetYear 
            ? seasons.find(s => s.year === targetYear)
            : seasons.find(s => s.status === 'active') || seasons[0];

          if (foundSeason) {
            setActiveSeason(foundSeason);
          }
        }
      } catch (err) {
        console.error('Error loading admin context:', err);
      } finally {
        setLoading(false);
      }
    };

    loadContext();
  }, [slug, year]);

  const setContext = (comp: Competition, season: Season) => {
    setActiveCompetition(comp);
    setActiveSeason(season);
    navigate(`/admin/${comp.slug}/${season.year}`);
  };

  const value = React.useMemo(() => ({ 
    activeCompetition, 
    activeSeason, 
    loading, 
    setContext 
  }), [activeCompetition?.id, activeSeason?.id, loading]);

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  );
};
