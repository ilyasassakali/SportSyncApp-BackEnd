const express = require("express");
const router = express.Router();
const knexConfig = require("../knexfile").development;
const knex = require("knex")(knexConfig);
const stripe = require("stripe")(process.env.STRIPEKEY);

// Create payment sheet
router.post("/payment-sheet", async (req, res) => {
  const { eventId, userId, hostId } = req.body;
  try {
    const event = await knex("events").where({ id: eventId }).first();
    const user = await knex("users").where({ id: userId }).first();
    const host = await knex("users").where({ id: hostId }).first();

    if (!event || !user || !host) {
      return res.status(404).send({ error: "Event or user not found" });
    }

    let customer = await stripe.customers.create({
      email: user.email,
      metadata: {
        userId: userId.toString(),
        hostId: hostId.toString(),
        eventId: eventId.toString(),
      },
    });

    const paymentIntent = await stripe.paymentIntents.create({
      amount: parseInt(event.price * 100),
      currency: "eur",
      customer: customer.id,
      payment_method_types: ["card"],
      metadata: {
        userId: userId.toString(),
        userEmail: user.email,
        hostId: hostId.toString(),
        hostEmail: host.email,
        eventId: eventId.toString(),
        eventName: event.title,
      },
    });

    res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      customerId: customer.id,
      message: "Payment intent created successfully",
    });
  } catch (error) {
    console.error("Error in /payment-sheet endpoint:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
