-- Bayut/dubizzle's combined XML feed also supports <Videos>/<Video> and
-- <Floor_Plans>/<Floor_Plan> — plain lists of publicly-accessible URLs,
-- same shape as <Images>/<Image>. See docs/"Bayut & dubizzle Combined XML
-- Guidelines - Updated.pdf".
--
-- Nullable/defaulted array columns so existing rows stay valid.

alter table properties
  add column if not exists video_urls text[] not null default '{}',
  add column if not exists floor_plan_urls text[] not null default '{}';
