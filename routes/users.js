const express = require("express");
const router = express.Router();
const knexConfig = require("../knexfile").development;
const knex = require("knex")(knexConfig);
const bcrypt = require("bcrypt");

router.post("/create-account", async (req, res) => {
  const { firstName, lastName, email, password } = req.body;

  if (!firstName || !lastName || !email || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const result = await knex("users")
      .insert({
        firstName,
        lastName,
        email,
        password: hashedPassword,
      })
      .returning("*");

    if (result.length > 0) {
      res
        .status(201)
        .json({ message: "User created successfully", user: result[0] });
    } else {
      res.status(500).json({ message: "Failed to create user" });
    }
  } catch (error) {
    console.error(error);
    if (error.code === "23505") {
      return res.status(409).json({ message: "Email already exists" });
    }
    res.status(500).json({ message: "Error creating user" });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    const user = await knex("users").where({ email }).first();

    if (user) {
      const validPassword = await bcrypt.compare(password, user.password);
      if (validPassword) {
        res.status(200).json({ message: "Logged in successfully", user });
      } else {
        res.status(401).json({ message: "Invalid password or user" });
      }
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error logging in" });
  }
});

router.put("/edit-profile", async (req, res) => {
  const { id, firstName, lastName, email } = req.body;

  if (!id || !firstName || !lastName || !email) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const emailExists = await knex("users")
      .where("email", email)
      .whereNot("id", id)
      .first();
    if (emailExists) {
      return res.status(409).json({ message: "Email already exists" });
    }

    await knex("users").where({ id }).update({ firstName, lastName, email });

    res.status(200).json({ message: "Profile updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error updating profile" });
  }
});

// Save push token
router.post("/save-push-token", async (req, res) => {
  const { userId, pushToken } = req.body;

  if (!userId || !pushToken) {
    return res
      .status(400)
      .json({ message: "User ID and push token are required" });
  }

  try {
    await knex("users").where({ id: userId }).update({ pushToken });
    res.status(200).json({ message: "Push token saved successfully" });
  } catch (error) {
    console.error("Error saving push token:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
