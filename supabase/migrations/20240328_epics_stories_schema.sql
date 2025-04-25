-- Migration pour ajouter les tables epics et stories

-- Création de la table des EPICs
create table epics (
    id uuid default uuid_generate_v4() primary key,
    title text not null,
    objective text,
    problem_addressed text,
    business_value text,
    project_id uuid references projects(id) on delete cascade not null,
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null
);

-- Création de la table des User Stories
create table stories (
    id uuid default uuid_generate_v4() primary key,
    title text not null,
    story_description text,
    epic_id uuid references epics(id) on delete cascade not null,
    status text default 'todo' check (status in ('todo', 'in_progress', 'done')),
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null
);

-- Création de la table pour les critères d'acceptation
create table acceptance_criteria (
    id uuid default uuid_generate_v4() primary key,
    given_condition text,
    when_action text,
    then_result text,
    story_id uuid references stories(id) on delete cascade not null,
    created_at timestamptz default now() not null
);

-- Ajout d'informations supplémentaires pour les user stories
create table story_metadata (
    story_id uuid references stories(id) on delete cascade primary key,
    kpis text,
    design_link text,
    updated_at timestamptz default now() not null
);

-- Triggers pour updated_at
create trigger update_epics_updated_at
    before update on epics
    for each row
    execute function update_updated_at_column();

create trigger update_stories_updated_at
    before update on stories
    for each row
    execute function update_updated_at_column();

create trigger update_story_metadata_updated_at
    before update on story_metadata
    for each row
    execute function update_updated_at_column();

-- Politiques RLS (Row Level Security)
alter table epics enable row level security;
alter table stories enable row level security;
alter table acceptance_criteria enable row level security;
alter table story_metadata enable row level security;

-- Politique pour les EPICs
create policy "Accès aux EPICs des projets personnels"
    on epics for all
    using (
        exists (
            select 1 from projects
            where id = epics.project_id
            and owner_id = auth.uid()
        )
    );

-- Politique pour les User Stories
create policy "Accès aux stories des projets personnels"
    on stories for all
    using (
        exists (
            select 1 from epics e
            join projects p on p.id = e.project_id
            where stories.epic_id = e.id
            and p.owner_id = auth.uid()
        )
    );

-- Politique pour les Critères d'acceptation
create policy "Accès aux critères des stories des projets personnels"
    on acceptance_criteria for all
    using (
        exists (
            select 1 from stories s
            join epics e on e.id = s.epic_id
            join projects p on p.id = e.project_id
            where acceptance_criteria.story_id = s.id
            and p.owner_id = auth.uid()
        )
    );

-- Politique pour les métadonnées des stories
create policy "Accès aux métadonnées des stories des projets personnels"
    on story_metadata for all
    using (
        exists (
            select 1 from stories s
            join epics e on e.id = s.epic_id
            join projects p on p.id = e.project_id
            where story_metadata.story_id = s.id
            and p.owner_id = auth.uid()
        )
    ); 