-- เปลี่ยนชื่อกลุ่มการกำจัดรายปี (คอลัมน์ level_disposal ในตาราง result_yearly) เป็นชื่อภาษาพูด
-- ตั้งจากลักษณะเด่นของแต่ละกลุ่ม (ทุกจังหวัด-ปีในกลุ่ม ตลอด 7 ปี) ชื่อชุดเดียวกับที่ใช้ในเว็บ (src/lib/data.js)
-- ชื่อเดิมเก็บไว้ในตาราง result_yearly_name_backup
-- รันทั้งไฟล์ใน Supabase SQL Editor ครั้งเดียว (อยู่ใน transaction ถ้าผิดตรงไหนจะไม่เปลี่ยนอะไรเลย)

begin;

-- 1) เก็บชื่อเดิมไว้ (ถ้ามีตาราง backup อยู่แล้ว คำสั่งนี้จะ error และยกเลิกทั้งชุด กันรันซ้ำ)
create table public.result_yearly_name_backup as
  select province, year, cluster, level_disposal
  from public.result_yearly;
alter table public.result_yearly_name_backup add primary key (province, year);
alter table public.result_yearly_name_backup enable row level security;

-- 2) เปลี่ยนชื่อ: เปลี่ยนเฉพาะแถวที่ยังเป็นชื่อเดิม และเลขกลุ่มตรง (กันเปลี่ยนผิดกลุ่ม)
update public.result_yearly as y
set level_disposal = m.new_name
from (values
  (1, 'ประสิทธิภาพสูง',     'จัดการขยะได้ดี'),
  (2, 'ปานกลาง ลำดับ 1/3',  'ขยะน้อย ค้างน้อย'),
  (3, 'ปานกลาง ลำดับ 2/3',  'รีไซเคิลดี แต่กำจัดไม่ถูกต้อง'),
  (4, 'ปานกลาง ลำดับ 3/3',  'ขยะตกค้างเยอะ แต่รีไซเคิลน้อย'),
  (5, 'ควรปรับปรุง',        'ทิ้งขยะผิดวิธีเยอะ')
) as m(cluster, old_name, new_name)
where y.cluster = m.cluster and y.level_disposal = m.old_name;

-- 3) ตรวจ: ต้องได้ 5 แถว แต่ละกลุ่มมีชื่อเดียว (33 / 170 / 166 / 86 / 84 แถว) และ backup_rows = 539
select cluster, level_disposal, count(*) as rows
from public.result_yearly
group by 1, 2
order by 1;

select count(*) as backup_rows from public.result_yearly_name_backup;

commit;

-- ถ้าต้องการย้อนกลับไปใช้ชื่อเดิม (รันส่วนนี้แยกต่างหาก):
-- begin;
-- update public.result_yearly as y
-- set level_disposal = b.level_disposal
-- from public.result_yearly_name_backup as b
-- where b.province = y.province and b.year = y.year;
-- drop table public.result_yearly_name_backup;
-- commit;
