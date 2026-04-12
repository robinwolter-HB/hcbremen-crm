import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError('Ungültige E-Mail oder Passwort.')
    else navigate('/')
    setLoading(false)
  }

  return (
    <div className="login-page">
      <div className="login-box">
        <div className="login-logo">HC <span>Bremen</span> CRM</div>
        <p className="login-subtitle">Sponsoren & Kontaktmanagement</p>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>E-Mail</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required autoFocus />
          </div>
          <div className="form-group">
            <label>Passwort</label>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} required />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading} style={{width:'100%',justifyContent:'center',marginTop:'8px'}}>
            {loading ? 'Einloggen...' : 'Einloggen'}
          </button>
        </form>
      </div>
    </div>
  )
}
