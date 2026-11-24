-- Builds the body of supabase/SCHEMA.md from the live database (read-only).
-- Run it with the Supabase execute_sql tool and paste the single "md" value under the header of SCHEMA.md.
-- Tables with identical columns (the question banks) are grouped into one line.
with cols as (
  select c.table_name,
         string_agg(c.column_name || ' ' ||
           case when c.data_type = 'USER-DEFINED' then c.udt_name
                when c.data_type = 'ARRAY' then trim(leading '_' from c.udt_name) || '[]'
                when c.data_type like 'timestamp%' then 'timestamptz'
                when c.data_type = 'character varying' then 'varchar'
                else c.data_type end ||
           case when c.is_nullable = 'NO' then '!' else '' end ||
           case when c.column_default is not null then '=' || left(regexp_replace(c.column_default, '::[a-z ]+', '', 'g'), 30) else '' end,
           ', ' order by c.ordinal_position) as sig
  from information_schema.columns c
  join information_schema.tables t using (table_schema, table_name)
  where c.table_schema = 'public' and t.table_type = 'BASE TABLE'
  group by c.table_name
),
grp as (select sig, string_agg(table_name, ', ' order by table_name) as tbls, count(*) n from cols group by sig),
pol as (
  select tablename,
         string_agg(policyname || ' [' || cmd || ' to ' || array_to_string(roles, ',') || ']' ||
                    coalesce(' using ' || qual, ''), '; ' order by policyname) as p
  from pg_policies where schemaname = 'public' group by tablename
),
-- The question banks all share one lock policy: group tables whose policies match once the table name is replaced.
polg as (
  select string_agg(tablename, ', ' order by tablename) as tablename, replace(p, tablename, '<table>') as p
  from pol group by replace(p, tablename, '<table>')
),
gr as (
  select table_name, string_agg(grantee || ':' || privs, ' ') as g from (
    select table_name, grantee, string_agg(left(privilege_type, 3), '/' order by privilege_type) privs
    from information_schema.role_table_grants
    where table_schema = 'public' and grantee in ('anon', 'authenticated')
    group by table_name, grantee) x group by table_name
),
fns as (
  select string_agg(p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' ||
                    case when p.prosecdef then ' SECDEF' else '' end, E'\n- ' order by p.proname) f
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.prokind = 'f'
)
select
  E'## Tables\nColumn notation: `name type`, `!` not null, `=default`. Tables with the same columns share a line.\n\n' ||
  (select string_agg('- **' || tbls || '**: ' || sig, E'\n' order by n desc, tbls) from grp) ||
  E'\n\n## Row-level security policies\n' ||
  (select string_agg('- **' || tablename || '**: ' || regexp_replace(p, '\s+', ' ', 'g'), E'\n' order by length(tablename) desc) from polg) ||
  E'\n\n## Grants to anon / authenticated\n`SEL`/`INS`/`UPD`/`DEL` (first three letters). Tables not listed have no grants.\n' ||
  coalesce((select string_agg('- ' || t || ': ' || g, E'\n') from (select g, string_agg(table_name, ', ' order by table_name) t from gr group by g) x), '(none)') ||
  E'\n\n## Functions (public)\n- ' || coalesce((select f from fns), '(none)') as md;
