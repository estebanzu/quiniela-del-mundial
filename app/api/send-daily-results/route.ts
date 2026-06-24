import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

function getResend() {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error('RESEND_API_KEY no está configurada en .env.local')
  return new Resend(key)
}

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verify the requester is admin via server-side token
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token)

    if (authErr || !user || user.user_metadata?.is_admin !== true) {
      return NextResponse.json({ error: 'Solo el administrador puede enviar correos.' }, { status: 403 })
    }

    const { date } = await request.json()
    if (!date) {
      return NextResponse.json({ error: 'Fecha requerida.' }, { status: 400 })
    }

    // Get matches for the given date
    const startOfDay = `${date}T00:00:00`
    const endOfDay = `${date}T23:59:59`

    const { data: matches, error: matchErr } = await supabaseAdmin
      .from('matches')
      .select('*')
      .gte('match_date', startOfDay)
      .lte('match_date', endOfDay)
      .order('match_date', { ascending: true })

    if (matchErr) throw matchErr

    if (!matches || matches.length === 0) {
      return NextResponse.json({ error: 'No hay partidos para esa fecha.' }, { status: 400 })
    }

    // Get all users with recovery_email
    const { data: users, error: usersErr } = await supabaseAdmin.auth.admin.listUsers()
    if (usersErr) throw usersErr

    const recipients = users.users
      .filter(u => u.user_metadata?.recovery_email && u.email !== 'admin@quiniela.local')
      .map(u => u.user_metadata.recovery_email as string)

    if (recipients.length === 0) {
      return NextResponse.json({ error: 'No hay usuarios con correo de recuperación registrado.' }, { status: 400 })
    }

    // Format date for display
    const displayDate = new Date(date + 'T12:00:00').toLocaleDateString('es-ES', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    })

    // Build HTML email
    const matchRows = matches.map(m => {
      const isFinished = m.status === 'finished'
      const score = isFinished ? `${m.home_score} - ${m.away_score}` : 'Pendiente'
      const scoreColor = isFinished ? '#00d4ff' : '#7d8ba6'
      return `
        <tr>
          <td style="padding:12px 16px;border-bottom:1px solid #1e293b;color:#e2e8f0;font-weight:700;font-size:14px;text-align:right;width:40%">${m.home_team}</td>
          <td style="padding:12px 8px;border-bottom:1px solid #1e293b;text-align:center;width:20%">
            <span style="background:#0f172a;color:${scoreColor};padding:4px 12px;border-radius:8px;font-weight:900;font-size:14px;font-family:monospace;border:1px solid #334155">${score}</span>
          </td>
          <td style="padding:12px 16px;border-bottom:1px solid #1e293b;color:#e2e8f0;font-weight:700;font-size:14px;text-align:left;width:40%">${m.away_team}</td>
        </tr>`
    }).join('')

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0b0f1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px">
    <div style="text-align:center;margin-bottom:24px">
      <div style="display:inline-block;background:linear-gradient(135deg,#008080,#7c3aed);width:48px;height:48px;border-radius:12px;line-height:48px;text-align:center;font-size:24px;margin-bottom:8px">⚽</div>
      <h1 style="color:#00d4ff;font-size:22px;margin:8px 0 4px;letter-spacing:2px">QUINIELA MUNDIAL 2026</h1>
      <p style="color:#7d8ba6;font-size:11px;text-transform:uppercase;letter-spacing:3px;margin:0">Resultados del Día</p>
    </div>
    <div style="background:rgba(30,41,59,0.6);border:1px solid #334155;border-radius:16px;overflow:hidden;margin-bottom:24px">
      <div style="background:#1e293b;padding:16px 20px;border-bottom:1px solid #334155">
        <h2 style="color:#ffffff;font-size:16px;margin:0;font-weight:800">📅 ${displayDate}</h2>
        <p style="color:#94a3b8;font-size:12px;margin:4px 0 0">${matches.length} partido${matches.length !== 1 ? 's' : ''} jugado${matches.length !== 1 ? 's' : ''}</p>
      </div>
      <table style="width:100%;border-collapse:collapse">
        ${matchRows}
      </table>
    </div>
    <div style="text-align:center;padding:16px">
      <p style="color:#64748b;font-size:11px;margin:0">¡Ingresa a la quiniela para ver tu puntaje actualizado!</p>
      <p style="color:#475569;font-size:10px;margin:8px 0 0">Quiniela Mundial 2026 • Familia Calderón Campos</p>
    </div>
  </div>
</body>
</html>`

    // Send email to all recipients
    const resend = getResend()
    const { error: sendErr } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Quiniela Mundial <onboarding@resend.dev>',
      to: recipients,
      subject: `⚽ Resultados del ${displayDate} - Quiniela Mundial 2026`,
      html,
    })

    if (sendErr) throw sendErr

    return NextResponse.json({ success: true, sent_to: recipients.length })
  } catch (error: any) {
    console.error('Send daily results error:', error)
    return NextResponse.json({ error: error.message || 'Error al enviar correos.' }, { status: 500 })
  }
}
