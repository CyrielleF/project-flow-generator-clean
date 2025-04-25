-- Enable les extensions nécessaires
create extension if not exists "uuid-ossp";

-- Supprimer toutes les tables avec CASCADE pour repartir de zéro
drop table if exists public.comments cascade;
drop table if exists public.tasks cascade;
drop table if exists public.workflow_steps cascade;
drop table if exists public.workflows cascade;
drop table if exists public.project_members cascade;
drop table if exists public.projects cascade;
drop table if exists public.profiles cascade;

-- Créer les tables de base
create table public.profiles (
    id uuid primary key,
    email text unique not null,
    full_name text,
    avatar_url text,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    constraint fk_user
        foreign key (id)
        references auth.users(id)
        on delete cascade
);

create table public.projects (
    id uuid primary key default uuid_generate_v4(),
    name text not null,
    description text,
    status text default 'active',
    owner_id uuid not null,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    constraint fk_owner
        foreign key (owner_id)
        references auth.users(id)
        on delete cascade,
    constraint check_status
        check (status in ('active', 'archived', 'completed'))
);

create table public.workflows (
    id uuid primary key default uuid_generate_v4(),
    name text not null,
    description text,
    project_id uuid not null,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    constraint fk_project
        foreign key (project_id)
        references public.projects(id)
        on delete cascade
);

create table public.workflow_steps (
    id uuid primary key default uuid_generate_v4(),
    name text not null,
    description text,
    order_index integer not null,
    workflow_id uuid not null,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    constraint fk_workflow
        foreign key (workflow_id)
        references public.workflows(id)
        on delete cascade
);

create table public.tasks (
    id uuid primary key default uuid_generate_v4(),
    title text not null,
    description text,
    status text default 'todo',
    workflow_step_id uuid not null,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    constraint fk_workflow_step
        foreign key (workflow_step_id)
        references public.workflow_steps(id)
        on delete cascade,
    constraint check_status
        check (status in ('todo', 'in_progress', 'completed'))
);

-- Activer RLS sur toutes les tables
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.workflows enable row level security;
alter table public.workflow_steps enable row level security;
alter table public.tasks enable row level security;

-- Supprimer les anciennes politiques si elles existent
drop policy if exists "Les utilisateurs peuvent voir leur propre profil" on public.profiles;
drop policy if exists "Les utilisateurs peuvent mettre à jour leur propre profil" on public.profiles;
drop policy if exists "Les utilisateurs peuvent créer leur propre profil" on public.profiles;
drop policy if exists "Les utilisateurs peuvent voir leurs projets" on public.projects;
drop policy if exists "Les utilisateurs peuvent créer des projets" on public.projects;
drop policy if exists "Les propriétaires peuvent modifier leurs projets" on public.projects;
drop policy if exists "Les propriétaires peuvent supprimer leurs projets" on public.projects;
drop policy if exists "Les utilisateurs peuvent voir les workflows" on public.workflows;
drop policy if exists "Les utilisateurs peuvent créer des workflows" on public.workflows;
drop policy if exists "Les utilisateurs peuvent voir les étapes" on public.workflow_steps;
drop policy if exists "Les utilisateurs peuvent créer des étapes" on public.workflow_steps;
drop policy if exists "Les utilisateurs peuvent voir les tâches" on public.tasks;
drop policy if exists "Les utilisateurs peuvent créer des tâches" on public.tasks;

-- Créer les nouvelles politiques
create policy "Accès au profil personnel"
    on public.profiles for all
    using (auth.uid() = id);

create policy "Accès aux projets personnels"
    on public.projects for all
    using (auth.uid() = owner_id);

create policy "Accès aux workflows des projets personnels"
    on public.workflows for all
    using (
        exists (
            select 1 from public.projects
            where id = project_id
            and owner_id = auth.uid()
        )
    );

create policy "Accès aux étapes des projets personnels"
    on public.workflow_steps for all
    using (
        exists (
            select 1 from public.workflows w
            join public.projects p on p.id = w.project_id
            where workflow_steps.workflow_id = w.id
            and p.owner_id = auth.uid()
        )
    );

create policy "Accès aux tâches des projets personnels"
    on public.tasks for all
    using (
        exists (
            select 1 from public.workflow_steps ws
            join public.workflows w on w.id = ws.workflow_id
            join public.projects p on p.id = w.project_id
            where tasks.workflow_step_id = ws.id
            and p.owner_id = auth.uid()
        )
    );

-- Supprimer l'ancien trigger et fonction s'ils existent
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

-- Créer le trigger pour la création automatique de profil
create function public.handle_new_user()
returns trigger
security definer
set search_path = public
language plpgsql
as $$
begin
    insert into public.profiles (id, email)
    values (new.id, new.email);
    return new;
end;
$$;

create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

-- Créer les profils manquants pour les utilisateurs existants
insert into public.profiles (id, email)
select id, email
from auth.users
where id not in (select id from public.profiles); 