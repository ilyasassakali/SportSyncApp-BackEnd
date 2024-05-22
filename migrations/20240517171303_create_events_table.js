exports.up = function (knex) {
  return knex.schema.createTable("events", (table) => {
    table.increments("id").primary();
    table.string("title").notNullable();
    table.string("location").notNullable();
    table.decimal("latitude", 10, 7).notNullable();
    table.decimal("longitude", 10, 7).notNullable();
    table.date("date").notNullable();
    table.string("time").notNullable();
    table.integer("numberOfPlayers").notNullable();
    table.boolean("isTeamDistributionEnabled").defaultTo(false);
    table.json("teamDistribution");
    table.json("teamColors");
    table.decimal("price").notNullable();
    table.string("inviteCode").unique();
    table.integer("hostId").unsigned().notNullable();
    table
      .foreign("hostId")
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");
    table.timestamps(true, true);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable("events");
};
