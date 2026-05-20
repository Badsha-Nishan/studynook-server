const express = require("express");
const app = express();
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const { createRemoteJWKSet, jwtVerify } = require("jose");
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

const JWKS = createRemoteJWKSet(
  new URL(`${process.env.CLIENT_URL}/api/auth/jwks`)
);

const verifyToken = async (req, res, next) => {
  const authHeader = req?.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];

  console.log(token);

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

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

    app.get("/rooms/:id", async (req, res) => {
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
      console.log(updatedData);
      res.json(result);
    });

    app.delete("/rooms/:id", async (req, res) => {
      const { id } = req.params;
      const result = await roomCollection.deleteOne({ _id: new ObjectId(id) });

      res.json(result);
    });

    app.post("/rooms", async (req, res) => {
      const roomData = req.body;
      console.log(roomData);
      const result = await roomCollection.insertOne(roomData);

      res.json(result);
    });

    app.post("/bookings", verifyToken, async (req, res) => {
      const bookingData = req.body;
      const result = await bookingsCollection.insertOne(bookingData);

      res.json(result);
    });

    app.get("/bookings/:userId", async (req, res) => {
      const { userId } = req.params;

      const result = await bookingsCollection
        .find({ userId: userId })
        .toArray();

      res.json(result);
    });

    app.delete("/bookings/:bookingId", async (req, res) => {
      const { bookingId } = req.params;
      const result = await bookingsCollection.deleteOne({
        _id: new ObjectId(bookingId),
      });

      res.json(result);
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
