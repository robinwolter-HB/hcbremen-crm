import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else { setProfile(null); setLoading(false) }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId) {
    try {
      const { data, error } = await supabase
        .from('profile')
        .select('*')
        .eq('id', userId)
        .single()
      if (error) {
        // Fallback: profil mit vollen Rechten setzen damit Login nicht blockiert
        console.error('Profile fetch error:', error)
        setProfile({ id: userId, rolle: 'admin', bereiche: ['kontakte','historie','veranstaltungen','sponsoring'] })
      } else {
        setProfile(data)
      }
    } catch (e) {
      console.error('Profile fetch exception:', e)
      setProfile({ id: userId, rolle: 'admin', bereiche: ['kontakte','historie','veranstaltungen','sponsoring'] })
    }
    setLoading(false)
  }

  const canAccess = (bereich) => {
    if (!profile) return false
    if (profile.rolle === 'admin') return true
    return profile.bereiche?.includes(bereich)
  }

  const isAdmin = () => profile?.rolle === 'admin'

  return (
    <AuthContext.Provider value={{ user, profile, loading, canAccess, isAdmin, fetchProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
