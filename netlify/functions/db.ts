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

    // Create patient_profiles table
    await client.query(`
      CREATE TABLE IF NOT EXISTS patient_profiles (
        id SERIAL PRIMARY KEY,
        patient_id VARCHAR(255) UNIQUE NOT NULL,
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
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_patient_profiles_patient_id ON patient_profiles(patient_id);
      CREATE INDEX IF NOT EXISTS idx_patient_profiles_email ON patient_profiles(email);
    `);

    // Create patient_documents table
    await client.query(`
      CREATE TABLE IF NOT EXISTS patient_documents (
        id SERIAL PRIMARY KEY,
        patient_id VARCHAR(255) NOT NULL,
        file_name VARCHAR(500) NOT NULL,
        file_type VARCHAR(50),
        file_size INTEGER,
        blob_url VARCHAR(2048),
        blob_container VARCHAR(100),
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (patient_id) REFERENCES patient_profiles(patient_id) ON DELETE CASCADE
      );
      
      CREATE INDEX IF NOT EXISTS idx_patient_documents_patient_id ON patient_documents(patient_id);
      CREATE INDEX IF NOT EXISTS idx_patient_documents_uploaded_at ON patient_documents(uploaded_at);
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
