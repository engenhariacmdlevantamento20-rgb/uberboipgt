-- UBER BOI PGT — migração 002: transportes, propostas, rotas, documentos, avaliações, rastreamento
ALTER TABLE users ADD COLUMN share_phone boolean NOT NULL DEFAULT true;

CREATE TABLE animal_categories (code text PRIMARY KEY, name text NOT NULL, active boolean NOT NULL DEFAULT true);
INSERT INTO animal_categories VALUES ('boi','Boi',true),('vaca','Vaca',true),('novilha','Novilha',true),
  ('bezerro','Bezerro',true),('bezerra','Bezerra',true),('touro','Touro',true);

CREATE TABLE routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  distance_m integer NOT NULL, duration_s integer NOT NULL,
  paved_m integer NOT NULL DEFAULT 0, unpaved_m integer NOT NULL DEFAULT 0, unknown_m integer NOT NULL DEFAULT 0,
  coordinates jsonb NOT NULL,          -- [[lng,lat],...] traçado
  waypoints jsonb NOT NULL,            -- [[lng,lat],...] origem, pontos intermediários, destino
  is_custom boolean NOT NULL DEFAULT false,
  profile text, created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE transport_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  producer_id uuid NOT NULL REFERENCES users(id),
  origin_farm_id uuid REFERENCES farms(id) ON DELETE SET NULL,
  origin_name text NOT NULL, origin geography(Point,4326) NOT NULL,
  dest_name text NOT NULL, dest_kind text NOT NULL DEFAULT 'outro', dest geography(Point,4326) NOT NULL,
  pickup_date date, pickup_time time, tolerance_minutes integer,
  urgent boolean NOT NULL DEFAULT false, flexible boolean NOT NULL DEFAULT false,
  notes text, route_id uuid REFERENCES routes(id),
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('published','awarded','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON transport_requests(status, created_at DESC);
CREATE INDEX ON transport_requests USING gist(origin);

CREATE TABLE transport_animals (
  id serial PRIMARY KEY,
  request_id uuid NOT NULL REFERENCES transport_requests(id) ON DELETE CASCADE,
  category_code text NOT NULL REFERENCES animal_categories(code),
  quantity integer NOT NULL CHECK (quantity > 0),
  approx_weight_kg integer
);

CREATE TABLE quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES transport_requests(id) ON DELETE CASCADE,
  transporter_id uuid NOT NULL REFERENCES users(id),
  truck_id uuid REFERENCES trucks(id),
  price_cents integer NOT NULL CHECK (price_cents > 0),
  eta_note text, note text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','withdrawn')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (request_id, transporter_id)
);

CREATE TABLE transports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL UNIQUE REFERENCES transport_requests(id),
  quote_id uuid NOT NULL REFERENCES quotes(id),
  producer_id uuid NOT NULL REFERENCES users(id),
  transporter_id uuid NOT NULL REFERENCES users(id),
  truck_id uuid REFERENCES trucks(id),
  status text NOT NULL DEFAULT 'documentation' CHECK (status IN
    ('documentation','scheduled','arrived_origin','loading','in_transit','arrived_dest','unloading','completed','cancelled')),
  tracking_active boolean NOT NULL DEFAULT false,
  started_at timestamptz, completed_at timestamptz, cancel_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON transports(producer_id); CREATE INDEX ON transports(transporter_id);

CREATE TABLE transport_events (
  id bigserial PRIMARY KEY,
  transport_id uuid NOT NULL REFERENCES transports(id) ON DELETE CASCADE,
  status text NOT NULL, user_id uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE tracking_points (
  id bigserial PRIMARY KEY,
  transport_id uuid NOT NULL REFERENCES transports(id) ON DELETE CASCADE,
  location geography(Point,4326) NOT NULL, speed_kmh real,
  recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON tracking_points(transport_id, recorded_at DESC);

-- Documentos: arquivo guardado no banco (MVP). Acesso só pelos participantes. Migrar para storage S3/R2 depois.
CREATE TABLE documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transport_id uuid NOT NULL REFERENCES transports(id) ON DELETE CASCADE,
  uploader_id uuid NOT NULL REFERENCES users(id),
  kind text NOT NULL, number text, issued_on date, valid_until date, note text,
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('pending','sent','in_review','approved','rejected','expired')),
  filename text NOT NULL, mime text NOT NULL, size integer NOT NULL, content bytea NOT NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON documents(transport_id);

CREATE TABLE ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transport_id uuid NOT NULL REFERENCES transports(id) ON DELETE CASCADE,
  rater_id uuid NOT NULL REFERENCES users(id),
  ratee_id uuid NOT NULL REFERENCES users(id),
  overall smallint NOT NULL CHECK (overall BETWEEN 1 AND 5),
  scores jsonb NOT NULL DEFAULT '{}', comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (transport_id, rater_id)
);
CREATE INDEX ON ratings(ratee_id);

-- Contribuição dos usuários para o mapa (estrada ruim, ponte caída, atoleiro...)
CREATE TABLE road_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  kind text NOT NULL, note text, location geography(Point,4326) NOT NULL,
  confirmations integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','validated','rejected')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON road_reports USING gist(location);
