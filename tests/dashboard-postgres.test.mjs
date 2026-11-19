import assert from "node:assert/strict";
import test from "node:test";
import { Prisma, PrismaClient } from "@prisma/client";
import { loadPriorities, pageNameSignals } from "../app/admin/priority-query.ts";

// Las CTE sustituyen ambas tablas por valores en la consulta, sin crear registros.
const localPostgres = process.env.SALIMO_TEST_LOCAL_POSTGRES === "1";
test("PostgreSQL selecciona duplicados, pagina y distingue los grupos de calidad", {
  skip: !localPostgres && !process.env.SALIMO_TEST_BRANCH_ID,
}, async () => {
  if (localPostgres) {
    const url = new URL(process.env.DATABASE_URL);
    assert.ok(["localhost", "127.0.0.1"].includes(url.hostname));
    assert.equal(url.pathname, "/salimo_test");
  }
  const db = new PrismaClient();
  try {
    if (localPostgres) {
      const [database] = await db.$queryRaw`SELECT current_database() AS name`;
      assert.equal(database.name, "salimo_test");
    } else {
      const [branch] = await db.$queryRaw`SELECT current_setting('neon.branch_id') AS id`;
      assert.equal(branch.id, process.env.SALIMO_TEST_BRANCH_ID);
    }
    const clean = { id: "a", originalName: "Norte", normalizedName: "Norte", category: "Bar",
      city: "Yerba Buena", isActive: true, address: "Salta 123", location: "", latitude: -26.8, longitude: -65.2,
      description: "Patio", reviewStatus: "REVIEWED" };
    const venues = [clean, ...Array.from({ length: 6 }, (_, i) => ({ ...clean, id: "p" + i,
      originalName: "Bar " + i, normalizedName: "Bar " + i, reviewStatus: "PENDING" })),
      { ...clean, id: "b", originalName: "NÓRTE", normalizedName: "Norte!" },
      { ...clean, id: "c", originalName: "Un nombre", normalizedName: "Otro nombre", city: null },
      { ...clean, id: "d", originalName: "Solo", normalizedName: "Solo", longitude: null, address: "Lamadrid" }];
    const fixture = {
      $queryRaw(strings, ...values) {
        return db.$queryRaw`WITH "Venue" AS (
          SELECT * FROM jsonb_to_recordset(${JSON.stringify(venues)}::jsonb) AS v(id text, "originalName" text,
            "normalizedName" text, category text, city text, "isActive" boolean, address text, location text,
            latitude float8, longitude float8, description text, "reviewStatus" text)),
          "VenueImage" AS (SELECT id AS "venueId" FROM "Venue") SELECT * FROM (${Prisma.sql(strings, ...values)}) q`;
      },
    };
    const signals = await pageNameSignals(fixture, ["b", "c", "d"]);
    assert.equal(signals.size, 3);
    assert.equal(signals.get("b").sharedName, "NÓRTE");
    assert.equal(signals.get("b").differentNames, false);
    assert.equal(signals.get("c").differentNames, true);
    assert.equal(signals.get("d").sharedName, null);
    assert.equal((await pageNameSignals(fixture, [])).size, 0);
    const possible = await loadPriorities(fixture, { calidad: "possible" });
    assert.equal(possible.total, 3);
    assert.equal(possible.rows.find(r => r.id === "b").possible.length, 1);
    assert.match(possible.rows.find(r => r.id === "c").possible[0], /Comprobar nombre original/);
    assert.deepEqual((await loadPriorities(fixture, { calidad: "required" })).rows.map(r => r.id), ["c"]);
    assert.deepEqual((await loadPriorities(fixture, { calidad: "suggested" })).rows.map(r => r.id), ["d"]);
    const first = await loadPriorities(fixture, { calidad: "desconocida" });
    const last = await loadPriorities(fixture, { pagina: "999999999" });
    assert.equal(first.rows.length, 5);
    assert.equal(last.page, 2);
    assert.equal(new Set([...first.rows, ...last.rows].map(r => r.id)).size, 10);
    venues.splice(0);
    const empty = await loadPriorities(fixture, {});
    assert.deepEqual(empty, { rows: [], total: 0, page: 1, pages: 1, group: "todos" });
  } finally {
    await db.$disconnect();
  }
});
