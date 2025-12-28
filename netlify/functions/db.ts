import { Pool, Client } from 'pg';

// Connection pool for multiple concurrent connections
let pool: Pool;

export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL || 
      `postgresql://${process.env.PGUSER}:${encodeURIComponent(process.env.PGPASSWORD!)}@${process.env.PGHOST}:${process.env.PGPORT}/${process.env.PGDATABASE}?sslmode=require`;
    
    pool = new Pool({
      connectionString,
      max: 5, // Max connections
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
    });
  }

  return pool;
}

// Initialize database schema
export async function initializeDatabase() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL ||
      `postgresql://${process.env.PGUSER}:${encodeURIComponent(process.env.PGPASSWORD!)}@${process.env.PGHOST}:${process.env.PGPORT}/${process.env.PGDATABASE}?sslmode=require`,
  });

  try {
    await client.connect();

    // Create users table (for tracking researchers, providers, patients)
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) UNIQUE NOT NULL,
        azure_oid VARCHAR(255) UNIQUE,
        email VARCHAR(255) NOT NULL,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        role VARCHAR(50) NOT NULL DEFAULT 'patient',
        organization VARCHAR(255),
        verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id);
      CREATE INDEX IF NOT EXISTS idx_users_azure_oid ON users(azure_oid);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    `);

    // Create patient_profiles table with user tracking
    await client.query(`
      CREATE TABLE IF NOT EXISTS patient_profiles (
        id SERIAL PRIMARY KEY,
        patient_id VARCHAR(255) UNIQUE NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        email_verified BOOLEAN DEFAULT FALSE,
        age VARCHAR(10),
        weight VARCHAR(10),
        phone VARCHAR(20),
        gender VARCHAR(20),
        race VARCHAR(50),
        language VARCHAR(50),
        blood_group VARCHAR(5),
        genotype VARCHAR(50),
        hearing_impaired BOOLEAN DEFAULT FALSE,
        vision_impaired BOOLEAN DEFAULT FALSE,
        primary_condition VARCHAR(255),
        diagnosed VARCHAR(50),
        allergies JSONB,
        medications JSONB,
        additional_info TEXT,
        ecog VARCHAR(10),
        disease_stage VARCHAR(50),
        biomarkers TEXT,
        prior_therapies JSONB,
        comorbidity_cardiac BOOLEAN DEFAULT FALSE,
        comorbidity_renal BOOLEAN DEFAULT FALSE,
        comorbidity_hepatic BOOLEAN DEFAULT FALSE,
        comorbidity_autoimmune BOOLEAN DEFAULT FALSE,
        infection_hiv BOOLEAN DEFAULT FALSE,
        infection_hbv BOOLEAN DEFAULT FALSE,
        infection_hcv BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_patient_profiles_patient_id ON patient_profiles(patient_id);
      CREATE INDEX IF NOT EXISTS idx_patient_profiles_user_id ON patient_profiles(user_id);
      CREATE INDEX IF NOT EXISTS idx_patient_profiles_email ON patient_profiles(email);
    `);

    // Create patient_documents table with user tracking
    await client.query(`
      CREATE TABLE IF NOT EXISTS patient_documents (
        id SERIAL PRIMARY KEY,
        patient_id VARCHAR(255) NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        file_name VARCHAR(500) NOT NULL,
        file_type VARCHAR(50),
        file_size INTEGER,
        blob_url VARCHAR(2048),
        blob_container VARCHAR(100),
        uploaded_by_user_id VARCHAR(255),
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (patient_id) REFERENCES patient_profiles(patient_id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
        FOREIGN KEY (uploaded_by_user_id) REFERENCES users(user_id)
      );

      CREATE INDEX IF NOT EXISTS idx_patient_documents_patient_id ON patient_documents(patient_id);
      CREATE INDEX IF NOT EXISTS idx_patient_documents_user_id ON patient_documents(user_id);
      CREATE INDEX IF NOT EXISTS idx_patient_documents_uploaded_by ON patient_documents(uploaded_by_user_id);
      CREATE INDEX IF NOT EXISTS idx_patient_documents_uploaded_at ON patient_documents(uploaded_at);
    `);

    // Create audit_log table for tracking all operations
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        action VARCHAR(100) NOT NULL,
        resource_type VARCHAR(50),
        resource_id VARCHAR(255),
        patient_id VARCHAR(255),
        details JSONB,
        ip_address VARCHAR(45),
        user_agent VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
      );

      CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_patient_id ON audit_logs(patient_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
    `);

    console.log('✅ Database schema initialized successfully');
  } catch (error: any) {
    console.error('❌ Database initialization error:', error.message);
  } finally {
    await client.end();
  }
}

// Helper function to execute queries
export async function query(sql: string, params?: any[]) {
  const pool = getPool();
  const result = await pool.query(sql, params);
  return result;
}

// Get or create user
export async function getOrCreateUser(
  userId: string,
  email: string,
  azureOid: string,
  firstName?: string,
  lastName?: string,
  role: string = 'patient'
) {
  try {
    // Check if user exists
    const existing = await query(
      'SELECT * FROM users WHERE user_id = $1',
      [userId]
    );

    if (existing.rows.length > 0) {
      return existing.rows[0];
    }

    // Create new user
    const result = await query(
      `
      INSERT INTO users (user_id, azure_oid, email, first_name, last_name, role, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING id, user_id, azure_oid, email, first_name, last_name, role;
      `,
      [userId, azureOid, email, firstName || '', lastName || '', role]
    );

    console.log('✅ User created:', userId);
    return result.rows[0];
  } catch (error: any) {
    console.error('Error managing user:', error);
    throw error;
  }
}

// Audit log helper
export async function logAuditEvent(
  userId: string,
  action: string,
  resourceType?: string,
  resourceId?: string,
  patientId?: string,
  details?: any,
  ipAddress?: string,
  userAgent?: string
) {
  try {
    await query(
      `
      INSERT INTO audit_logs (user_id, action, resource_type, resource_id, patient_id, details, ip_address, user_agent, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW());
      `,
      [
        userId,
        action,
        resourceType || null,
        resourceId || null,
        patientId || null,
        details ? JSON.stringify(details) : null,
        ipAddress || null,
        userAgent || null
      ]
    );
  } catch (error) {
    console.warn('Failed to log audit event:', error);
    // Don't throw - audit logging shouldn't break the main operation
  }
}
