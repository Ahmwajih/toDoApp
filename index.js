const express = require('express');
const app = express();
const port = 3000;

// use cors:
const cors = require('cors');
app.use(cors());

// using sequelize to connect to our database:
const { Sequelize, DataTypes } = require('sequelize');
// Sequelize is a library that allows us to interact with SQL databases
// DataTypes is a package that allows us to specify the data types of our columns
// Sequelize is used to connect to a database and interact with it

// Create and instance of Sequelize:
const sequelize = new Sequelize("sqlite:./db.sqlite3")
// We initiliaze a new instance of Sequelize and connect it to a database
// This connects to a database called db.sqlite3
// If the database does not exist, it will be created

// Define a model:
const Todo = sequelize.define("todos", {
    // DataTypes:
    // STRING, TEXT, BOOLEAN, INTEGER, TINYINT, SMALLINT, MEDIUMINT, BIGINT, FLOAT, DOUBLE, DECIMAL, DATE, TIME, DATEONLY, BLOB, JSON, JSONB, UUID, ARRAY
    // Schema:
    title: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true // This means that the title must be unique
    },

    description: DataTypes.TEXT,

    priority: {
        // -1 low, 0 medium, 1 high
        type: DataTypes.TINYINT,
        allowNull: false,
        defaultValue: 0 //This just means if we don't specify a value when writing to the DB, it will default to 0
    },

    isDone: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    }
    // we will auktomatically have IDs, createdAt and updatedAt columns, we don't need to specify them
    // sequelize will automatically add them

    // REMEMBER IF YOU CHANGE YOUR MODEL, YOU WILL NEED TO DROP THE TABLE AND RESYNC IT!!!
})

// At this point, we have created an instance of Sequelize and defined a model
// The next step is to connect to the database and create a table based on the model
// TO CONNECT TO THE DATABASE:
sequelize.authenticate().then(() => {
    console.log("Connected to DB...")
}).catch((err) => {
    console.log("DB not connected...");
})

// Once I've created a model of a certain schema, I can use the model to directly interact with the database
// But only the table that the model is based on
// Now I can do things like:

// MAKE A TABLE:
// Todo.sync().then(()=>{
//     console.log("Table 'todos' created...");
// }).catch((err)=>{
//     console.log("Table not created...");
// })
// We only need to run sync once.  After we do this one time, we can comment out this code
// We officially have a table in our database called 'todos'
// IF I CHANGE THE MODEL / SCHEME, I will need to drop the table and recreate it!!!
// This is because the table was based on the properties I set in the model at the time of creation!

// DROP A TABLE:
// Todo.drop().then(()=>{
//     console.log("Table 'todos' dropped...");
// }).catch((err)=>{
//     console.log("Table not dropped...");
// })

// Todo.create({
//     title: "First Todo",
//     description: "This is my first todo",
//     priority: 0,
//     isDone: false
// }).then((todo)=>{
//     console.log(todo);
// }).catch((err)=>{
//     console.log(err);
// })

// Todo.findAll().then((todos)=>{
//     console.log(todos);
// }).catch((err)=>{
//     console.log(err);
// })

// Middleware just logging a timestamp
app.use((req, res, next) => {
    console.log('Time:', Date.now(), 'seconds since january 1, 1970');
    next();
})

// Middleware to parse any JSON sent in the req.body:
app.use(express.json());

// Catch async errors to error handling middleware:
require('express-async-errors');

const router = express.Router()

// This is a default route: http://localhost:3000/
// Get all todos:
router.get('/', async (req, res) => {
    const data = await Todo.findAndCountAll()

    res.status(200).send({
        error: false,
        data: data
    })
})

// POST a new todo:
router.post('/', async (req, res, next) => {
    const { title, description, priority } = req.body;

    if (!title || !description) {
        const err = new Error("Title and description are required")
        err.cause = "Title and description are required"
        err.errorStatusCode = 400 // 400 = Bad request, meaning the user made a mistake
        next(err)
    } else {
        const newTodo = await Todo.create({
            title: title,
            description: description,
            priority: priority ? priority : 0,
        })
        // Sequelize is an ORM (Object Relational Mapping) library
        // This just means it translates our JS objects into SQL queries
        // The statement above would be translated into an SQL query that would insert a new row into the table
        // This SQL query would look something like this:
        // INSERT INTO todos (title, description, priority) VALUES (title, description, priority)

        res.status(201).send({
            error: false,
            data: newTodo
        })
    }
})

// GET a single todo by ID:
// Todo.findByPK = method to find entry by primary key
// By default, sequelize makes an ID the primary key for our table
router.get('/:id', async (req, res, next) => {
    const data = await Todo.findByPk(req.params.id)
    if (!data) {
        const err = new Error("No todo found by this ID")
        err.cause = "Invalid ID"
        err.errorStatusCode = 400 // 400 = Bad request, meaning the user made a mistake
        next(err)
    } else {
        res.status(200).send({
            error: false,
            result: data
        })
    }
})

// find something by title:
router.get('/title/:title', async (req, res, next)=>{
    const title = req.params.title
    const data = await Todo.findOne({where:{ title: title}})
    res.status(200).send({
        error: false,
        data
    })
})

// EDIT:
router.put('/:id', async (req, res, next)=>{
    const id = req.params.id
    const {title, description} = req.body

    // updating:
    // the update method will delete ALL items that match the where clause:
    // update takes 2 arguments: the new value and the where clause
    const data = await Todo.update(
        // update will return the number of rows updated
        {title, description}, // this is the new values we want to update to
        {
            // here, in our where clause, 
            // we just specify an object with the matching parameters
            // we want to be updated to the new values (above)
            where:{
                id: id
            }
        }
    )
    res.send({
        error:false, 
        data: data
    })
    console.log(data)
})

// DELETE
router.delete('/:id', async (req, res, next)=>{
    const id = req.params.id
    // Below, wheen we assign to a Model.destroy, the destroy method returns the number of rows deleted
    const data = await Todo.destroy({
        // where clause to specify which item to delete
        where:{
            id: id
        }
    })
    res.send({
        error: false,
        data: data
    })
})

app.use(router)

// ERROR HANDLING MIDDLEWARE:
const errorHandler = (err, req, res, next) => {
    const errorStatusCode = res.errorStatusCode || 500;
    console.log("Error handler running...")
    res.status(errorStatusCode).send({
        error: true,
        message: err.message,
        cause: err.cause
    });
}
app.use(errorHandler);

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
})