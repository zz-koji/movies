\restrict sLg31bZoPutac6DgqYjotDkeJtsbhhQ6rmOUvZS3wF3bYCAYVlcetpfmaEQKuEV

-- Dumped from database version 17.6 (Debian 17.6-2.pgdg13+1)
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;


--
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    admin_id uuid,
    action character varying(50) NOT NULL,
    entity_type character varying(50) NOT NULL,
    entity_id uuid NOT NULL,
    old_values jsonb,
    new_values jsonb,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: local_movies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.local_movies (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    title character varying(50) NOT NULL,
    description character varying(255) NOT NULL,
    movie_file_key character varying(255) NOT NULL,
    subtitle_file_key character varying(255),
    omdb_id character varying(255) NOT NULL
);


--
-- Name: movie_metadata; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.movie_metadata (
    omdb_id character varying(255) NOT NULL,
    title character varying(255) NOT NULL,
    year integer,
    genre text,
    director text,
    actors text,
    imdb_rating numeric(3,1),
    runtime integer,
    data jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: movie_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.movie_requests (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    omdb_id character varying(20),
    date_requested date DEFAULT now(),
    date_completed date,
    requested_by uuid NOT NULL,
    status character varying(20) DEFAULT 'queued'::character varying,
    priority character varying(10) DEFAULT 'medium'::character varying,
    title character varying(255),
    year integer,
    plot text,
    poster_url character varying(500),
    processed_by uuid,
    rejection_reason text,
    processing_notes text,
    notes text,
    fulfilled_by uuid,
    fulfilled_at timestamp with time zone,
    fulfilled_movie_id uuid
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    type character varying(50) NOT NULL,
    title character varying(255) NOT NULL,
    message text NOT NULL,
    reference_type character varying(50),
    reference_id uuid,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: request_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.request_comments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    request_id uuid NOT NULL,
    user_id uuid NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT request_comments_content_check CHECK ((char_length(content) <= 2000))
);


--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schema_migrations (
    version character varying NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(25) NOT NULL,
    date_created date DEFAULT now(),
    pin character varying(6),
    role character varying(20) DEFAULT 'user'::character varying,
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['user'::character varying, 'admin'::character varying])::text[])))
);


--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);


--
-- Name: local_movies local_movies_omdb_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.local_movies
    ADD CONSTRAINT local_movies_omdb_id_key UNIQUE (omdb_id);


--
-- Name: local_movies local_movies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.local_movies
    ADD CONSTRAINT local_movies_pkey PRIMARY KEY (id);


--
-- Name: movie_metadata movie_metadata_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movie_metadata
    ADD CONSTRAINT movie_metadata_pkey PRIMARY KEY (omdb_id);


--
-- Name: movie_requests movie_request_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movie_requests
    ADD CONSTRAINT movie_request_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: request_comments request_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.request_comments
    ADD CONSTRAINT request_comments_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: users unique_name; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT unique_name UNIQUE (name);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_audit_log_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_log_action ON public.audit_log USING btree (action);


--
-- Name: idx_audit_log_admin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_log_admin ON public.audit_log USING btree (admin_id);


--
-- Name: idx_audit_log_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_log_created ON public.audit_log USING btree (created_at DESC);


--
-- Name: idx_audit_log_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_log_entity ON public.audit_log USING btree (entity_type, entity_id);


--
-- Name: idx_movie_metadata_genre; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_movie_metadata_genre ON public.movie_metadata USING gin (to_tsvector('simple'::regconfig, COALESCE(genre, ''::text)));


--
-- Name: idx_movie_metadata_title; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_movie_metadata_title ON public.movie_metadata USING gin (to_tsvector('simple'::regconfig, (title)::text));


--
-- Name: idx_movie_metadata_updated_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_movie_metadata_updated_at ON public.movie_metadata USING btree (updated_at DESC);


--
-- Name: idx_movie_requests_date_requested; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_movie_requests_date_requested ON public.movie_requests USING btree (date_requested);


--
-- Name: idx_movie_requests_fulfilled_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_movie_requests_fulfilled_by ON public.movie_requests USING btree (fulfilled_by);


--
-- Name: idx_movie_requests_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_movie_requests_priority ON public.movie_requests USING btree (priority);


--
-- Name: idx_movie_requests_processed_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_movie_requests_processed_by ON public.movie_requests USING btree (processed_by);


--
-- Name: idx_movie_requests_requested_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_movie_requests_requested_by ON public.movie_requests USING btree (requested_by);


--
-- Name: idx_movie_requests_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_movie_requests_status ON public.movie_requests USING btree (status);


--
-- Name: idx_movie_requests_title_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_movie_requests_title_trgm ON public.movie_requests USING gin (title public.gin_trgm_ops);


--
-- Name: idx_notifications_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_created ON public.notifications USING btree (created_at DESC);


--
-- Name: idx_notifications_unread; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_unread ON public.notifications USING btree (user_id) WHERE (read_at IS NULL);


--
-- Name: idx_notifications_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user ON public.notifications USING btree (user_id);


--
-- Name: idx_request_comments_request; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_request_comments_request ON public.request_comments USING btree (request_id);


--
-- Name: idx_request_comments_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_request_comments_user ON public.request_comments USING btree (user_id);


--
-- Name: audit_log audit_log_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.users(id);


--
-- Name: movie_requests movie_requests_fulfilled_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movie_requests
    ADD CONSTRAINT movie_requests_fulfilled_by_fkey FOREIGN KEY (fulfilled_by) REFERENCES public.users(id);


--
-- Name: movie_requests movie_requests_fulfilled_movie_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movie_requests
    ADD CONSTRAINT movie_requests_fulfilled_movie_id_fkey FOREIGN KEY (fulfilled_movie_id) REFERENCES public.local_movies(id);


--
-- Name: movie_requests movie_requests_processed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movie_requests
    ADD CONSTRAINT movie_requests_processed_by_fkey FOREIGN KEY (processed_by) REFERENCES public.users(id);


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: request_comments request_comments_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.request_comments
    ADD CONSTRAINT request_comments_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.movie_requests(id) ON DELETE CASCADE;


--
-- Name: request_comments request_comments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.request_comments
    ADD CONSTRAINT request_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- PostgreSQL database dump complete
--

\unrestrict sLg31bZoPutac6DgqYjotDkeJtsbhhQ6rmOUvZS3wF3bYCAYVlcetpfmaEQKuEV


--
-- Dbmate schema migrations
--

INSERT INTO public.schema_migrations (version) VALUES
    ('20250115000000'),
    ('20250928200447'),
    ('20250928210930'),
    ('20250928225044'),
    ('20250928233737'),
    ('20251003040223'),
    ('20251009081500'),
    ('20251009223803'),
    ('20251012120000'),
    ('20251015120000'),
    ('20260204120000'),
    ('20260204120001');
