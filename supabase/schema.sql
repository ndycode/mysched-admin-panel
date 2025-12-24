-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.admins (
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT admins_pkey PRIMARY KEY (user_id),
  CONSTRAINT admins_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.audit_log (
  id bigint NOT NULL DEFAULT nextval('audit_log_id_seq'::regclass),
  at timestamp with time zone NOT NULL DEFAULT now(),
  user_id uuid,
  action text NOT NULL,
  table_name text NOT NULL,
  row_id bigint,
  details jsonb CHECK (pg_column_size(details) <= 4096),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT audit_log_pkey PRIMARY KEY (id),
  CONSTRAINT audit_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.class_issue_reports (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id uuid NOT NULL,
  class_id bigint NOT NULL,
  section_id bigint,
  note text,
  snapshot jsonb NOT NULL,
  status text NOT NULL DEFAULT 'new'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  resolution_note text,
  CONSTRAINT class_issue_reports_pkey PRIMARY KEY (id),
  CONSTRAINT class_issue_reports_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT class_issue_reports_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id),
  CONSTRAINT class_issue_reports_section_id_fkey FOREIGN KEY (section_id) REFERENCES public.sections(id)
);
CREATE TABLE public.classes (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  section_id bigint NOT NULL,
  code text,
  title text,
  units integer,
  room text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  archived_at timestamp with time zone,
  start time without time zone,
  end time without time zone,
  day USER-DEFINED,
  instructor_id uuid,
  CONSTRAINT classes_pkey PRIMARY KEY (id),
  CONSTRAINT classes_section_id_fkey FOREIGN KEY (section_id) REFERENCES public.sections(id),
  CONSTRAINT fk_classes_section FOREIGN KEY (section_id) REFERENCES public.sections(id),
  CONSTRAINT classes_instructor_id_fkey FOREIGN KEY (instructor_id) REFERENCES public.instructors(id),
  CONSTRAINT classes_section_fk FOREIGN KEY (section_id) REFERENCES public.sections(id)
);
CREATE TABLE public.instructors (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text,
  avatar_url text,
  title text,
  department text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  normalized_name text DEFAULT lower(TRIM(BOTH FROM regexp_replace(full_name, '\s+'::text, ' '::text, 'g'::text))),
  user_id uuid UNIQUE,
  CONSTRAINT instructors_pkey PRIMARY KEY (id),
  CONSTRAINT instructors_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  full_name text,
  student_id text UNIQUE,
  avatar_url text,
  app_user_id integer NOT NULL DEFAULT nextval('profiles_app_user_id_seq'::regclass) UNIQUE,
  created_at timestamp with time zone DEFAULT now(),
  email text UNIQUE,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.reminders (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id uuid NOT NULL,
  title text NOT NULL CHECK (char_length(title) <= 160),
  details text,
  due_at timestamp with time zone NOT NULL,
  status USER-DEFINED NOT NULL DEFAULT 'pending'::reminder_status,
  snooze_until timestamp with time zone,
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT reminders_pkey PRIMARY KEY (id),
  CONSTRAINT reminders_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.reward_emails (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  email text NOT NULL,
  CONSTRAINT reward_emails_pkey PRIMARY KEY (id)
);
CREATE TABLE public.sections (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  code text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  section_number text,
  semester_id bigint,
  CONSTRAINT sections_pkey PRIMARY KEY (id),
  CONSTRAINT sections_semester_id_fkey FOREIGN KEY (semester_id) REFERENCES public.semesters(id)
);
CREATE TABLE public.semesters (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  academic_year text,
  term integer CHECK (term >= 1 AND term <= 3),
  start_date date,
  end_date date,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT semesters_pkey PRIMARY KEY (id)
);
CREATE TABLE public.study_sessions (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id uuid NOT NULL,
  session_type text NOT NULL CHECK (session_type = ANY (ARRAY['work'::text, 'short_break'::text, 'long_break'::text])),
  duration_minutes integer NOT NULL CHECK (duration_minutes > 0),
  started_at timestamp with time zone NOT NULL,
  completed_at timestamp with time zone NOT NULL DEFAULT now(),
  class_id bigint,
  class_title text,
  skipped boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT study_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT study_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.survey_responses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  respondent_name text NOT NULL,
  responses jsonb NOT NULL,
  user_agent text,
  completed_at timestamp with time zone DEFAULT now(),
  respondent_section text,
  CONSTRAINT survey_responses_pkey PRIMARY KEY (id)
);
CREATE TABLE public.survey_settings (
  id integer NOT NULL DEFAULT 1 CHECK (id = 1),
  is_reward_active boolean DEFAULT true,
  reward_limit integer DEFAULT 20,
  CONSTRAINT survey_settings_pkey PRIMARY KEY (id)
);
CREATE TABLE public.user_class_overrides (
  user_id uuid NOT NULL,
  class_id bigint NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  CONSTRAINT user_class_overrides_pkey PRIMARY KEY (user_id, class_id),
  CONSTRAINT user_class_overrides_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT user_class_overrides_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id),
  CONSTRAINT fk_user_class_overrides_user FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.user_custom_classes (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id uuid NOT NULL,
  day USER-DEFINED NOT NULL CHECK (day = ANY (ARRAY['Mon'::dow, 'Tue'::dow, 'Wed'::dow, 'Thu'::dow, 'Fri'::dow, 'Sat'::dow, 'Sun'::dow])),
  start_time text NOT NULL,
  end_time text NOT NULL,
  title text NOT NULL,
  room text DEFAULT ''::text,
  instructor text DEFAULT ''::text,
  created_at timestamp with time zone DEFAULT now(),
  enabled boolean DEFAULT true,
  instructor_avatar text,
  CONSTRAINT user_custom_classes_pkey PRIMARY KEY (id),
  CONSTRAINT user_custom_classes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.user_sections (
  user_id uuid NOT NULL,
  section_id bigint NOT NULL,
  added_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_sections_pkey PRIMARY KEY (user_id, section_id),
  CONSTRAINT user_sections_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT user_sections_section_id_fkey FOREIGN KEY (section_id) REFERENCES public.sections(id)
);
CREATE TABLE public.user_settings (
  user_id uuid NOT NULL,
  use_24_hour_format boolean DEFAULT false,
  haptic_feedback boolean DEFAULT true,
  class_alarms boolean DEFAULT true,
  app_notifs boolean DEFAULT true,
  quiet_week boolean DEFAULT false,
  verbose_logging boolean DEFAULT false,
  class_lead_minutes integer DEFAULT 5,
  snooze_minutes integer DEFAULT 5,
  reminder_lead_minutes integer DEFAULT 0,
  dnd_enabled boolean DEFAULT false,
  dnd_start_time text DEFAULT '22:00'::text,
  dnd_end_time text DEFAULT '07:00'::text,
  alarm_volume integer DEFAULT 80,
  alarm_vibration boolean DEFAULT true,
  alarm_ringtone text DEFAULT 'default'::text,
  auto_refresh_minutes integer DEFAULT 30,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_settings_pkey PRIMARY KEY (user_id),
  CONSTRAINT user_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);