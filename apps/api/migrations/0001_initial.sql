CREATE TABLE users (
    id UUID PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    last_login_at TIMESTAMPTZ
);

CREATE TABLE clients (
    id UUID PRIMARY KEY,
    client_reference TEXT NOT NULL UNIQUE,
    first_name TEXT NOT NULL,
    surname TEXT NOT NULL,
    full_name TEXT NOT NULL,
    title TEXT,
    marital_status TEXT,
    date_of_birth DATE,
    home_address_line_1 TEXT,
    home_address_line_2 TEXT,
    town_city TEXT,
    county TEXT,
    eircode TEXT,
    mobile_number TEXT,
    work_phone TEXT,
    email TEXT,
    partner_name TEXT,
    partner_address TEXT,
    status TEXT NOT NULL,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    archived_at TIMESTAMPTZ
);

CREATE TABLE dependants (
    id UUID PRIMARY KEY,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    date_of_birth DATE,
    notes TEXT
);

CREATE TABLE employment_details (
    id UUID PRIMARY KEY,
    client_id UUID NOT NULL UNIQUE REFERENCES clients(id) ON DELETE CASCADE,
    occupation TEXT,
    employment_status TEXT,
    employer_name TEXT,
    income_salary NUMERIC(12, 2),
    work_address TEXT,
    sick_pay_entitlement TEXT,
    sick_pay_duration TEXT,
    notes TEXT
);

CREATE TABLE protection_details (
    id UUID PRIMARY KEY,
    client_id UUID NOT NULL UNIQUE REFERENCES clients(id) ON DELETE CASCADE,
    has_income_protection BOOLEAN,
    provider TEXT,
    deferred_period TEXT,
    current_weekly_cover NUMERIC(12, 2),
    current_annual_cover NUMERIC(12, 2),
    monthly_premium NUMERIC(12, 2),
    cover_to_age TEXT,
    policy_owner TEXT,
    notes TEXT
);

CREATE TABLE life_serious_illness_details (
    id UUID PRIMARY KEY,
    client_id UUID NOT NULL UNIQUE REFERENCES clients(id) ON DELETE CASCADE,
    mortgage_protection BOOLEAN,
    personal_insurance BOOLEAN,
    keyman_insurance BOOLEAN,
    partnership_insurance BOOLEAN,
    self_life_cover NUMERIC(12, 2),
    self_serious_illness_cover NUMERIC(12, 2),
    partner_life_cover NUMERIC(12, 2),
    partner_serious_illness_cover NUMERIC(12, 2),
    notes TEXT
);

CREATE TABLE fact_find (
    id UUID PRIMARY KEY,
    client_id UUID NOT NULL UNIQUE REFERENCES clients(id) ON DELETE CASCADE,
    personal_circumstances TEXT,
    financial_situation TEXT,
    needs_objectives TEXT,
    execution_only_confirmation BOOLEAN,
    terms_reviewed_received BOOLEAN,
    marketing_consent BOOLEAN,
    contact_phone BOOLEAN,
    contact_sms BOOLEAN,
    contact_email BOOLEAN,
    contact_post BOOLEAN,
    pep_confirmation BOOLEAN,
    business_source TEXT,
    recommendation_understood BOOLEAN,
    status TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE documents (
    id UUID PRIMARY KEY,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL,
    document_name TEXT NOT NULL,
    docx_file_path TEXT,
    pdf_file_path TEXT,
    generated_by UUID REFERENCES users(id),
    generated_at TIMESTAMPTZ NOT NULL,
    version TEXT,
    status TEXT NOT NULL
);

CREATE TABLE terms_of_business (
    id UUID PRIMARY KEY,
    client_id UUID NOT NULL UNIQUE REFERENCES clients(id) ON DELETE CASCADE,
    version TEXT NOT NULL,
    issued_date DATE,
    issued_by UUID REFERENCES users(id),
    received_by_client BOOLEAN,
    reviewed_by_client BOOLEAN,
    delivery_method TEXT,
    notes TEXT,
    generated_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE statement_of_suitability (
    id UUID PRIMARY KEY,
    client_id UUID NOT NULL UNIQUE REFERENCES clients(id) ON DELETE CASCADE,
    letter_date DATE,
    statement_type TEXT,
    provider_name TEXT,
    product_type TEXT,
    personal_circumstances TEXT,
    financial_situation TEXT,
    needs_objectives TEXT,
    recommendation_summary TEXT,
    recommended_cover NUMERIC(12, 2),
    deferred_period TEXT,
    cover_to_age TEXT,
    gross_monthly_premium NUMERIC(12, 2),
    discount_applied NUMERIC(12, 2),
    tax_relief_percentage NUMERIC(5, 2),
    net_monthly_cost NUMERIC(12, 2),
    paid_by TEXT,
    affordability_discussed BOOLEAN,
    client_happy_to_proceed BOOLEAN,
    recommendation_reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
    advisor_name TEXT,
    client_declaration_accepted BOOLEAN,
    client_signature_date DATE,
    status TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE files (
    id UUID PRIMARY KEY,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    original_filename TEXT NOT NULL,
    stored_filename TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT,
    category TEXT NOT NULL,
    uploaded_by UUID REFERENCES users(id),
    uploaded_at TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL,
    notes TEXT
);

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_dependants_client_id ON dependants (client_id);
CREATE INDEX idx_documents_client_id ON documents (client_id);
CREATE INDEX idx_files_client_id ON files (client_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs (user_id);
CREATE INDEX idx_audit_logs_client_id ON audit_logs (client_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs (created_at);
