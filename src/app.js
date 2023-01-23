import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import dotenv from "dotenv"
import joi from "joi";
import bcrypt from "bcrypt"
import { v4 as uuid } from 'uuid';
import dayjs from "dayjs"


dotenv.config()


const app = express()
app.use(cors())
app.use(express.json())

const mongoClient = new MongoClient(process.env.DATABASE_URL)
let db;

try {
    await mongoClient.connect()
    db = mongoClient.db()
}
catch{
    console.log('deu péssimo')
}


app.post('/login', async (req, res) => {

    const {email, password} = req.body

    const loginSchema = joi.object({
        email: joi.string().email().required(),
        password: joi.string().required()
    })

    try {

        const {error, value: user} = loginSchema.validate({ email, password }, { abortEarly: false })

        if (error) {
            const err = error.details.map((e) => e.message)
            return res.status(422).send(err)
        }

        const existsUser = await db.collection("users").findOne({ email })
        // console.log(existsUser)
        console.log(bcrypt.compareSync(password, existsUser.passwordHash))
        console.log(user)

        if(!existsUser || bcrypt.compareSync(password, existsUser.passwordHash) === false) return res.status(409).send("Usuário ou senha incorretos!")

        const token = uuid();
        console.log(token)

        const findUser = await db.collection("users").findOne({ email })
        console.log(findUser)
        await db.collection("sessions").insertOne({
            userId: findUser._id,
            token
        })


        res.send(token)

    }
    catch {
        res.status(500).send('deu zica no servidor')
    }
})

app.post('/sign-up', async (req, res) => {

    const { email, name, password, confirmPassword } = req.body

    const userSchema = joi.object({
        email: joi.string().email().required(),
        name: joi.string().required(),
        password: joi.string().required(),
        confirmPassword: joi.string().valid(password).required()
    })

    try {

        const { error } = userSchema.validate({ email, name, password, confirmPassword }, { abortEarly: false })

        if (error) {
            const err = error.details.map((e) => e.message)
            return res.status(422).send(err)
        }

        const existsUser = await db.collection("users").findOne({ email })

        if (existsUser) return res.status(409).send('Usuário já cadastrado!')
        // console.log(existsUser)

        const passwordHash = bcrypt.hashSync(password, 10);

        await db.collection("users").insertOne({ email, name, passwordHash })

        res.send({ email, name, passwordHash })

    }
    catch {
        res.sendStatus(500)
    }

})

app.post('/nova-entrada', async (req,res) => {
    const { valueE, description } = req.body

    const entradaSchema = joi.object({
        valueE: joi.string().alphanum().required(),
        description: joi.string().required()
    })

    const { authorization } = req.headers
    const token = authorization?.replace('Bearer ', '')

    try {

        if(!token) return res.sendStatus(401)

        const session = await db.collection("sessions").findOne({ token })
            
        if (!session) return res.sendStatus(401)

        const { error, value: entrada } = entradaSchema.validate({ valueE, description }, { abortEarly: false })
        
        if (error) {
            const err = error.details.map((e) => e.message)
            return res.status(422).send(err)
        }
        const day = dayjs().format("DD/MM")
        const registro = {...entrada, day}
        await db.collection("entradas").insertOne(registro)
        res.send(registro)
    }
    catch {
        res.status(500).send('deu muito ruim')
    }

})

app.post('/nova-saida', async (req,res) => {
    const { valueS, description } = req.body

    const saidaSchema = joi.object({
        valueS: joi.string().alphanum().required(),
        description: joi.string().required()
    })
    const { authorization } = req.headers
    const token = authorization?.replace('Bearer ', '')

    try {

        if(!token) return res.sendStatus(401)

        const session = await db.collection("sessions").findOne({ token })
            
        if (!session) return res.sendStatus(401)

        const { error, value: saida } = saidaSchema.validate({ valueS, description }, { abortEarly: false })
        if (error) {
            const err = error.details.map((e) => e.message)
            return res.status(422).send(err)
        }

        const day = dayjs().format("DD/MM")
        const registro = {...saida, day}
        await db.collection("saidas").insertOne(registro)
        res.send(registro)
    }
    catch {
        res.status(500).send('deu muito péssimo')
    }

})

// app.get('/saidas', async (req, res) => {
//     const { authorization } = req.headers
//     const token = authorization?.replace('Bearer ', '')

//     try {

//         if(!token) return res.sendStatus(401)

//         const session = await db.collection("sessions").findOne({ token })
            
//         if (!session) return res.sendStatus(401)
        
        
//         const resp_saida = await db.collection("saidas").find().toArray()
//         // const resp_entrada = await db.collection("entradas").find().toArray()

//         res.send(resp_saida)
//     }
//     catch {

//     }
// })

app.get('/home', async (req, res) => {
    const { authorization } = req.headers
    const token = authorization?.replace('Bearer ', '')

    try {

        if(!token) return res.sendStatus(401)

        const session = await db.collection("sessions").findOne({ token })
            
        if (!session) return res.sendStatus(401)
        
        
        const resp_saida = await db.collection("saidas").find().toArray()
        const resp_entrada = await db.collection("entradas").find().toArray()

        res.send([...resp_saida, ...resp_entrada])
    }
    catch {

    }
})

app.get('/user', async (req, res) => {
    const { authorization } = req.headers
    const token = authorization?.replace('Bearer ', '')

    try {

        if(!token) return res.sendStatus(401)

        const session = await db.collection("sessions").findOne({ token })
            
        if (!session) return res.sendStatus(401)
        
        
        const findUser = await db.collection("sessions").findOne({ token })
        console.log(findUser.userId)

        const user = await db.collection("users").findOne({_id: findUser.userId})

        res.send(user)
    }
    catch {
        res.sendStatus(500)
    }
})

const PORT = 5000

app.listen(PORT, () => console.log('servidor subiu namoral!!!'))