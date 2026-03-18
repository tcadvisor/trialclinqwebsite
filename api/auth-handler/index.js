const path = require('path');

// Load the Netlify-style auth function
const authModule = require('../netlify/functions/auth.js');

function buildNetlifyEvent(req) {
  const headers = {};
  if (req.headers) {
    for (const [key, value] of req.headers) {
      headers[key.toLowerCase()] = value;
    }
  }

  const queryStringParameters = {};
  try {
    const url = new URL(req.url);
    url.searchParams.forEach((value, key) => {
      queryStringParameters[key] = value;
    });
  } catch (e) {
    // Ignore URL parsing errors
  }

  let body = '';
  if (req.body) {
    body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
  }

  return {
    httpMethod: (req.method || 'GET').toUpperCase(),
    headers,
    queryStringParameters,
    body,
    isBase64Encoded: false,
    path: '/api/auth'
  };
}

module.exports = async function (context, req) {
  try {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
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
    const event = buildNetlifyEvent(req);

    // Call the Netlify handler
    const result = await authModule.handler(event, {});

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
