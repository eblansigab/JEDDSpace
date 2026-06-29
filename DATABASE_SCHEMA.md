-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.
-- Never invent columns.
-- Only use columns that exist in DATABASE_SCHEMA.md.

CREATE TABLE public.employee (
  employee_id integer NOT NULL DEFAULT nextval('employee_employee_id_seq'::regclass),
  first_name character varying NOT NULL,
  last_name character varying NOT NULL,
  position character varying NOT NULL,
  department character varying NOT NULL,
  status USER-DEFINED DEFAULT 'active'::employee_status,
  created_at timestamp without time zone DEFAULT now(),
  auth_user_id uuid,
  user_id uuid UNIQUE,
  role character varying DEFAULT 'employee'::character varying,
  is_archived boolean DEFAULT false,
  employment_status character varying DEFAULT 'active'::character varying,
  date_hired timestamp without time zone,
  date_resigned timestamp without time zone,
  date_terminated timestamp without time zone,
  date_rehired timestamp without time zone,
  email character varying UNIQUE,
  registration_status character varying DEFAULT 'pending'::character varying,
  employee_type character varying DEFAULT 'staff'::character varying,
  CONSTRAINT employee_pkey PRIMARY KEY (employee_id),
  CONSTRAINT employee_auth_user_id_fkey FOREIGN KEY (auth_user_id) REFERENCES auth.users(id),
  CONSTRAINT employee_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.announcement (
  announcement_id integer NOT NULL DEFAULT nextval('announcement_announcement_id_seq'::regclass),
  title character varying,
  body text,
  status USER-DEFINED DEFAULT 'unpublished'::announcement_status,
  created_at timestamp without time zone DEFAULT now(),
  user_id uuid,
  CONSTRAINT announcement_pkey PRIMARY KEY (announcement_id),
  CONSTRAINT announcement_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.employee(user_id)
);
CREATE TABLE public.job (
  job_id integer NOT NULL DEFAULT nextval('job_job_id_seq'::regclass),
  employee_id integer,
  department character varying NOT NULL,
  status USER-DEFINED DEFAULT 'open'::job_status,
  destination character varying NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  created_at timestamp without time zone DEFAULT now(),
  created_by uuid,
  notes text,
  CONSTRAINT job_pkey PRIMARY KEY (job_id),
  CONSTRAINT job_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employee(employee_id),
  CONSTRAINT job_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.employee(user_id)
);
CREATE TABLE public.leaveform (
  leaveform_id integer NOT NULL DEFAULT nextval('leaveform_leaveform_id_seq'::regclass),
  employee_id integer,
  start_date date NOT NULL,
  end_date date NOT NULL,
  type USER-DEFINED,
  reason character varying NOT NULL,
  status USER-DEFINED DEFAULT 'pending'::leaveform_status,
  created_at timestamp without time zone DEFAULT now(),
  created_by uuid,
  isCredited boolean DEFAULT false,
  CONSTRAINT leaveform_pkey PRIMARY KEY (leaveform_id),
  CONSTRAINT leaveform_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employee(employee_id),
  CONSTRAINT leaveform_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.employee(user_id)
);
CREATE TABLE public.businessform (
  businessform_id integer NOT NULL DEFAULT nextval('businessform_businessform_id_seq'::regclass),
  employee_id integer,
  project_id integer,
  start_date date NOT NULL,
  end_date date NOT NULL,
  location character varying NOT NULL,
  company_car character varying NOT NULL,
  driver_name character varying NOT NULL,
  phone_num character varying NOT NULL,
  created_at timestamp without time zone DEFAULT now(),
  created_by uuid,
  CONSTRAINT businessform_pkey PRIMARY KEY (businessform_id),
  CONSTRAINT businessform_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employee(employee_id),
  CONSTRAINT businessform_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.employee(user_id)
);
CREATE TABLE public.document (
  document_id integer NOT NULL DEFAULT nextval('document_document_id_seq'::regclass),
  created_at timestamp without time zone DEFAULT now(),
  uploaded_by uuid,
  upload_id uuid,
  title text,
  file_path text,
  file_size bigint,
  file_type text,
  file_name text,
  ai_summary text,
  CONSTRAINT document_pkey PRIMARY KEY (document_id),
  CONSTRAINT document_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.employee(user_id),
  CONSTRAINT document_upload_id_fkey FOREIGN KEY (upload_id) REFERENCES storage.objects(id)
);
CREATE TABLE public.email (
  email_id integer NOT NULL DEFAULT nextval('email_email_id_seq'::regclass),
  sender_id integer,
  recipient_email character varying NOT NULL,
  subject character varying,
  message_body text,
  folder USER-DEFINED DEFAULT 'inbox'::email_folder,
  is_read boolean DEFAULT false,
  attachment_url text,
  created_at timestamp without time zone DEFAULT now(),
  reply_to_email_id integer,
  deleted_by_sender boolean DEFAULT false,
  deleted_by_recipient boolean DEFAULT false,
  thread_id integer,
  CONSTRAINT email_pkey PRIMARY KEY (email_id),
  CONSTRAINT email_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.employee(employee_id),
  CONSTRAINT email_reply_to_fkey FOREIGN KEY (reply_to_email_id) REFERENCES public.email(email_id),
  CONSTRAINT fk_thread FOREIGN KEY (thread_id) REFERENCES public.email(email_id)
);
CREATE TABLE public.contracts (
  contracts_id integer NOT NULL DEFAULT nextval('contracts_contracts_id_seq'::regclass),
  job_id integer,
  contract_url text,
  start_date date NOT NULL,
  end_date date,
  salary numeric,
  contract_title character varying,
  contract_file_url character varying,
  status USER-DEFINED DEFAULT 'pending_signature'::contract_status,
  created_at timestamp with time zone DEFAULT now(),
  contractor integer,
  contract_document integer,
  CONSTRAINT contracts_pkey PRIMARY KEY (contracts_id),
  CONSTRAINT contracts_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.job(job_id),
  CONSTRAINT contracts_contractor_fkey FOREIGN KEY (contractor) REFERENCES public.employee(employee_id),
  CONSTRAINT contracts_contract_document_fkey FOREIGN KEY (contract_document) REFERENCES public.document(document_id)
);
CREATE TABLE public.notification (
  notifications_id integer NOT NULL DEFAULT nextval('notification_notifications_id_seq'::regclass),
  title character varying NOT NULL,
  type USER-DEFINED NOT NULL,
  is_read boolean DEFAULT false,
  link_id integer,
  created_at timestamp with time zone DEFAULT now(),
  notify_to integer,
  created_by uuid,
  priority character varying DEFAULT 'Normal'::character varying,
  message text,
  CONSTRAINT notification_pkey PRIMARY KEY (notifications_id),
  CONSTRAINT notification_notify_to_fkey FOREIGN KEY (notify_to) REFERENCES public.employee(employee_id),
  CONSTRAINT notification_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.employee(user_id)
);
CREATE TABLE public.audit_logs (
  audit_id integer NOT NULL DEFAULT nextval('audit_logs_audit_id_seq'::regclass),
  table_name character varying,
  record_id integer,
  blockchain_hash text NOT NULL,
  transaction_hash text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT audit_logs_pkey PRIMARY KEY (audit_id)
);
CREATE TABLE public.ai_summarization (
  summary_id integer NOT NULL DEFAULT nextval('ai_summarization_summary_id_seq'::regclass),
  reference_type character varying,
  content_summary text,
  raw_data_snapshot text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT ai_summarization_pkey PRIMARY KEY (summary_id)
);
CREATE TABLE public.test (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  name text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT test_pkey PRIMARY KEY (id)
);
CREATE TABLE public.leavecredits (
  creditid bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  uuid uuid NOT NULL DEFAULT gen_random_uuid(),
  credits bigint DEFAULT '0'::bigint,
  CONSTRAINT leavecredits_pkey PRIMARY KEY (creditid),
  CONSTRAINT leavecredits_uuid_fkey FOREIGN KEY (uuid) REFERENCES auth.users(id)
);
CREATE TABLE public.user_sessions (
  session_id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  device_name text,
  ip_address text,
  created_at timestamp with time zone DEFAULT now(),
  last_active timestamp with time zone DEFAULT now(),
  is_current boolean DEFAULT false,
  CONSTRAINT user_sessions_pkey PRIMARY KEY (session_id)
);
CREATE TABLE public.ai_chat_logs (
  chat_id bigint NOT NULL DEFAULT nextval('ai_chat_logs_chat_id_seq'::regclass),
  user_id uuid,
  prompt text NOT NULL,
  response text NOT NULL,
  intent character varying,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT ai_chat_logs_pkey PRIMARY KEY (chat_id),
  CONSTRAINT ai_chat_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.employee(user_id)
);