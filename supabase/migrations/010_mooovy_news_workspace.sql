-- Phase 2-3: Mooovy chat + Daily Insight Feed + Workspace layouts.

-- ===== Mooovy schema (separate namespace) =====
CREATE SCHEMA IF NOT EXISTS mooovy;

CREATE TABLE IF NOT EXISTS mooovy.conversations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id),
  title       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS mooovy.messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES mooovy.conversations(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK (role IN ('user','assistant','system','tool')),
  content         TEXT,
  tool_calls      JSONB,
  citations       JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mooovy_messages_conv ON mooovy.messages(conversation_id, created_at);

ALTER TABLE mooovy.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE mooovy.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conversations_org" ON mooovy.conversations FOR ALL
  USING (public.is_org_member(org_id))
  WITH CHECK (public.is_org_member(org_id));

CREATE POLICY "messages_via_conv" ON mooovy.messages FOR ALL
  USING (EXISTS (SELECT 1 FROM mooovy.conversations c WHERE c.id = messages.conversation_id AND public.is_org_member(c.org_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM mooovy.conversations c WHERE c.id = messages.conversation_id AND public.is_org_member(c.org_id)));

-- ===== news_items + seller_insights =====
CREATE TABLE IF NOT EXISTS public.news_items (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category              TEXT NOT NULL CHECK (category IN ('Carrier','Platform','Trade','Logistics','Macro','Tip')),
  headline              TEXT NOT NULL,
  summary               TEXT NOT NULL,
  source_url_primary    TEXT,
  source_url_secondary  TEXT,
  published_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  affected_carriers     TEXT[],
  affected_platforms    TEXT[],
  is_published          BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_news_published ON public.news_items(published_at DESC) WHERE is_published = TRUE;

ALTER TABLE public.news_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "news_items_read" ON public.news_items FOR SELECT
  USING (auth.role() = 'authenticated' AND is_published = TRUE);

CREATE POLICY "news_items_admin_write" ON public.news_items FOR ALL
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

CREATE TABLE IF NOT EXISTS public.seller_insights (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                      UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  source_type                 TEXT NOT NULL CHECK (source_type IN ('internal','external','tip')),
  news_item_id                UUID REFERENCES public.news_items(id),
  title                       TEXT NOT NULL,
  body                        TEXT NOT NULL,
  severity                    TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info','opportunity','warning','critical')),
  impact_level                TEXT CHECK (impact_level IN ('high','medium','low','fyi')),
  estimated_dollar_impact_usd NUMERIC(10,2),
  recommended_action_label    TEXT,
  recommended_action_deeplink TEXT,
  user_state                  TEXT NOT NULL DEFAULT 'active' CHECK (user_state IN ('active','liked','disliked','dismissed')),
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_insights_org ON public.seller_insights(org_id, created_at DESC) WHERE user_state = 'active';

ALTER TABLE public.seller_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "insights_org" ON public.seller_insights FOR ALL
  USING (public.is_org_member(org_id))
  WITH CHECK (public.is_org_member(org_id));

-- ===== workspace_layouts =====
CREATE TABLE IF NOT EXISTS public.workspace_layouts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id),
  name       TEXT NOT NULL DEFAULT 'My Workspace',
  widgets    JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.workspace_layouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "layouts_user" ON public.workspace_layouts FOR ALL
  USING (user_id = auth.uid() AND public.is_org_member(org_id))
  WITH CHECK (user_id = auth.uid() AND public.is_org_member(org_id));

-- ===== Seed news_items =====
INSERT INTO public.news_items (category, headline, summary, source_url_primary, source_url_secondary, affected_carriers, is_published)
VALUES
  ('Carrier', 'FedEx 2026 GRI: 5.9% across services',
   'FedEx Ground and Express both seeing 5.9% general rate increases effective Jan 1. Dim divisor unchanged at 139.',
   'https://www.fedex.com/en-us/shipping/rate-changes.html',
   'https://www.parcelindustry.com/article-12345-FedEx-2026-GRI.html',
   ARRAY['FedEx'], TRUE),
  ('Carrier', 'UPS surcharges added for residential deliveries in 2026',
   'New $0.95 fee per residential delivery announced for Q2 2026. Stack with existing $5.95 large-package handling.',
   'https://www.ups.com/us/en/help-center/billing-payment/surcharges.html',
   'https://www.shippingnews.com/ups-2026-surcharges',
   ARRAY['UPS'], TRUE),
  ('Trade', 'Section 301 tariffs extended on furniture HTS codes',
   'USTR confirmed extension of 25% tariffs on Chinese-origin furniture (HTS 9401-9403). Effective immediately.',
   'https://ustr.gov/issue-areas/enforcement/section-301-investigations',
   'https://www.tradejournal.com/section-301-extension',
   NULL, TRUE),
  ('Tip', 'Switch to ground for shipments under 5 lb in zone 2-3',
   'Air rates 3x ground for short distances. Quick win: filter your data for zone 2-3 + Air, calculate savings.',
   NULL, NULL, NULL, TRUE);
