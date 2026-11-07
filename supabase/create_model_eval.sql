-- ผลทดสอบโมเดลจัดกลุ่มรายปี (K = 5) ใช้ในหน้า /models
-- ชื่อคอลัมน์ตามตารางผลจาก notebook (ตัวพิมพ์เล็ก)
create table if not exists public.model_eval (
  model           text primary key,           -- คีย์สั้นของโมเดล เช่น kmeans
  model_name      text not null,              -- ชื่อที่แสดงบนเว็บ
  sort_order      integer not null,
  is_chosen       boolean not null default false,
  is_baseline     boolean not null default false,
  k               integer not null,
  min_rows        integer,
  silhouette_base double precision,
  db_base         double precision,
  eta2_mean       double precision,
  eta2_reuse      double precision,
  eta2_proper     double precision,
  eta2_improper   double precision,
  province_purity double precision,
  ari_median      double precision,           -- B2 Random ไม่มีค่า (NaN) เก็บเป็น null
  ari_vs_kmeans   double precision
);

alter table public.model_eval enable row level security;

drop policy if exists "public read" on public.model_eval;
create policy "public read" on public.model_eval for select using (true);

insert into public.model_eval
  (model, model_name, sort_order, is_chosen, is_baseline, k, min_rows, silhouette_base, db_base, eta2_mean, eta2_reuse, eta2_proper, eta2_improper, province_purity, ari_median, ari_vs_kmeans)
values
  ('kmeans',   'K-means',                     1, true,  false, 5, 33,   0.104,  1.541, 0.554, 0.321, 0.732, 0.609, 0.913, 0.893, 1.000),
  ('ward',     'Ward',                        2, false, false, 5, 35,   0.165,  1.890, 0.527, 0.312, 0.666, 0.602, 0.946, 0.404, 0.440),
  ('gmm',      'GMM (diag)',                  3, false, false, 5, 66,   0.057,  2.427, 0.416, 0.354, 0.723, 0.173, 0.924, 0.623, 0.619),
  ('spectral', 'Spectral',                    4, false, false, 5, 34,   0.150,  1.691, 0.529, 0.288, 0.683, 0.616, 0.933, 0.490, 0.437),
  ('b1',       'B1 Rule: Improper quantiles', 5, false, true,  5, 107, -0.006,  2.969, 0.379, 0.067, 0.349, 0.721, 0.651, 0.874, 0.085),
  ('b2',       'B2 Random (mean of 300)',     6, false, true,  5, 33,  -0.059, 27.945, 0.007, 0.007, 0.007, 0.008, 0.457, null,  0.000)
on conflict (model) do update set
  model_name = excluded.model_name, sort_order = excluded.sort_order, is_chosen = excluded.is_chosen,
  is_baseline = excluded.is_baseline, k = excluded.k, min_rows = excluded.min_rows,
  silhouette_base = excluded.silhouette_base, db_base = excluded.db_base, eta2_mean = excluded.eta2_mean,
  eta2_reuse = excluded.eta2_reuse, eta2_proper = excluded.eta2_proper, eta2_improper = excluded.eta2_improper,
  province_purity = excluded.province_purity, ari_median = excluded.ari_median, ari_vs_kmeans = excluded.ari_vs_kmeans;
