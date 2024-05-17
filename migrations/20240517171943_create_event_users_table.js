exports.up = function (knex) {
  return knex.schema.createTable("event_users", (table) => {
    table.increments("id").primary();
    table.integer("eventId").unsigned().notNullable();
    table.integer("userId").unsigned().notNullable();
    table.boolean("paid").defaultTo(false);
    table.string("paymentMethod");
    table.string("shirtColor");

    table
      .foreign("eventId")
      .references("id")
      .inTable("events")
      .onDelete("CASCADE");
    table
      .foreign("userId")
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");

    table.unique(["eventId", "userId"]);
    table.timestamps(true, true);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable("event_users");
};
