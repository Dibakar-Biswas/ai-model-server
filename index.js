const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
require("dotenv").config()
const serviceAccount = require("./aiServiceKey.json");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = 4000;
app.use(cors());
app.use(express.json());

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const uri =
  `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@first-backend.5ob3yor.mongodb.net/?appName=first-backend`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const verifyToken = async (req, res, next) => {
  const authorization = req.headers.authorization;

  if (!authorization) {
    return res
      .status(401)
      .send({ message: "unauthorized access. Token is unavailable..." });
  }

  const token = authorization.split(" ")[1];

  try {
    await admin.auth().verifyIdToken(token);
    next();
  } catch (error) {
    res.status(401).send({ message: "unauthorized access" });
  }
};

async function run() {
  try {
    // await client.connect();

    const db = client.db("ai-db");
    const modelCollection = db.collection("models");
    const purchaseCollection = db.collection("purchases");

    app.get("/models", async (req, res) => {
      const result = await modelCollection.find().toArray();
      res.send(result);
    });

    app.post("/models", verifyToken, async (req, res) => {
      const data = req.body;

      const result = await modelCollection.insertOne(data);
      res.send({ success: true, result });
    });

    app.get("/models/:id", verifyToken, async (req, res) => {
      const { id } = req.params;

      const result = await modelCollection.findOne({ _id: new ObjectId(id) });
      res.send({ success: true, result });
    });

    app.put("/models/:id", async (req, res) => {
      const { id } = req.params;
      const data = req.body;
      const objectId = new ObjectId(id);
      const filter = { _id: objectId };
      const update = {
        $set: data,
      };
      const result = await modelCollection.updateOne(filter, update);

      res.send({ success: true, result });
    });

    app.delete("/models/:id", async (req, res) => {
      const { id } = req.params;
      const result = await modelCollection.deleteOne({ _id: new ObjectId(id) });

      res.send({ success: true, result });
    });

    app.get("/latest-models", async (req, res) => {
      const result = await modelCollection
        .find()
        .sort({ createdAt: "desc" })
        .limit(6)
        .toArray();

      console.log(result);
      res.send(result);
    });

    app.get("/my-models", async (req, res) => {
      const email = req.query.email;
      const result = await modelCollection.find({ createdBy: email }).toArray();
      res.send(result);
    });

    app.post("/purchases/:id", async(req, res) => {
        const data = req.body
        const id = req.params.id
        const result = await purchaseCollection.insertOne(data)

        const filter = {_id: new ObjectId(id)}
        const update = {
            $inc: {
                purchased: 1
            }
        }
        const purchaseCount = await modelCollection.updateOne(filter, update)
        res.send({result, purchaseCount})
    })

    app.get("/my-purchase", async (req, res) => {
      const email = req.query.email;
      const result = await purchaseCollection.find({ purchased_by: email }).toArray();
      res.send(result);
    });


    app.get('/search', async(req, res) => {
        const search_title = req.query.search
        const result = await modelCollection.find({name: {$regex :search_title, $options: 'i'}}).toArray()
        res.send(result)
    })

    app.get('/filter', async(req, res) => {
        const frameworks = req.query.framework;
        let query = {}
        if(frameworks){
            const frameworkArray = frameworks.split(',')
            query.framework = { $in: frameworkArray}
        }
        const result = await modelCollection.find(query).toArray()
        res.send(result)
    })


    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Server is running good");
});

app.listen(port, () => {
  console.log(`Server is running awesome on port ${port}`);
});
