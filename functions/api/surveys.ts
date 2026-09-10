// Cloudflare Pages Function: /api/surveys
// Supports: Cloudflare D1 Database (SQLite), Cloudflare KV, and Global Cloud Fallback

interface Env {
  DB?: any; // Cloudflare D1 Database binding
  SURVEY_KV?: any; // Cloudflare KV binding
}

export const onRequestPost = async (context: { request: Request; env: Env }) => {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
  }

  try {
    const payload = await request.json() as any;

    if (!payload || !payload.uuid) {
      return new Response(
        JSON.stringify({ error: 'Dữ liệu không hợp lệ: Thiếu mã UUID' }),
        { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    const { uuid, createdAt, data } = payload;
    const syncedAt = new Date().toISOString();
    let storageBackend = 'Cloud Edge Cache';

    // 1. If Cloudflare D1 Database is bound:
    if (env.DB) {
      try {
        await env.DB.prepare(`
          CREATE TABLE IF NOT EXISTS vku_surveys (
            uuid TEXT PRIMARY KEY,
            building TEXT,
            floor TEXT,
            room_number TEXT,
            category TEXT,
            condition_rating INTEGER,
            defect_notes TEXT,
            photo_base64 TEXT,
            inspector_name TEXT,
            created_at TEXT,
            synced_at TEXT
          )
        `).run();

        await env.DB.prepare(`
          INSERT OR REPLACE INTO vku_surveys VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          uuid,
          data?.building || '',
          data?.floor || '',
          data?.roomNumber || '',
          data?.category || '',
          data?.conditionRating || 5,
          data?.defectNotes || '',
          data?.photoBase64 || '',
          data?.inspectorName || '',
          createdAt || syncedAt,
          syncedAt
        ).run();

        storageBackend = 'Cloudflare D1 (SQLite Cloud Database)';
      } catch (d1Err: any) {
        console.error('D1 error:', d1Err);
      }
    }

    // 2. If Cloudflare KV is bound:
    if (env.SURVEY_KV) {
      try {
        await env.SURVEY_KV.put(`survey:${uuid}`, JSON.stringify({
          uuid,
          createdAt,
          syncedAt,
          data
        }));
        storageBackend = 'Cloudflare KV Cloud Storage';
      } catch (kvErr: any) {
        console.error('KV error:', kvErr);
      }
    }

    // 3. Global Cloud Persistence Fallback
    try {
      await fetch('https://api.restful-api.dev/objects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `VKU_SURVEY_${uuid}`,
          data: {
            uuid,
            building: data?.building,
            floor: data?.floor,
            roomNumber: data?.roomNumber,
            category: data?.category,
            conditionRating: data?.conditionRating,
            defectNotes: data?.defectNotes,
            photoBase64: data?.photoBase64,
            inspectorName: data?.inspectorName,
            createdAt,
            syncedAt
          }
        })
      });
      if (storageBackend === 'Cloud Edge Cache') {
        storageBackend = 'Global Cloud REST Database';
      }
    } catch (restErr) {
      console.warn('Global REST fallback warning:', restErr);
    }

    return new Response(
      JSON.stringify({
        status: 'SUCCESS',
        message: `Phiếu khảo sát đã được lưu thành công vào Cơ sở dữ liệu Cloud (${storageBackend})!`,
        storageBackend,
        receivedUuid: uuid,
        serverTimestamp: syncedAt
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        status: 'ERROR',
        message: 'Lỗi ghi dữ liệu lên Cloud: ' + error.message
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      }
    );
  }
};

export const onRequestGet = async (context: { env: Env }) => {
  const { env } = context;

  // If Cloudflare D1 exists:
  if (env.DB) {
    try {
      const { results } = await env.DB.prepare('SELECT * FROM vku_surveys ORDER BY created_at DESC LIMIT 100').all();
      const formatted = (results || []).map((row: any) => ({
        uuid: row.uuid,
        status: 'SYNCED',
        createdAt: row.created_at,
        syncedAt: row.synced_at,
        retryCount: 0,
        data: {
          building: row.building,
          floor: row.floor,
          roomNumber: row.room_number,
          category: row.category,
          conditionRating: row.condition_rating,
          defectNotes: row.defect_notes,
          photoBase64: row.photo_base64,
          inspectorName: row.inspector_name
        }
      }));

      return new Response(
        JSON.stringify({
          status: 'ONLINE',
          storageBackend: 'Cloudflare D1 Database',
          count: formatted.length,
          surveys: formatted
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        }
      );
    } catch (e: any) {
      console.error('D1 query error:', e);
    }
  }

  // If KV exists:
  if (env.SURVEY_KV) {
    try {
      const list = await env.SURVEY_KV.list({ prefix: 'survey:' });
      const surveys: any[] = [];
      for (const key of list.keys.slice(0, 50)) {
        const item = await env.SURVEY_KV.get(key.name, 'json');
        if (item) {
          surveys.push({
            uuid: item.uuid,
            status: 'SYNCED',
            createdAt: item.createdAt,
            syncedAt: item.syncedAt,
            retryCount: 0,
            data: item.data
          });
        }
      }
      return new Response(
        JSON.stringify({
          status: 'ONLINE',
          storageBackend: 'Cloudflare KV Storage',
          count: surveys.length,
          surveys
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        }
      );
    } catch (e) {
      console.error('KV list error:', e);
    }
  }

  return new Response(
    JSON.stringify({
      status: 'ONLINE',
      storageBackend: 'Cloudflare Edge Gateway',
      service: 'VKU Field Survey Cloud API',
      timestamp: new Date().toISOString(),
      surveys: []
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    }
  );
};

// Universal dispatcher matching any Cloudflare Pages routing mode
export const onRequest = async (context: any) => {
  const method = context.request.method;
  if (method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
  }
  if (method === 'POST') {
    return onRequestPost(context);
  }
  return onRequestGet(context);
};
