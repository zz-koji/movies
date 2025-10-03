\restrict WCnNubl3mvDUZflIKGIWzCmPxSUFsjJ3Xr0ehx1kZfhs6ubHFlomTE2a5aJS4gM

-- Dumped from database version 17.6 (Debian 17.6-2.pgdg13+1)
-- Dumped by pg_dump version 17.6

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
-- Name: movie_request; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.movie_request (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    imdb_id character varying(20) NOT NULL,
    date_requested date DEFAULT now(),
    date_completed date,
    requested_by uuid NOT NULL
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
    pin character varying(6)
);


--
-- Name: movie_request movie_request_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movie_request
    ADD CONSTRAINT movie_request_pkey PRIMARY KEY (id);


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
-- PostgreSQL database dump complete
--

\unrestrict WCnNubl3mvDUZflIKGIWzCmPxSUFsjJ3Xr0ehx1kZfhs6ubHFlomTE2a5aJS4gM


--
-- Dbmate schema migrations
--

INSERT INTO public.schema_migrations (version) VALUES
    ('20250928200447'),
    ('20250928210930'),
    ('20250928225044'),
    ('20250928233737'),
    ('20251003040223');
