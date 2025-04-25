-- Enable les extensions nécessaires
create extension if not exists "uuid-ossp";

-- Création de la table des utilisateurs (profiles)
create table profiles (
    id uuid references auth.users on delete cascade not null primary key,
    email text unique not null,
    full_name text,
    avatar_url text,
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null
);

-- Création de la table des projets
create table projects (
    id uuid default uuid_generate_v4() primary key,
    name text not null,
    description text,
    status text default 'active' check (status in ('active', 'archived', 'completed')),
    owner_id uuid references profiles(id) on delete cascade not null,
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null
);

-- Création de la table des flux de travail
create table workflows (
    id uuid default uuid_generate_v4() primary key,
    name text not null,
    description text,
    project_id uuid references projects(id) on delete cascade not null,
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null
);

-- Création de la table des étapes de workflow
create table workflow_steps (
    id uuid default uuid_generate_v4() primary key,
    name text not null,
    description text,
    order_index integer not null,
    workflow_id uuid references workflows(id) on delete cascade not null,
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null
);

-- Création de la table des tâches
create table tasks (
    id uuid default uuid_generate_v4() primary key,
    title text not null,
    description text,
    status text default 'todo' check (status in ('todo', 'in_progress', 'completed')),
    priority text default 'medium' check (priority in ('low', 'medium', 'high')),
    due_date timestamptz,
    workflow_step_id uuid references workflow_steps(id) on delete cascade not null,
    assigned_to uuid references profiles(id) on delete set null,
    created_by uuid references profiles(id) on delete set null,
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null
);

-- Création de la table des commentaires
create table comments (
    id uuid default uuid_generate_v4() primary key,
    content text not null,
    task_id uuid references tasks(id) on delete cascade not null,
    user_id uuid references profiles(id) on delete cascade not null,
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null
);

-- Création de la table des membres du projet
create table project_members (
    project_id uuid references projects(id) on delete cascade not null,
    user_id uuid references profiles(id) on delete cascade not null,
    role text default 'member' check (role in ('owner', 'admin', 'member')),
    created_at timestamptz default now() not null,
    primary key (project_id, user_id)
);

-- Triggers pour updated_at
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create trigger update_profiles_updated_at
    before update on profiles
    for each row
    execute function update_updated_at_column();

create trigger update_projects_updated_at
    before update on projects
    for each row
    execute function update_updated_at_column();

create trigger update_workflows_updated_at
    before update on workflows
    for each row
    execute function update_updated_at_column();

create trigger update_workflow_steps_updated_at
    before update on workflow_steps
    for each row
    execute function update_updated_at_column();

create trigger update_tasks_updated_at
    before update on tasks
    for each row
    execute function update_updated_at_column();

-- Politiques de sécurité (RLS)
alter table profiles enable row level security;
alter table projects enable row level security;
alter table workflows enable row level security;
alter table workflow_steps enable row level security;
alter table tasks enable row level security;
alter table comments enable row level security;
alter table project_members enable row level security;

-- Politiques pour profiles
create policy "Les utilisateurs peuvent voir leur propre profil"
    on profiles for select
    using (auth.uid() = id);

create policy "Les utilisateurs peuvent mettre à jour leur propre profil"
    on profiles for update
    using (auth.uid() = id);

create policy "Les utilisateurs peuvent créer leur propre profil"
    on profiles for insert
    with check (auth.uid() = id);

-- Politiques pour projects
create policy "Les membres du projet peuvent voir les projets"
    on projects for select
    using (
        exists (
            select 1 from project_members
            where project_id = projects.id
            and user_id = auth.uid()
        )
    );

create policy "Seuls les propriétaires peuvent modifier les projets"
    on projects for update
    using (owner_id = auth.uid());

-- Politiques pour workflows
create policy "Les membres du projet peuvent voir les workflows"
    on workflows for select
    using (
        exists (
            select 1 from project_members
            where project_id = workflows.project_id
            and user_id = auth.uid()
        )
    );

-- Politiques pour tasks
create policy "Les membres du projet peuvent voir les tâches"
    on tasks for select
    using (
        exists (
            select 1 from project_members pm
            join workflows w on w.project_id = pm.project_id
            join workflow_steps ws on ws.workflow_id = w.id
            where ws.id = tasks.workflow_step_id
            and pm.user_id = auth.uid()
        )
    );

create policy "Les membres du projet peuvent créer des tâches"
    on tasks for insert
    with check (
        exists (
            select 1 from project_members pm
            join workflows w on w.project_id = pm.project_id
            join workflow_steps ws on ws.workflow_id = w.id
            where ws.id = workflow_step_id
            and pm.user_id = auth.uid()
        )
    );

-- Politiques pour comments
create policy "Les membres du projet peuvent voir les commentaires"
    on comments for select
    using (
        exists (
            select 1 from project_members pm
            join workflows w on w.project_id = pm.project_id
            join workflow_steps ws on ws.workflow_id = w.id
            join tasks t on t.workflow_step_id = ws.id
            where t.id = comments.task_id
            and pm.user_id = auth.uid()
        )
    );

-- Index pour améliorer les performances
create index idx_tasks_workflow_step on tasks(workflow_step_id);
create index idx_workflow_steps_workflow on workflow_steps(workflow_id);
create index idx_workflows_project on workflows(project_id);
create index idx_comments_task on comments(task_id);
create index idx_project_members_project on project_members(project_id);
create index idx_project_members_user on project_members(user_id); 