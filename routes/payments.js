const express = require("express");
const router = express.Router();
const knexConfig = require("../knexfile").development;
const knex = require("knex")(knexConfig);
const stripe = require("stripe")(process.env.STRIPEKEY);

// Create payment sheet
router.post("/payment-sheet", async (req, res) => {
  const { eventId } = req.body;
  try {
    const event = await knex("events").where({ id: eventId }).first();
    if (!event) {
      return res.status(404).send({ error: "Event not found" });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: parseInt(event.price * 100),
      currency: "eur",
      payment_method_types: ["card"],
    });

    res.send({
      paymentIntent: paymentIntent.client_secret,
      customer: "customer_id",
    });
  } catch (error) {
    console.error("Error in /payment-sheet endpoint:", error);
    res.status(500).send({ error: error.message });
  }
});

module.exports = router;
