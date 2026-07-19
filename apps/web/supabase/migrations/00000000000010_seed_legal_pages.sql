insert into legal_pages (page_type, title, content)
select 'privacy_policy', 'Privacy Policy',
  '<p>This Privacy Policy describes how MANDERA CRM collects, uses, and protects your information. Replace this placeholder text with your actual privacy policy content.</p>'
where not exists (select 1 from legal_pages where page_type = 'privacy_policy');

insert into legal_pages (page_type, title, content)
select 'terms_of_service', 'Terms of Service',
  '<p>These Terms of Service govern your use of MANDERA CRM. Replace this placeholder text with your actual terms of service content.</p>'
where not exists (select 1 from legal_pages where page_type = 'terms_of_service');
