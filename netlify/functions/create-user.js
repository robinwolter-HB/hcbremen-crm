const { createClient } = require('@supabase/supabase-js')

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  try {
    const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceKey) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server nicht konfiguriert' }) }
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Token aus Header prüfen
    const authHeader = event.headers.authorization || event.headers.Authorization || ''
    const token = authHeader.replace('Bearer ', '')

    if (!token) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Kein Token' }) }
    }

    // User aus Token lesen
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Ungültiger Token: ' + (authError?.message || '') }) }
    }

    // Admin-Check
    const { data: profile } = await supabaseAdmin.from('profile').select('rolle').eq('id', user.id).single()
    if (!profile || profile.rolle !== 'admin') {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Nur Admins dürfen Nutzer anlegen' }) }
    }

    const { email, password, name, rolle, bereiche } = JSON.parse(event.body)
    if (!email || !password) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'E-Mail und Passwort erforderlich' }) }
    }

    const finalRolle = rolle || 'mitarbeiter'
    const finalBereiche = bereiche || ['kontakte','historie','veranstaltungen','sponsoring','aufgaben']

    // Neuen User erstellen
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: name || email, rolle: finalRolle, bereiche: finalBereiche }
    })

    if (createError) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: createError.message }) }
    }

    // Kurz warten für DB-Trigger
    await new Promise(r => setTimeout(r, 1500))

    // Profil sicherstellen
    await supabaseAdmin.from('profile').upsert({
      id: newUser.user.id,
      email,
      name: name || email,
      rolle: finalRolle,
      bereiche: finalBereiche
    }, { onConflict: 'id' })

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, user: { id: newUser.user.id, email, name, rolle: finalRolle } })
    }

  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) }
  }
}
