import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, Loader2, Mail } from 'lucide-react';
import { supabase } from '../supabaseClient';

const AdminLogin = () => {
  const [email, setEmail] = useState('admin@apd.com.br');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError('E-mail ou senha incorretos.');
    } else {
      navigate('/admin');
    }
    setLoading(false);
  };

  return (
    <div className="animate-fade" style={{ maxWidth: 400, margin: '4rem auto', textAlign: 'center' }}>
      <div className="card">
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ 
            width: 64, 
            height: 64, 
            background: 'var(--primary-color)', 
            borderRadius: '50%', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            margin: '0 auto 1rem'
          }}>
            <Shield size={32} color="white" />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 950, color: 'var(--primary-dark)' }}>Acesso Restrito</h2>
          <p style={{ color: 'var(--text-muted)', fontWeight: 700 }}>Apenas administradores autorizados.</p>
        </div>

        <form onSubmit={handleLogin}>
          <div className="form-group" style={{ textAlign: 'left', marginBottom: '1rem' }}>
            <label style={{ fontWeight: 900, fontSize: '0.8rem', color: 'var(--primary-dark)' }}>E-MAIL</label>
            <div style={{ position: 'relative' }}>
              <Mail 
                size={18} 
                style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} 
              />
              <input 
                type="email" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                placeholder="admin@apd.com.br" 
                style={{ paddingLeft: '2.5rem' }}
                autoFocus
              />
            </div>
          </div>
          <div className="form-group" style={{ textAlign: 'left' }}>
            <label style={{ fontWeight: 900, fontSize: '0.8rem', color: 'var(--primary-dark)' }}>SENHA DE ACESSO</label>
            <div style={{ position: 'relative' }}>
              <Lock 
                size={18} 
                style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} 
              />
              <input 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                placeholder="Digite a senha..." 
                style={{ paddingLeft: '2.5rem' }}
              />
            </div>
            {error && <p style={{ color: 'var(--error)', fontSize: '0.8rem', marginTop: '0.5rem' }}>{error}</p>}
          </div>

          <button className="btn btn-primary" style={{ width: '100%', height: '48px', justifyContent: 'center', fontSize: '1rem', fontWeight: 950 }} disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : 'ACESSAR PAINEL'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
