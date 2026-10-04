-- UBER BOI PGT — migração 001: base do MVP (Fase 1, passo 1)
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Configurações editáveis pelo admin (nada de regra fixa no código)
CREATE TABLE system_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO system_settings(key, value) VALUES
  ('trial_days', '30'),
  ('tracking_interval_seconds', '60');

-- Regiões como dados configuráveis
CREATE TABLE states (
  code char(2) PRIMARY KEY,
  name text NOT NULL,
  active boolean NOT NULL DEFAULT true
);
INSERT INTO states(code, name) VALUES ('GO','Goiás'), ('TO','Tocantins'), ('DF','Distrito Federal');

CREATE TABLE municipalities (
  ibge_code integer PRIMARY KEY,
  name text NOT NULL,
  state_code char(2) NOT NULL REFERENCES states(code),
  active boolean NOT NULL DEFAULT true
);
CREATE INDEX ON municipalities(state_code, name);

-- Uma conta, vários papéis (produtor, transportador, motorista, admin)
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email citext NOT NULL UNIQUE,
  phone text NOT NULL,
  password_hash text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','blocked','deleted')),
  email_verified_at timestamptz,
  phone_verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON users(phone);

CREATE TABLE user_roles (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('producer','transporter','driver','admin')),
  PRIMARY KEY (user_id, role)
);

CREATE TABLE sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  user_agent text,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON sessions(user_id);

-- LGPD: registro de consentimento
CREATE TABLE consents (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL,            -- 'terms' | 'privacy'
  version text NOT NULL,
  ip text,
  accepted_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE audit_logs (
  id bigserial PRIMARY KEY,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action text NOT NULL,
  ip text,
  meta jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON audit_logs(action, created_at DESC);

-- Planos e assinaturas (preços/limites editados pelo admin, não no código)
CREATE TABLE plans (
  id serial PRIMARY KEY,
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  price_cents integer NOT NULL DEFAULT 0,
  interval_days integer NOT NULL DEFAULT 30,
  features jsonb NOT NULL DEFAULT '{}',
  limits jsonb NOT NULL DEFAULT '{}',
  active boolean NOT NULL DEFAULT true
);
INSERT INTO plans(code, name) VALUES
  ('free','Gratuito'), ('pro','Profissional'), ('business','Empresarial');

CREATE TABLE subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id integer REFERENCES plans(id),
  status text NOT NULL CHECK (status IN ('trial','active','expired','canceled')),
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON subscriptions(user_id);

-- Fazendas e pontos (sede, porteira, curral, embarque...)
CREATE TABLE farms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  state_code char(2) NOT NULL REFERENCES states(code),
  municipality_ibge integer REFERENCES municipalities(ibge_code),
  address_reference text,
  road_type text,
  access_notes text,
  photos jsonb NOT NULL DEFAULT '[]',
  location geography(Point, 4326),
  visibility text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public','after_quote','private')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON farms USING gist(location);

CREATE TABLE farm_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('sede','porteira','curral','embarque','estrada_interna','encontro','outro')),
  name text NOT NULL,
  notes text,
  location geography(Point, 4326) NOT NULL
);
CREATE INDEX ON farm_points USING gist(location);

CREATE TABLE trucks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plate text NOT NULL,
  brand text, model text, year integer,
  type text NOT NULL DEFAULT 'truck',        -- toco, truck, carreta, bitrem, outro (lista configurável)
  body_type text,
  capacity_heads integer,
  compartments integer,
  photos jsonb NOT NULL DEFAULT '[]',
  notes text,
  active boolean NOT NULL DEFAULT true,
  UNIQUE (owner_id, plate)
);
