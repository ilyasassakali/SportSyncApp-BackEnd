const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 3000;

const usersRouter = require("./routes/users");
const eventsRouter = require("./routes/events");

app.use(cors());
app.use(bodyParser.json());

app.use("/users", usersRouter);
app.use("/events", eventsRouter);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
