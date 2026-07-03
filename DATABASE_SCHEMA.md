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
  avatar_url text,
  CONSTRAINT employee_pkey PRIMARY KEY (employee_id),
  CONSTRAINT employee_auth_user_id_fkey FOREIGN KEY (auth_user_id) REFERENCES auth.users(id),
  CONSTRAINT employee_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
