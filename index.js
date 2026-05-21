const express = require("express");
const app = express();
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const { createRemoteJWKSet, jwtVerify } = require("jose-cjs");
// const { createRemoteJWKSet, jwtVerify } = require("jose");
const PORT = process.env.PORT;

app.use(cors());
app.use(express.json());
const uri = process.env.MONGODB_URI;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const JWKS = createRemoteJWKSet(new URL("http://localhost:3000/api/auth/jwks"));

const verifyToken = async (req, res, next) => {
  const authHeader = req?.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  // console.log(token);

  try {
    const { payload } = await jwtVerify(token, JWKS);
    console.log(payload);
    next();
  } catch (error) {
    console.log(error);

    return res.status(403).json({
      message: "Forbidden",
    });
  }
};

async function run() {
  try {
    // await client.connect();

    const db = client.db("studynook");
    const roomCollection = db.collection("rooms");

    const bookingsCollection = db.collection("bookings");

    app.get("/add-room", async (req, res) => {
      const result = await roomCollection.find().toArray();
      res.json(result);
    });

    app.get("/rooms/:id", verifyToken, async (req, res) => {
      const { id } = req.params;
      const result = await roomCollection.findOne({
        _id: new ObjectId(id),
      });
      res.json(result);
    });

    app.patch("/rooms/:id", async (req, res) => {
      const { id } = req.params;
      const updatedData = req.body;
      const result = await roomCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updatedData }
      );
      // console.log(updatedData);
      res.json(result);
    });

    app.delete("/rooms/:id", verifyToken, async (req, res) => {
      const { id } = req.params;
      const result = await roomCollection.deleteOne({ _id: new ObjectId(id) });

      res.json(result);
    });

    app.post("/rooms", verifyToken, async (req, res) => {
      const roomData = req.body;
      // console.log(roomData);

      const result = await roomCollection.insertOne(roomData);

      res.json(result);
    });

    app.post("/my-bookings", async (req, res) => {
      const bookingData = req.body;
      const { roomId, date, startTime, endTime } = bookingData;

      try {
        const conflict = await bookingsCollection.findOne({
          roomId: roomId,
          date: date,
          status: "confirmed",
          startTime: { $lt: endTime },
          endTime: { $gt: startTime },
        });
        if (conflict) {
          return res.status(400).json({
            success: false,
            message: "This room is already booked for the selected time slot.",
          });
        }
        const result = await bookingsCollection.insertOne({
          ...bookingData,
          status: "confirmed",
        });

        res.status(201).json({ success: true, ...result });
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    });

    app.get("/my-bookings/:userId", async (req, res) => {
      const { userId } = req.params;

      const result = await bookingsCollection
        .find({ userId: userId })
        .toArray();

      res.json(result);
    });

    app.delete("/my-bookings/:id", verifyToken, async (req, res) => {
      const id = req.params.id;

      const query = { _id: new ObjectId(id) };

      const result = await bookingsCollection.deleteOne(query);

      res.send(result);
    });

    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Server is running fine!");
});

app.listen(PORT, () => {
  console.log(`Sever is running on ${PORT}`);
});
