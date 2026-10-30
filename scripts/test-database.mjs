import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";

// Embedded PostgreSQL verifies SQL/permissions locally. It does not emulate
// Supabase Auth, PostgREST or the Realtime server and cannot test concurrency.
const db = new PGlite({ extensions: { pgcrypto } });
try {
  await db.exec(`
    create role anon;
    create role authenticated;
    create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to authenticated,anon;
    grant execute on function auth.uid() to authenticated,anon;
    create publication supabase_realtime;
  `);
  for (const file of [
    "202610300001_lobby.sql",
    "202610300002_game_foundation.sql",
    "202610300003_roles_and_night.sql",
  ]) {
    await db.exec(
      await readFile(
        new URL(`../supabase/migrations/${file}`, import.meta.url),
        "utf8",
      ),
    );
    console.log(`Applied ${file}`);
  }
  await db.exec(
    await readFile(
      new URL("../supabase/tests/lobby_security.sql", import.meta.url),
      "utf8",
    ),
  );
  console.log(
    "Passed lobby security assertions (embedded PostgreSQL, stubbed auth.uid).",
  );
  await db.exec(
    await readFile(
      new URL("../supabase/tests/roles_and_night.sql", import.meta.url),
      "utf8",
    ),
  );
  console.log(
    "Passed role assignment, private knowledge and night-state assertions.",
  );
} catch (error) {
  console.error(`Database check failed: ${error.message}`);
  if (error.where) console.error(error.where);
  process.exitCode = 1;
} finally {
  await db.close();
}
