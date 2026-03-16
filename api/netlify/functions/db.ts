import { Pool, Client } from 'pg';

// Connection pool for multiple concurrent connections
let pool: Pool;

function buildConnectionString(env: NodeJS.ProcessEnv = process.env): string {
  const envUrl = env.DATABASE_URL?.trim();
  if (envUrl) {
    if (envUrl.includes('<') || envUrl.includes('>')) {
      throw new Error('DATABASE_URL contains placeholder values; set it to your actual Postgres connection string.');
    }
    try {
      new URL(envUrl);
      return envUrl;
    } catch {
      throw new Error('Invalid DATABASE_URL format; expected a full Postgres connection string.');
    }
  }

  const required: Array<keyof NodeJS.ProcessEnv> = [
    'PGUSER',
    'PGPASSWORD',
    'PGHOST',
    'PGPORT',
    'PGDATABASE',
  ];
  const missing = required.filter((key) => !env[key]);
  if (missing.length) {
    throw new Error(`Missing database environment variables: ${missing.join(', ')}`);
  }

  const connectionString = `postgresql://${env.PGUSER}:${encodeURIComponent(env.PGPASSWORD!)}@${env.PGHOST}:${env.PGPORT}/${env.PGDATABASE}?sslmode=require`;

  try {
    new URL(connectionString);
    return connectionString;
  } catch {
    throw new Error('Invalid PG* environment variable values; verify host, port, user, password, and database.');
  }
}

