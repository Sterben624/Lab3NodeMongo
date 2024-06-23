const express = require("express");
const { MongoClient, ObjectID } = require("mongodb");
const path = require("path");

const app = express();
const jsonParser = express.json();

const url = "mongodb://localhost:27017/";
const dbName = "usersdb";
const collectionName = "users";

async function startServer() {
    const client = new MongoClient(url);

    try {
        await client.connect();
        console.log("Connected to MongoDB");

        const db = client.db(dbName);
        const collection = db.collection(collectionName);
        app.locals.collection = collection;

        // Налаштовуємо Express на обробку статичних файлів із кореневої папки проекту
        app.use(express.static(__dirname));

        // Встановлюємо обробник для кореневого маршруту, який віддаватиме вашу основну сторінку
        app.get("/", (req, res) => {
            res.sendFile(path.join(__dirname, "public.html"));
        });

        app.listen(3000, () => {
            console.log("Server is listening on port 3000");
        });
    } catch (err) {
        console.error("Error connecting to MongoDB", err);
    }
}

startServer();

// Інші обробники маршрутів залишаються незмінними
app.get("/api/users", async (req, res) => {
    try {
        const collection = req.app.locals.collection;
        const users = await collection.find({}).toArray();
        res.send(users);
    } catch (err) {
        console.error("Error fetching users", err);
        res.status(500).send("Error fetching users");
    }
});

app.get("/api/users/:id", async (req, res) => {
    try {
        const id = new ObjectID(req.params.id);
        const collection = req.app.locals.collection;
        const user = await collection.findOne({ _id: id });
        if (!user) {
            return res.status(404).send("User not found");
        }
        res.send(user);
    } catch (err) {
        console.error("Error fetching user by ID", err);
        res.status(500).send("Error fetching user by ID");
    }
});

app.post("/api/users", jsonParser, async (req, res) => {
    try {
        const { name, age } = req.body;
        const user = { name, age };

        const collection = req.app.locals.collection;
        const result = await collection.insertOne(user);
        
        res.send(result.ops[0]);
    } catch (err) {
        console.error("Error inserting user", err);
        res.status(500).send("Error inserting user");
    }
});

app.delete("/api/users/:id", async (req, res) => {
    try {
        const id = new ObjectID(req.params.id);
        const collection = req.app.locals.collection;
        const result = await collection.findOneAndDelete({ _id: id });
        
        if (!result.value) {
            return res.status(404).send("User not found");
        }
        res.send(result.value);
    } catch (err) {
        console.error("Error deleting user", err);
        res.status(500).send("Error deleting user");
    }
});

app.put("/api/users", jsonParser, async (req, res) => {
    try {
        const { id, name, age } = req.body;
        const objectId = new ObjectID(id);

        const collection = req.app.locals.collection;
        const result = await collection.findOneAndUpdate(
            { _id: objectId },
            { $set: { name, age } },
            { returnOriginal: false }
        );

        if (!result.value) {
            return res.status(404).send("User not found");
        }
        res.send(result.value);
    } catch (err) {
        console.error("Error updating user", err);
        res.status(500).send("Error updating user");
    }
});

// Обробка виходу з програми для закриття з'єднання з MongoDB
process.on("SIGINT", async () => {
    try {
        await client.close();
        console.log("Disconnected from MongoDB");
        process.exit(0);
    } catch (err) {
        console.error("Error closing MongoDB connection", err);
        process.exit(1);
    }
});
