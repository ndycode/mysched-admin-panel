-- Allow classes to be created without assigning an instructor
alter table public.classes
  alter column instructor_id drop not null;
