export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  const { id } = req.query
  if (!id) return res.status(400).json({ error: 'id required' })

  try {
    const headers = { 'apiKey': process.env.IVAO_API_KEY }

    const [sessionRes, fpRes, trackRes] = await Promise.all([
      fetch(`https://api.ivao.aero/v2/tracker/sessions/${id}`, { headers }),
      fetch(`https://api.ivao.aero/v2/tracker/sessions/${id}/flightPlans/latest`, { headers }),
      fetch(`https://api.ivao.aero/v2/tracker/sessions/${id}/tracks/latest`, { headers })
    ])

    if (!sessionRes.ok) return res.status(sessionRes.status).json({ error: `Session ${sessionRes.status}` })

    const session = await sessionRes.json()
    const fp      = fpRes.ok    ? await fpRes.json()    : null
    const track   = trackRes.ok ? await trackRes.json() : null

    const pilotRating = session.user?.rating?.pilotRating?.shortName || null
    const firstName   = session.user?.firstName || ''
    const lastName    = session.user?.lastName  || ''

    const simMap = {
      // softwareType
      'Altitude/win':   'Altitude (Windows)',
      'Altitude/mac':   'Altitude (Mac)',
      // simulatorId (case variants)
      'MSFS':           'MSFS 2020',
      'MSFS2024':       'MSFS 2024',
      'msfs':           'MSFS 2020',
      'msfs2024':       'MSFS 2024',
      'XP11':           'X-Plane 11',
      'XP12':           'X-Plane 12',
      'xplane11':       'X-Plane 11',
      'xplane12':       'X-Plane 12',
      'xplane':         'X-Plane',
      'P3D':            'Prepar3D',
      'P3Dv4':          'Prepar3D v4',
      'P3Dv5':          'Prepar3D v5',
      'p3dv4':          'Prepar3D v4',
      'p3dv5':          'Prepar3D v5',
      'FSX':            'FSX',
      'fsx':            'FSX',
      'FS9':            'FS2004',
      'fs9':            'FS2004',
    }
    const rawSim = session.pilotSession?.simulatorId || session.softwareType?.name || null
    const simName = rawSim ? (simMap[rawSim] || rawSim) : null

    res.json({
      session_id:      session.id,
      callsign:        session.callsign,
      user_id:         session.userId,
      name:            `${firstName} ${lastName}`.trim(),
      pilot_rating:    pilotRating,
      division:        session.user?.divisionId || null,
      simulator:       simName,
      connected_at:    session.createdAt,
      completed_at:    session.completedAt || null,
      time:            session.time || null,
      // Flight Plan
      departure:       fp?.departureId   || null,
      arrival:         fp?.arrivalId     || null,
      aircraft:        fp?.aircraftId    || null,
      cruise_altitude: fp?.cruisingAltitude || null,
      cruise_speed:    fp?.cruisingSpeed    || null,
      route:           fp?.route            || null,
      remarks:         fp?.remarks          || null,
      // Last Track
      latitude:        track?.latitude    || null,
      longitude:       track?.longitude   || null,
      altitude:        track?.altitude    || null,
      ground_speed:    track?.groundSpeed || null,
      heading:         track?.heading     || null,
      state:           track?.state       || null,
      on_ground:       track?.onGround    ?? null,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}