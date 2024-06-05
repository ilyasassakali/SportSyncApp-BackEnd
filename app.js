const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const app = express();
const cron = require("node-cron");
const port = process.env.PORT || 3000;
const knexConfig = require("./knexfile").development;
const knex = require("knex")(knexConfig);

const usersRouter = require("./routes/users");
const eventsRouter = require("./routes/events");
const paymentsRouter = require("./routes/payments");

app.use(cors());
app.use(bodyParser.json());

app.use("/users", usersRouter);
app.use("/events", eventsRouter);
app.use("/payments", paymentsRouter);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

// Function to delete automatically the 6-digit code after cancelled/past event
const updateEventCodes = async () => {
  try {
    const currentDate = new Date();
    const eventsToUpdate = await knex("events")
      .where("date", "<", currentDate)
      .orWhere("status", "cancelled");

    for (let event of eventsToUpdate) {
      await knex("events").where({ id: event.id }).update({ inviteCode: null });
      console.log(`Invite code cleared for event ID: ${event.id}`);
    }
  } catch (error) {
    console.error("Failed to update event codes:", error);
  }
};

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);

  cron.schedule("* * * * *", () => {
    updateEventCodes();
  });
});
