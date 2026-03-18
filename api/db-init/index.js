// Database initialization endpoint
// This should only be called once to set up the schema
const { initializeDatabase } = require('../netlify/functions/db.js');

module.exports = async function (context, req) {
  try {
    console.log('[db-init] Starting database initialization...');

    await initializeDatabase();

    console.log('[db-init] Database initialization completed');

    return {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ok: true,
        message: 'Database schema initialized successfully'
      })
    };
  } catch (error) {
    console.error('[db-init] Error:', error);
    return {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ok: false,
        error: error.message
      })
    };
  }
};
