const express = require("express");
const router = express.Router();
const knexConfig = require("../knexfile").development;
const knex = require("knex")(knexConfig);

// Function to generate a 6-digit code
const generateCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Create an event
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
    latitude,
    longitude,
  } = req.body;

  if (
    !title ||
    !location ||
    !date ||
    !time ||
    !numberOfPlayers ||
    !price ||
    !hostId ||
    !latitude ||
    !longitude
  ) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const inviteCode = generateCode();

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
        latitude,
        longitude,
        inviteCode,
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

// Valid invite code
router.post("/validate-invite-code", async (req, res) => {
  const { inviteCode } = req.body;

  if (!inviteCode) {
    return res.status(400).json({ message: "Invite code is required" });
  }

  try {
    const event = await knex("events").where({ inviteCode }).first();
    if (!event) {
      return res.status(404).json({ message: "Invalid invite code" });
    }

    res.status(200).json({ event });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error validating invite code" });
  }
});

// Join an event
router.post("/join-event", async (req, res) => {
  const { eventId, userId, paymentMethod } = req.body;

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

    const event = await knex("events").where({ id: eventId }).first();
    const participants = await knex("event_users").where({ eventId });

    // Count the number of participants in each team
    const teamOneCount = participants.filter(
      (p) => p.shirtColor === event.teamColors.teamOneColor
    ).length;
    const teamTwoCount = participants.filter(
      (p) => p.shirtColor === event.teamColors.teamTwoColor
    ).length;

    let shirtColor;
    if (teamOneCount < event.teamDistribution.teamOne) {
      shirtColor = event.teamColors.teamOneColor;
    } else if (teamTwoCount < event.teamDistribution.teamTwo) {
      shirtColor = event.teamColors.teamTwoColor;
    } else {
      return res.status(400).json({ message: "Teams are already full" });
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

// Get all info for specific event with participants list
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

// Get all events for specific user
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

// Get the host for specific event
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

// Update participant shirt color
router.post("/update-participant-color", async (req, res) => {
  const { eventId, participant1Id, participant2Id } = req.body;

  try {
    const participant1 = await knex("event_users")
      .where({ eventId, userId: participant1Id })
      .first();

    const participant2 = await knex("event_users")
      .where({ eventId, userId: participant2Id })
      .first();

    if (!participant1 || !participant2) {
      return res.status(404).json({ message: "Participant not found" });
    }

    const tempColor = participant1.shirtColor;
    await knex("event_users")
      .where({ eventId, userId: participant1Id })
      .update({ shirtColor: participant2.shirtColor });

    await knex("event_users")
      .where({ eventId, userId: participant2Id })
      .update({ shirtColor: tempColor });

    res.json({ message: "Participant colors updated successfully" });
  } catch (error) {
    console.error("Error updating participant colors:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete event (cancel plan)
router.put("/cancel-event/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const event = await knex("events").where({ id }).first();
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    await knex("events").where({ id }).update({ status: "cancelled" });

    res.status(200).json({ message: "Event cancelled successfully" });
  } catch (error) {
    console.error("Error cancelling event:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Leave event
router.post("/leave-event", async (req, res) => {
  const { eventId, userId } = req.body;

  if (!eventId || !userId) {
    return res
      .status(400)
      .json({ message: "Event ID and User ID are required" });
  }

  try {
    const participant = await knex("event_users")
      .where({ eventId, userId })
      .first();

    if (!participant) {
      return res
        .status(404)
        .json({ message: "User is not part of this event" });
    }

    await knex("event_users").where({ eventId, userId }).del();

    res.status(200).json({ message: "User has left the event successfully" });
  } catch (error) {
    console.error("Error leaving event:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
