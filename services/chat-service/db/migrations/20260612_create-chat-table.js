export async function up(knex) {
  await knex.schema.createTable("conversations", (table) => {
    table.uuid("id").primary();
    table.string("type").notNullable().defaultTo("direct");
    table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at").notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable("conversation_members", (table) => {
    table.uuid("conversation_id").notNullable();
    table.uuid("student_id").notNullable();
    table.timestamp("joined_at").notNullable().defaultTo(knex.fn.now());
    table.primary(["conversation_id", "student_id"]);
    table.foreign("conversation_id").references("id").inTable("conversations").onDelete("CASCADE");
    table.index(["student_id"]);
  });

  await knex.schema.createTable("messages", (table) => {
    table.uuid("id").primary();
    table.uuid("conversation_id").notNullable();
    table.uuid("sender_id").notNullable();
    table.text("content").notNullable();
    table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
    table.foreign("conversation_id").references("id").inTable("conversations").onDelete("CASCADE");
    table.index(["conversation_id", "created_at"]);
    table.index(["sender_id"]);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("messages");
  await knex.schema.dropTableIfExists("conversation_members");
  await knex.schema.dropTableIfExists("conversations");
}
