import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Loader2 } from 'lucide-react';

const AdminRoute = ({ children }: { children?: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    console.log("AdminRoute: Checking session...");
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log("AdminRoute: Session found:", !!session);
      setIsAuthenticated(!!session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (isAuthenticated === null) {
    console.log("AdminRoute: isAuthenticated is null, showing loader");
    return <div style={{ display: 'flex', justifyContent: 'center', marginTop: '4rem', color: 'red' }}>Carregando Auth...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};

export default AdminRoute;
