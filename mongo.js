const express = require("express");
const { MongoClient, ObjectId } = require("mongodb"); // Додаємо ObjectId для роботи з ідентифікаторами MongoDB
const path = require("path");

const app = express();
const jsonParser = express.json();

const url = "mongodb://localhost:27017/";
const dbName = "carsdb";
const collectionName = "cars";

let client;

app.use(express.static(path.join(__dirname), {
    setHeaders: (res, path, stat) => {
        if (path.endsWith(".css")) {
            res.setHeader("Content-Type", "text/css");
        }
    }
}));

async function startServer() {
    client = new MongoClient(url);

    try {
        await client.connect();
        console.log("Підключено до MongoDB");

        const db = client.db(dbName);
        const collection = db.collection(collectionName);
        app.locals.collection = collection;

        app.use(express.static(path.join(__dirname)));

        app.get("/", (req, res) => {
            res.sendFile(path.join(__dirname, "public.html"));
        });

        app.get("/cars", getCars);
        app.get("/cars/:id", getCarById);
        app.post("/cars", jsonParser, createCar);
        app.delete("/cars/:id", deleteCar);
        app.put("/cars/:id", jsonParser, updateCar);

        app.listen(3000, () => {
            console.log("Сервер слухає порт 3000");
        });
    } catch (err) {
        console.error("Помилка підключення до MongoDB", err);
        process.exit(1);
    }
}

async function getCars(req, res) {
    try {
        const collection = req.app.locals.collection;
        const cars = await collection.find({}).toArray();
        res.send(cars);
    } catch (err) {
        console.error("Помилка отримання списку автомобілів", err);
        res.status(500).send("Помилка отримання списку автомобілів");
    }
}

async function getCarById(req, res) {
    try {
        const id = new ObjectId(req.params.id);
        const collection = req.app.locals.collection;
        const car = await collection.findOne({ _id: id });
        if (!car) {
            return res.status(404).send('Автомобіль не знайдено');
        }
        res.send(car);
    } catch (err) {
        console.error('Помилка при отриманні автомобіля за ID', err);
        res.status(500).send('Помилка при отриманні автомобіля за ID');
    }
}

async function createCar(req, res) {
    try {
        const { make, model, year } = req.body;
        const car = { make, model, year };

        const collection = req.app.locals.collection;
        await collection.insertOne(car);

        res.send(car);
    } catch (err) {
        console.error("Помилка при додаванні автомобіля", err);
        res.status(500).send("Помилка при додаванні автомобіля");
    }
}

async function deleteCar(req, res) {
    try {
        const id = new ObjectId(req.params.id);
        const collection = req.app.locals.collection;
        const result = await collection.deleteOne({ _id: id });

        if (result.deletedCount === 0) {
            return res.status(404).send('Автомобіль не знайдено');
        }
        res.send({ message: 'Автомобіль успішно видалено' });
    } catch (err) {
        console.error('Помилка при видаленні автомобіля', err);
        res.status(500).send('Помилка при видаленні автомобіля');
    }
}

async function updateCar(req, res) {
    try {
        const { make, model, year } = req.body;
        const objectId = new ObjectId(req.params.id);

        console.log("Оновлення автомобіля за ID:", req.params.id);
        console.log("Оновлення з маркою:", make, "моделлю:", model, "і роком:", year);

        const collection = req.app.locals.collection;
        const result = await collection.findOneAndUpdate(
            { _id: objectId },
            { $set: { make, model, year } },
            { returnOriginal: false }
        );

        if (!result) {
            return res.status(404).send("Автомобіль не знайдено");
        }

        const updatedCar = {
            id: req.params.id,
            make: make,
            model: model,
            year: year
        };
        console.log("updatedCar: ", updatedCar);
        res.json(updatedCar);
    } catch (err) {
        console.error("Помилка при оновленні автомобіля", err);
        res.status(500).send("Помилка при оновленні автомобіля");
    }
}

process.on("SIGINT", async () => {
    try {
        await client.close();
        console.log("Відключено від MongoDB");
        process.exit(0);
    } catch (err) {
        console.error("Помилка закриття з'єднання з MongoDB", err);
        process.exit(1);
    }
});

startServer();
