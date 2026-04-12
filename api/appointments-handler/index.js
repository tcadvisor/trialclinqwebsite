const handler = require('../netlify/functions/appointments.js');

function buildNetlifyEvent(context, req) {
  const headers = {};
  if (req.headers) {
    if (typeof req.headers.forEach === 'function') {
      req.headers.forEach((value, key) => { headers[key.toLowerCase()] = value; });
    } else {
      for (const [key, value] of Object.entries(req.headers)) { headers[key.toLowerCase()] = value; }
    }
  }
  const queryStringParameters = {};
  if (req.query) {
    for (const [key, value] of Object.entries(req.query)) { queryStringParameters[key] = value; }
  }
  let body = '';
  if (req.body) { body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body); }
  else if (req.rawBody) { body = req.rawBody; }
  const method = (req.method || 'GET').toUpperCase();
  return { httpMethod: method, headers, queryStringParameters, body, isBase64Encoded: false, path: '/api/appointments' };
}

module.exports = async function (context, req) {
  try {
    const method = (req.method || 'GET').toUpperCase();
    if (method === 'OPTIONS') {
      return { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-CSRF-Token,x-user-id,x-patient-id,x-provider-id' }, body: '' };
    }
    const event = buildNetlifyEvent(context, req);
    const result = await handler.handler(event, {});
    return { status: result.statusCode || 200, headers: result.headers || {}, body: result.body || '' };
  } catch (error) {
    console.error('[appointments-handler] Error:', error.message);
    return { status: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Internal server error' }) };
  }
};
