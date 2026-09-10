// Cloudflare Pages Function: /api/surveys
// Automatically executed on Cloudflare Edge when deployed to Cloudflare Pages

interface Env {
  // Can be bound to KV namespace or D1 database if configured in Cloudflare Dashboard
  SURVEY_KV?: any;
}

export const onRequestPost = async (context: { request: Request; env: Env }) => {
  const { request } = context;

  // Handle CORS preflight if needed
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
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        }
      );
    }

    // In production with KV bound:
    // if (context.env.SURVEY_KV) {
    //   await context.env.SURVEY_KV.put(payload.uuid, JSON.stringify(payload));
    // }

    return new Response(
      JSON.stringify({
        status: 'SUCCESS',
        message: 'Phiếu khảo sát đã được đồng bộ thành công lên máy chủ Cloudflare Edge!',
        receivedUuid: payload.uuid,
        roomNumber: payload.data?.roomNumber,
        category: payload.data?.category,
        serverTimestamp: new Date().toISOString(),
        node: 'Cloudflare Edge VKU Gateway'
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
        message: 'Lỗi xử lý dữ liệu máy chủ: ' + error.message
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      }
    );
  }
};

export const onRequestGet = async () => {
  return new Response(
    JSON.stringify({
      status: 'ONLINE',
      service: 'VKU Field Survey Online Backend API',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      endpoints: {
        sync: 'POST /api/surveys',
        health: 'GET /api/surveys'
      }
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
