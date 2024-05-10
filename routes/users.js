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

    await knex("users").insert({
      firstName,
      lastName,
      email,
      password: hashedPassword,
    });

    res.status(201).json({ message: "User created successfully" });
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

module.exports = router;
