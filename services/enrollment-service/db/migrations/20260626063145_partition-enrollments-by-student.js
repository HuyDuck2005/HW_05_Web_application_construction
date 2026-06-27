/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  await knex.schema.renameTable("enrollments", "enrollments_old");

  await knex.raw(`
    CREATE TABLE enrollments (
      id UUID NOT NULL,
      student_id UUID NOT NULL,
      course_id UUID NOT NULL,
      status VARCHAR(30) NOT NULL DEFAULT 'CONFIRMED',
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id, student_id),
      UNIQUE (student_id, course_id)
    ) PARTITION BY HASH (student_id);
  `);

  await knex.raw(`
    CREATE TABLE enrollments_p0 PARTITION OF enrollments FOR VALUES WITH (modulus 3, remainder 0);
    CREATE TABLE enrollments_p1 PARTITION OF enrollments FOR VALUES WITH (modulus 3, remainder 1);
    CREATE TABLE enrollments_p2 PARTITION OF enrollments FOR VALUES WITH (modulus 3, remainder 2);
  `);

  await knex.raw(`
    INSERT INTO enrollments (id, student_id, course_id, status, created_at, updated_at)
    SELECT id, student_id, course_id, status, created_at, updated_at
    FROM enrollments_old;
  `);

  await knex.raw(`
    CREATE INDEX ON enrollments (course_id);
    CREATE INDEX ON enrollments (status);
    CREATE INDEX ON enrollments (created_at);
  `);

  await knex.schema.dropTable("enrollments_old");
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  await knex.schema.renameTable("enrollments", "enrollments_partitioned");

  await knex.schema.createTable("enrollments", function (table) {
    table.uuid("id").primary();
    table.uuid("student_id").notNullable();
    table.uuid("course_id").notNullable();
    table.string("status", 30).notNullable().defaultTo("CONFIRMED");
    table.timestamps(true, true);
    table.unique(["student_id", "course_id"]);
    table.index(["student_id"]);
    table.index(["course_id"]);
    table.index(["status"]);
    table.index(["created_at"]);
  });

  await knex.raw(`
    INSERT INTO enrollments (id, student_id, course_id, status, created_at, updated_at)
    SELECT id, student_id, course_id, status, created_at, updated_at
    FROM enrollments_partitioned;
  `);

  await knex.raw("DROP TABLE enrollments_partitioned CASCADE;");
}
