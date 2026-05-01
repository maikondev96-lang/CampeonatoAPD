import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import type { Organization } from '../types';

interface OrganizationContextType {
  organization: Organization | null;
  loading: boolean;
}

const OrganizationContext = createContext<OrganizationContextType>({
  organization: null,
  loading: true,
});

export const useOrganizationContext = () => useContext(OrganizationContext);

export const OrganizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrg = async () => {
      try {
        // Por padrão, carregamos a APD (slug principal)
        const { data, error } = await supabase
          .from('organizations')
          .select('*')
          .eq('slug', 'apd')
          .single();

        if (data) setOrganization(data);
      } catch (err) {
        console.error('Failed to load organization:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrg();
  }, []);

  return (
    <OrganizationContext.Provider value={{ organization, loading }}>
      {children}
    </OrganizationContext.Provider>
  );
};

export default OrganizationContext;
