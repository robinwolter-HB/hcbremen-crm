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

  try {
    const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    console.log('URL vorhanden:', !!supabaseUrl)
    console.log('Service Key vorhanden:', !!serviceKey)

    if (!supabaseUrl || !serviceKey) {
      console.log('FEHLER: Env vars fehlen')
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server nicht konfiguriert – Env vars fehlen' }) }
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const authHeader = event.headers.authorization || event.headers.Authorization || ''
    const token = authHeader.replace('Bearer ', '')
    console.log('Token vorhanden:', !!token, 'Länge:', token.length)

    if (!token) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Kein Token' }) }
    }

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    console.log('Auth User:', user?.email, 'Fehler:', authError?.message)

    if (authError || !user) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Ungültiger Token: ' + (authError?.message || '') }) }
    }

    const { data: profile } = await supabaseAdmin.from('profile').select('rolle').eq('id', user.id).single()
    console.log('Profil Rolle:', profile?.rolle)

    if (!profile || profile.rolle !== 'admin') {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Nur Admins dürfen Nutzer anlegen' }) }
    }

    const body = JSON.parse(event.body)
    console.log('Neuer User Email:', body.email)

    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
      user_metadata: { name: body.name || body.email, rolle: body.rolle || 'mitarbeiter', bereiche: body.bereiche }
    })

    console.log('Create User Fehler:', createError?.message, 'Status:', createError?.status)

    if (createError) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: createError.message }) }
    }

    await new Promise(r => setTimeout(r, 1500))

    await supabaseAdmin.from('profile').upsert({
      id: newUser.user.id,
      email: body.email,
      name: body.name || body.email,
      rolle: body.rolle || 'mitarbeiter',
      bereiche: body.bereiche || ['kontakte','historie','veranstaltungen','sponsoring','aufgaben']
    }, { onConflict: 'id' })

    console.log('Erfolgreich angelegt:', newUser.user.id)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, user: { id: newUser.user.id, email: body.email } })
    }

  } catch (error) {
    console.log('EXCEPTION:', error.message)
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) }
  }
}
