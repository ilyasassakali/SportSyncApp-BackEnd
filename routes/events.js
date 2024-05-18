const express = require("express");
const router = express.Router();
const knexConfig = require("../knexfile").development;
const knex = require("knex")(knexConfig);

router.post("/create-event", async (req, res) => {
  const {
    title,
    location,
    date,
    time,
    numberOfPlayers,
    isTeamDistributionEnabled,
    teamDistribution,
    teamColors,
    price,
    hostId,
  } = req.body;

  if (
    !title ||
    !location ||
    !date ||
    !time ||
    !numberOfPlayers ||
    !price ||
    !hostId
  ) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const event = await knex("events")
      .insert({
        title,
        location,
        date,
        time,
        numberOfPlayers,
        isTeamDistributionEnabled,
        teamDistribution,
        teamColors,
        price,
        hostId,
      })
      .returning("*");

    await knex("event_users").insert({
      eventId: event[0].id,
      userId: hostId,
      paid: true,
      paymentMethod: "direct",
      shirtColor: teamColors ? teamColors.teamOneColor : null,
    });

    res
      .status(201)
      .json({ message: "Event created successfully", event: event[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error creating event" });
  }
});

router.post("/join-event", async (req, res) => {
  const { eventId, userId, paymentMethod, shirtColor } = req.body;

  if (!eventId || !userId || !paymentMethod) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const existingParticipant = await knex("event_users")
      .where({ eventId, userId })
      .first();
    if (existingParticipant) {
      return res
        .status(409)
        .json({ message: "User already joined this event" });
    }

    const participant = await knex("event_users")
      .insert({
        eventId,
        userId,
        paid: paymentMethod === "direct",
        paymentMethod,
        shirtColor,
      })
      .returning("*");

    res.status(201).json({
      message: "Joined event successfully",
      participant: participant[0],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error joining event" });
  }
});

router.get("/event/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const event = await knex("events").where({ id }).first();
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const participants = await knex("event_users")
      .where({ eventId: id })
      .join("users", "event_users.userId", "users.id")
      .select(
        "users.id",
        "users.firstName",
        "users.lastName",
        "event_users.paid",
        "event_users.paymentMethod",
        "event_users.shirtColor"
      );

    res.status(200).json({ event, participants });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error retrieving event details" });
  }
});

router.get("/user-events/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    const events = await knex("events")
      .join("event_users", "events.id", "event_users.eventId")
      .where("event_users.userId", userId)
      .select("events.*");

    res.status(200).json(events);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error retrieving user's events" });
  }
});

router.get("/user/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const user = await knex("users").where({ id }).first();
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Error fetching user details", error });
  }
});

module.exports = router;
