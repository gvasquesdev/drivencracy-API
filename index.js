import express from "express";
import cors from "cors";
import chalk  from "chalk";
import dotenv from "dotenv";
import dayjs from "dayjs";
import joi from 'joi';
import { MongoClient, ObjectId } from "mongodb";

dotenv.config();

const app = express()

app.use(cors(), express.json());


let db = null;
const mongoClient = new MongoClient(process.env.MONGO_URI);

try {
    await mongoClient.connect();
    db = mongoClient.db(process.env.DATABASE);
    console.log(chalk.blue.bold("Connected to MongoDB database!"))
} catch (error) {
    console.log(chalk.red.bold("Error connecting to database!"));
    console.log(error);
}

const pollSchema = joi.object({
    title: joi.string().required(),
    expireAt: joi.string()
});

const choiceSchema = joi.object({
    title: joi.string().required(),
    pollId: joi.string().required()
});




const port = process.env.PORT || 5000;
app.listen(port, () => {
    console.log(chalk.green.bold(`Server running on port ${port}`));
})
