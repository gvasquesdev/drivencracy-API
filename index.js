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

// Requisições POST poll, choice e choice/:id/vote


app.post("/poll", async (req,res) => {
    let { title, expireAt } = req.body;
    const {error} = pollSchema.validate(req.body);

    if (error) {
    res.status(422);
    }

    if (!title) {
        res.status(422).send("Escreva o título da enquete");
    }

    if (!expireAt) {
        expireAt = (dayjs().add(30,"day").format("DD-MM-YYYY HH:mm"));
    }


    try {
        const pollExists = await db.collection("polls").findOne({ title: req.body.title });
        if (pollExists) {
            return res.sendStatus(409);
        }

        await db
        .collection("polls")
        .insertOne({title: title, expireAt: expireAt});

        res.status(201).send("Enquete criada com sucesso!");
    } catch (err) {
        console.log(err);
        res.status(500).send(error.message);
    }
});

app.post("/choice", async (req,res) => {
    const {title, pollId} = req.body;
    const {error} = choiceSchema.validate(req.body);

    if (error) {
        res.status(422);
        }

    if (!title || !pollId) {
        res.status(422).send("Está faltando o título ou o Id da enquete");
    }

      try {
        const findPoll = await db.collection('polls').findOne({ _id: new ObjectId(pollId) });

        if(!findPoll) {
          return res.status(404).send('Enquete não existente');
        }
        const expiredDate = findPoll.expiredAt
    
        const isExpired = dayjs().isAfter(expiredDate, 'days');
        if(isExpired) {
          return res.status(403).send('Enquete expirada')
        }
    
        const findChoice = await db.collection('choice').findOne({ title: title });
    
        if(findChoice) {
          return res.status(409).send('Opção de voto já existente');
        }
    
        await db.collection('choice').insertOne({title: title, pollId:pollId});
    
        res.status(201);
      } catch(err){
        console.log(err)
        res.status(500).send(err.message);
      }
})

app.post("/choice/:id/vote", async (req,res) => {
    let { id } = req.params;

    const vote = {
        createdAt: dayjs().format('YYYY-MM-DD hh:mm'),
        choiceId: id
    }

      const choice = await db.collection("choice").findOne({ _id: ObjectId(id) });
      if (!choice) {
          return res.sendStatus(404);
      }

      const poll = await db.collection("polls").findOne({ _id: ObjectId(choice.pollId) });

      if (dayjs().diff(dayjs(poll.expireAt))>0) {
          return res.sendStatus(403);
      }

    try {
        await db.collection("votes").insertOne({ ...vote });

        res.status(201).send("Voto registrado com sucesso");
      
    } catch (err) {
        console.log(err);
        res.send(500);
    }
})


const port = process.env.PORT || 5000;
app.listen(port, () => {
    console.log(chalk.green.bold(`Server running on port ${port}`));
})