export function getPool(): Pool {
  if (!pool) {
    const connectionString = buildConnectionString();
    
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
    connectionString: buildConnectionString(),
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
        blob_path VARCHAR(1024),
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
      CREATE INDEX IF NOT EXISTS idx_patient_documents_blob_path ON patient_documents(blob_path);
      CREATE INDEX IF NOT EXISTS idx_patient_documents_uploaded_at ON patient_documents(uploaded_at);
    `);

    // Ensure new columns exist for existing deployments
    await client.query(`
      ALTER TABLE patient_documents ADD COLUMN IF NOT EXISTS blob_path VARCHAR(1024);
      CREATE INDEX IF NOT EXISTS idx_patient_documents_blob_path ON patient_documents(blob_path);
    `);

    // Create provider_profiles table with user tracking (mirrors patient_profiles structure)
    await client.query(`
      CREATE TABLE IF NOT EXISTS provider_profiles (
        id SERIAL PRIMARY KEY,
        provider_id VARCHAR(255) UNIQUE NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        email_verified BOOLEAN DEFAULT FALSE,
        site_name VARCHAR(500),
        organization VARCHAR(500),
        organization_type VARCHAR(100),
        organization_abbreviation VARCHAR(50),
        parent_organizations JSONB,
        address VARCHAR(500),
        city VARCHAR(100),
        state VARCHAR(50),
        zipcode VARCHAR(20),
        country VARCHAR(100),
        facility_type VARCHAR(100),
        funding_organization VARCHAR(500),
        accepted_conditions JSONB,
        languages JSONB,
        investigator_name VARCHAR(255),
        investigator_phone VARCHAR(20),
        investigator_email VARCHAR(255),
        affiliated_organization VARCHAR(500),
        regulatory_authority VARCHAR(255),
        regulatory_authority_address VARCHAR(500),
        consents_accepted JSONB,
        additional_info TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_provider_profiles_provider_id ON provider_profiles(provider_id);
      CREATE INDEX IF NOT EXISTS idx_provider_profiles_user_id ON provider_profiles(user_id);
      CREATE INDEX IF NOT EXISTS idx_provider_profiles_email ON provider_profiles(email);
      CREATE INDEX IF NOT EXISTS idx_provider_profiles_site_name ON provider_profiles(site_name);
    `);

    // Create trial_interests table for tracking patient interest in clinical trials
    await client.query(`
      CREATE TABLE IF NOT EXISTS trial_interests (
        id SERIAL PRIMARY KEY,
        patient_id VARCHAR(255) NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        nct_id VARCHAR(20) NOT NULL,
        trial_title VARCHAR(500),
        expressed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(patient_id, nct_id),
        FOREIGN KEY (patient_id) REFERENCES patient_profiles(patient_id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_trial_interests_patient_id ON trial_interests(patient_id);
      CREATE INDEX IF NOT EXISTS idx_trial_interests_user_id ON trial_interests(user_id);
      CREATE INDEX IF NOT EXISTS idx_trial_interests_nct_id ON trial_interests(nct_id);
      CREATE INDEX IF NOT EXISTS idx_trial_interests_expressed_at ON trial_interests(expressed_at);
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

    // Create provider_trials table for tracking trials managed by providers
    await client.query(`
      CREATE TABLE IF NOT EXISTS provider_trials (
        id SERIAL PRIMARY KEY,
        provider_id VARCHAR(255) NOT NULL,
        nct_id VARCHAR(20) NOT NULL,
        title VARCHAR(500),
        status VARCHAR(100),
        phase VARCHAR(50),
        sponsor VARCHAR(500),
        conditions JSONB,
        nearest_site VARCHAR(500),
        enrollment_count INTEGER,
        start_date DATE,
        completion_date DATE,
        added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(provider_id, nct_id)
      );

      CREATE INDEX IF NOT EXISTS idx_provider_trials_provider_id ON provider_trials(provider_id);
      CREATE INDEX IF NOT EXISTS idx_provider_trials_nct_id ON provider_trials(nct_id);
      CREATE INDEX IF NOT EXISTS idx_provider_trials_status ON provider_trials(status);
    `);

    // Create appointments table for provider scheduling
    await client.query(`
      CREATE TABLE IF NOT EXISTS appointments (
        id SERIAL PRIMARY KEY,
        appointment_id VARCHAR(255) UNIQUE NOT NULL,
        provider_id VARCHAR(255) NOT NULL,
        patient_id VARCHAR(255),
        nct_id VARCHAR(20),
        title VARCHAR(500) NOT NULL,
        description TEXT,
        appointment_type VARCHAR(50) DEFAULT 'screening',
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP NOT NULL,
        location VARCHAR(500),
        video_link VARCHAR(500),
        status VARCHAR(50) DEFAULT 'scheduled',
        notes TEXT,
        reminder_sent BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_appointments_provider_id ON appointments(provider_id);
      CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON appointments(patient_id);
      CREATE INDEX IF NOT EXISTS idx_appointments_nct_id ON appointments(nct_id);
      CREATE INDEX IF NOT EXISTS idx_appointments_start_time ON appointments(start_time);
      CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
    `);

    // Create patient_pipeline table for tracking patient status in trials
    await client.query(`
      CREATE TABLE IF NOT EXISTS patient_pipeline (
        id SERIAL PRIMARY KEY,
        provider_id VARCHAR(255) NOT NULL,
        patient_id VARCHAR(255) NOT NULL,
        nct_id VARCHAR(20) NOT NULL,
        status VARCHAR(50) DEFAULT 'interested',
        match_score INTEGER,
        notes TEXT,
        contacted_at TIMESTAMP,
        screened_at TIMESTAMP,
        enrolled_at TIMESTAMP,
        withdrawn_at TIMESTAMP,
        withdrawal_reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(provider_id, patient_id, nct_id)
      );

      CREATE INDEX IF NOT EXISTS idx_patient_pipeline_provider_id ON patient_pipeline(provider_id);
      CREATE INDEX IF NOT EXISTS idx_patient_pipeline_patient_id ON patient_pipeline(patient_id);
      CREATE INDEX IF NOT EXISTS idx_patient_pipeline_nct_id ON patient_pipeline(nct_id);
      CREATE INDEX IF NOT EXISTS idx_patient_pipeline_status ON patient_pipeline(status);
    `);

    // Create provider_notes table for notes on patients
    await client.query(`
      CREATE TABLE IF NOT EXISTS provider_notes (
        id SERIAL PRIMARY KEY,
        provider_id VARCHAR(255) NOT NULL,
        patient_id VARCHAR(255) NOT NULL,
        nct_id VARCHAR(20),
        note_type VARCHAR(50) DEFAULT 'general',
        content TEXT NOT NULL,
        is_private BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_provider_notes_provider_id ON provider_notes(provider_id);
      CREATE INDEX IF NOT EXISTS idx_provider_notes_patient_id ON provider_notes(patient_id);
    `);

    // Create custom_trials table for provider-created trials
    await client.query(`
      CREATE TABLE IF NOT EXISTS custom_trials (
        id SERIAL PRIMARY KEY,
        trial_id VARCHAR(255) UNIQUE NOT NULL,
        provider_id VARCHAR(255) NOT NULL,
        title VARCHAR(500) NOT NULL,
        brief_summary TEXT,
        detailed_description TEXT,
        status VARCHAR(100) DEFAULT 'draft',
        phase VARCHAR(50),
        study_type VARCHAR(100),
        conditions JSONB,
        interventions JSONB,
        eligibility_criteria TEXT,
        min_age INTEGER,
        max_age INTEGER,
        gender VARCHAR(20),
        enrollment_target INTEGER,
        enrollment_current INTEGER DEFAULT 0,
        start_date DATE,
        estimated_completion DATE,
        primary_contact_name VARCHAR(255),
        primary_contact_email VARCHAR(255),
        primary_contact_phone VARCHAR(50),
        locations JSONB,
        documents JSONB,
        is_published BOOLEAN DEFAULT FALSE,
        published_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_custom_trials_provider_id ON custom_trials(provider_id);
      CREATE INDEX IF NOT EXISTS idx_custom_trials_status ON custom_trials(status);
      CREATE INDEX IF NOT EXISTS idx_custom_trials_is_published ON custom_trials(is_published);
    `);

    // Create site_members table for team management
    await client.query(`
      CREATE TABLE IF NOT EXISTS site_members (
        id SERIAL PRIMARY KEY,
        site_id VARCHAR(255) NOT NULL,
        user_id VARCHAR(255),
        email VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'coordinator',
        status VARCHAR(50) DEFAULT 'pending',
        invited_by VARCHAR(255),
        invited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        accepted_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(site_id, email)
      );

      CREATE INDEX IF NOT EXISTS idx_site_members_site_id ON site_members(site_id);
      CREATE INDEX IF NOT EXISTS idx_site_members_user_id ON site_members(user_id);
      CREATE INDEX IF NOT EXISTS idx_site_members_email ON site_members(email);
      CREATE INDEX IF NOT EXISTS idx_site_members_status ON site_members(status);
    `);

    // Create messages table for provider-patient communication
    await client.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        message_id VARCHAR(255) UNIQUE NOT NULL,
        sender_id VARCHAR(255) NOT NULL,
        recipient_id VARCHAR(255) NOT NULL,
        thread_id VARCHAR(255),
        subject VARCHAR(500),
        content TEXT NOT NULL,
        nct_id VARCHAR(20),
        is_read BOOLEAN DEFAULT FALSE,
        read_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
      CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON messages(recipient_id);
      CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON messages(thread_id);
      CREATE INDEX IF NOT EXISTS idx_messages_is_read ON messages(is_read);
    `);

    // Create auth_credentials table for secure password storage
    await client.query(`
      CREATE TABLE IF NOT EXISTS auth_credentials (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        email_verified BOOLEAN DEFAULT FALSE,
        email_verification_token VARCHAR(255),
        email_verification_expires TIMESTAMP,
        password_reset_token VARCHAR(255),
        password_reset_expires TIMESTAMP,
        failed_login_attempts INTEGER DEFAULT 0,
        locked_until TIMESTAMP,
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_auth_credentials_email ON auth_credentials(email);
      CREATE INDEX IF NOT EXISTS idx_auth_credentials_user_id ON auth_credentials(user_id);
    `);

    // Create sessions table for server-side session management
    await client.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id SERIAL PRIMARY KEY,
        session_id VARCHAR(255) UNIQUE NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        token_hash VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        ip_address VARCHAR(45),
        user_agent VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
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
