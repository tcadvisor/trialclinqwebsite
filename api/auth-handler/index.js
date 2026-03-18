const path = require('path');

// Load the Netlify-style auth function
const authModule = require('../netlify/functions/auth.js');

function buildNetlifyEvent(context, req) {
  // Extract headers - Azure Functions req.headers can be an object or Headers instance
  const headers = {};
  if (req.headers) {
    if (typeof req.headers.forEach === 'function') {
      req.headers.forEach((value, key) => {
        headers[key.toLowerCase()] = value;
      });
    } else {
      // Plain object
      for (const [key, value] of Object.entries(req.headers)) {
        headers[key.toLowerCase()] = value;
      }
    }
  }

  const queryStringParameters = {};
  if (req.query) {
    for (const [key, value] of Object.entries(req.query)) {
      queryStringParameters[key] = value;
    }
  }

  // Get body - Azure Functions passes body as parsed object or string
  let body = '';
  if (req.body) {
    body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
  } else if (req.rawBody) {
    body = req.rawBody;
  }

  // Log for debugging
  const method = (req.method || context.req?.method || 'GET').toUpperCase();
  console.log('[auth-handler] Method:', method, 'Body:', body?.substring(0, 100));

  return {
    httpMethod: method,
    headers,
    queryStringParameters,
    body,
    isBase64Encoded: false,
    path: '/api/auth'
  };
}

module.exports = async function (context, req) {
  try {
    const method = (req.method || 'GET').toUpperCase();
    console.log('[auth-handler] Received request:', method);

    // Handle CORS preflight
    if (method === 'OPTIONS') {
      return {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRF-Token'
        },
        body: ''
      };
    }

    // Convert Azure request to Netlify event format
    const event = buildNetlifyEvent(context, req);

    // Call the Netlify handler
    const result = await authModule.handler(event, {});

    console.log('[auth-handler] Handler returned:', result.statusCode);

    // Convert response
    return {
      status: result.statusCode || 200,
      headers: result.headers || {},
      body: result.body || ''
    };
  } catch (error) {
    console.error('Auth handler error:', error);
    return {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message || 'Internal server error' })
    };
  }
};
