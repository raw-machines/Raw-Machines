create table if not exists users (
  id serial primary key,
  email text unique not null,
  name text not null,
  password_hash text not null,
  role text not null default 'user' check (role in ('user','developer')),
  created_at timestamptz default now()
);
create table if not exists apps (
  id serial primary key,
  developer_id int not null references users(id) on delete cascade,
  name text not null,
  short_desc text not null,
  description text not null default '',
  category text not null default 'Other',
  icon_url text,
  downloads int not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create table if not exists versions (
  id serial primary key,
  app_id int not null references apps(id) on delete cascade,
  version_name text not null,
  version_code int not null,
  changelog text not null default '',
  file_url text not null,
  file_size bigint not null default 0,
  created_at timestamptz default now(),
  unique (app_id, version_code)
);
create table if not exists installs (
  id serial primary key,
  user_id int not null references users(id) on delete cascade,
  app_id int not null references apps(id) on delete cascade,
  version_id int not null references versions(id) on delete cascade,
  installed_at timestamptz default now(),
  unique (user_id, app_id)
);
create index if not exists apps_category_idx on apps(category);
