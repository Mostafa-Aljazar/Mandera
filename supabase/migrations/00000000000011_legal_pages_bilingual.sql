-- legal_pages: store English and Arabic content separately
alter table legal_pages
  add column title_en text,
  add column title_ar text,
  add column content_en text,
  add column content_ar text;

update legal_pages
set
  title_en = title,
  content_en = content,
  title_ar = case page_type
    when 'privacy_policy' then 'سياسة الخصوصية'
    when 'terms_of_service' then 'شروط الخدمة'
    else title
  end,
  content_ar = case page_type
    when 'privacy_policy' then
      '<p>تصف سياسة الخصوصية هذه كيفية جمع منصة مانديرا CRM لمعلوماتك واستخدامها وحمايتها. استبدل هذا النص النائب بمحتوى سياسة الخصوصية الفعلي.</p>'
    when 'terms_of_service' then
      '<p>تحكم شروط الخدمة هذه استخدامك لمنصة مانديرا CRM. استبدل هذا النص النائب بمحتوى شروط الخدمة الفعلي.</p>'
    else content
  end;

alter table legal_pages
  alter column title_en set not null,
  alter column title_ar set not null,
  alter column content_en set not null,
  alter column content_ar set not null;

alter table legal_pages
  drop column title,
  drop column content;
