/** 브릭라이즈 웹 DB 스키마 (Postgres). 서버가 처음 연결할 때 자동으로 만든다 (IF NOT EXISTS). */
export const SCHEMA = `
-- 브릭라이즈 웹 DB 스키마 (Postgres). 서버가 처음 연결할 때 자동으로 만든다.

-- 동의 기록: 약관 버전·시각 포함, 삭제 금지
CREATE TABLE IF NOT EXISTS consents (
  id            uuid PRIMARY KEY,
  device_id     text NOT NULL,
  terms_version text NOT NULL,
  answers       jsonb NOT NULL,
  ip_hash       text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS consents_device_idx ON consents (device_id, created_at DESC);

-- 시안
CREATE TABLE IF NOT EXISTS drafts (
  id           uuid PRIMARY KEY,
  device_id    text NOT NULL,
  shape        text NOT NULL CHECK (shape IN ('flat','solid')),
  size_cm      smallint NOT NULL CHECK (size_cm IN (5,10,15)),
  photo_hash   text NOT NULL,
  photo_key    text,
  generator    text NOT NULL,
  is_mock      boolean NOT NULL DEFAULT false,
  model        jsonb NOT NULL,
  block_count  integer NOT NULL,
  color_count  integer NOT NULL,
  total        integer NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS drafts_reuse_idx ON drafts (device_id, photo_hash, shape, size_cm);

-- 주문 코드: 7일 유효, 1회용
CREATE TABLE IF NOT EXISTS order_codes (
  code         text PRIMARY KEY,
  draft_id     uuid NOT NULL REFERENCES drafts(id),
  shape        text NOT NULL,
  size_cm      smallint NOT NULL,
  block_count  integer NOT NULL,
  block_qty    integer NOT NULL,
  total        integer NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  expires_at   timestamptz NOT NULL,
  used_at      timestamptz,
  order_id     uuid
);
CREATE INDEX IF NOT EXISTS order_codes_draft_idx ON order_codes (draft_id);

-- 결제 후 주문 검증 기록 (불일치 포함 모두 남김)
CREATE TABLE IF NOT EXISTS order_verifications (
  id              uuid PRIMARY KEY,
  code            text NOT NULL,
  naver_order_no  text NOT NULL,
  paid_shape      text NOT NULL,
  paid_size_cm    smallint NOT NULL,
  paid_qty        integer NOT NULL,
  paid_amount     integer NOT NULL,
  passed          boolean NOT NULL,
  checks          jsonb NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- 하루 무료 횟수 카운터 (하루 지나면 지워도 되는 값)
CREATE TABLE IF NOT EXISTS quota_counters (
  day    date NOT NULL,
  key    text NOT NULL,
  count  integer NOT NULL DEFAULT 0,
  PRIMARY KEY (day, key)
);
`;
