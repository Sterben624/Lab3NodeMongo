const express = require("express");
const { MongoClient} = require("mongodb");
const { ObjectId } = require('mongodb');
const path = require("path");

const app = express();
const jsonParser = express.json();

const url = "mongodb://localhost:27017/";
const dbName = "usersdb";
const collectionName = "users";

let client;

async function startServer() {
    client = new MongoClient(url);

    try {
        await client.connect();
        console.log("Connected to MongoDB");

        const db = client.db(dbName);
        const collection = db.collection(collectionName);
        app.locals.collection = collection;

        app.use(express.static(path.join(__dirname, "public")));

        app.get("/", (req, res) => {
            res.sendFile(path.join(__dirname, "public.html"));
        });

        app.get("/users", getUsers);
        app.get("/users/:id", getUserById);
        app.post("/users", jsonParser, createUser);
        app.delete("/users/:id", deleteUser);
        app.put("/users/:id", jsonParser, updateUser);

        app.listen(3000, () => {
            console.log("Server is listening on port 3000");
        });
    } catch (err) {
        console.error("Error connecting to MongoDB", err);
        process.exit(1);
    }
}

async function getUsers(req, res) {
    try {
        const collection = req.app.locals.collection;
        const users = await collection.find({}).toArray();
        res.send(users);
    } catch (err) {
        console.error("Error fetching users", err);
        res.status(500).send("Error fetching users");
    }
}

async function getUserById(req, res) {
    try {
        const id = new ObjectId(req.params.id);
        const collection = req.app.locals.collection;
        const user = await collection.findOne({ _id: id });
        if (!user) {
            return res.status(404).send('Пользователь не найден');
        }
        res.send(user);
    } catch (err) {
        console.error('Ошибка при получении пользователя по ID', err);
        res.status(500).send('Ошибка при получении пользователя по ID');
    }
}

async function createUser(req, res) {
    try {
        const { name, age } = req.body;
        const user = { name, age };

        const collection = req.app.locals.collection;
        await collection.insertOne(user);

        res.send(user);
    } catch (err) {
        console.error("Error inserting user", err);
        res.status(500).send("Error inserting user");
    }
}


async function deleteUser(req, res) {
    try {
        const id = new ObjectId(req.params.id);
        const collection = req.app.locals.collection;
        const result = await collection.deleteOne({ _id: id });

        if (result.deletedCount === 0) {
            return res.status(404).send('Пользователь не найден');
        }
        res.send({ message: 'Пользователь успешно удалён' });
    } catch (err) {
        console.error('Ошибка при удалении пользователя', err);
        res.status(500).send('Ошибка при удалении пользователя');
    }
}

async function updateUser(req, res) {
    try {
        const { id, name, age } = req.body;
        const objectId = new ObjectId(req.params.id);

        console.log("Updating user with ID:", req.params.id); // Отладочный вывод
        console.log("Updating with name:", name, "and age:", age); // Отладочный вывод

        const collection = req.app.locals.collection;
        const result = await collection.findOneAndUpdate(
            { _id: objectId },
            { $set: { name, age } },
            { returnOriginal: false }
        );

        if (!result) {
            return res.status(404).send("User not found");
        }

        // Создаем объект JSON с полями name и age для передачи в res.json()
        const updatedUser = {
            id: id,
            name: name,
            age: age
        };
        console.log("updatedUser: ", updatedUser); // Отладочный вывод
        res.json(updatedUser); // Возвращаем обновленного пользователя в формате JSON
    } catch (err) {
        console.error("Error updating user", err);
        res.status(500).send("Error updating user");
    }
}

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

startServer();
