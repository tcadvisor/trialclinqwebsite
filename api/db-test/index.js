// Simple database connection test endpoint
module.exports = async function (context, req) {
  const results = {
    timestamp: new Date().toISOString(),
    databaseUrl: !!process.env.DATABASE_URL,
    pgHost: !!process.env.PGHOST,
    pgUser: !!process.env.PGUSER,
    pgPassword: !!process.env.PGPASSWORD,
    pgDatabase: !!process.env.PGDATABASE,
    pgPort: !!process.env.PGPORT,
    connectionTest: null,
    tablesExist: null,
    error: null
  };

  try {
    const { Pool } = require('pg');

    // Build connection string
    let connectionString = process.env.DATABASE_URL;
    if (!connectionString && process.env.PGHOST) {
      connectionString = `postgresql://${process.env.PGUSER}:${encodeURIComponent(process.env.PGPASSWORD)}@${process.env.PGHOST}:${process.env.PGPORT}/${process.env.PGDATABASE}?sslmode=require`;
    }

    if (!connectionString) {
      results.error = 'No database configuration found';
      return {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(results, null, 2)
      };
    }

    const pool = new Pool({
      connectionString,
      connectionTimeoutMillis: 5000,
      ssl: { rejectUnauthorized: false }
    });

    // Test connection
    const client = await pool.connect();
    results.connectionTest = 'SUCCESS';

    // Check if auth_credentials table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'auth_credentials'
      );
    `);
    results.tablesExist = tableCheck.rows[0].exists;

    // Check if users table exists
    const usersCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'users'
      );
    `);
    results.usersTableExists = usersCheck.rows[0].exists;

    // Check if sessions table exists
    const sessionsCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'sessions'
      );
    `);
    results.sessionsTableExists = sessionsCheck.rows[0].exists;

    client.release();
    await pool.end();

    return {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(results, null, 2)
    };
  } catch (error) {
    results.error = error.message;
    results.connectionTest = 'FAILED';
    return {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(results, null, 2)
    };
  }
};
