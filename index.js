const express = require('express');
const cors = require('cors');
require('dotenv').config();
const cookieParser = require('cookie-parser')
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors({
  origin:["http://localhost:5173"],
  credentials:true
}));
app.use(express.json());
app.use(cookieParser());

// console.log(process.env.DB_USER) 

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.jcr16zp.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});





//middleware
const logger = (req, res, next)=>{
  console.log('log : Info ', req.method, req.url);
  next();
}

const verifyToken = (req, res, next)=>{
  const token = req?.cookies?.token;
  // console.log('token in a middleware', token);
  if(!token){
    return res.status(401).send({massage : 'Unauthorize access'})
  }
  jwt.verify(token, process.env.ACCESS_TOkEN, (err,decoded)=>{
    if(err){
      return res.status(401).send({massage : 'Unauthorize access'})
    }
    req.user=decoded
    next();
  })
}




const servicesCollection = client.db("carDoctorDB").collection("services");
const checkOutCollection = client.db("carDoctorDB").collection("checkOut");

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();


    //auth related API
    app.post("/jwt", async(req,res)=>{
      const user = req.body;
      console.log(user);
      const token = jwt.sign(user , process.env.ACCESS_TOkEN , {expiresIn: '1h'});
      res
      .cookie('token', token, {
        httpOnly: true,
        secure: false,
        // sameSite:'none'
      })
      .send({success : true})
    })

    app.post("/logout", async(req,res)=>{
      const user =req.body;

      res.clearCookie('token',{maxAge:0}).send({success : true})
    })


    //service related
    app.get("/services", async (req, res) => {
      const cursor = servicesCollection.find();
      const result = await cursor.toArray();
      res.send(result)
    })

    app.get("/services/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const options = {
        projection: { title: 1, price: 1, service_id: 1, img: 1 }
      }
      const result = await servicesCollection.findOne(query, options);
      res.send(result)
    })



    //for check out collection

    app.get("/checkOut",logger,verifyToken, async (req, res) => {
      // console.log(req.query.email)
      // console.log('token owner',req.user)
      if(req.user.email !== req.query.email){
        return res.status(403).send({massage : 'forbidden access'})
      }
      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email }
      }
      const result = await checkOutCollection.find(query).toArray();
      res.send(result)
    })


    app.post("/checkOut", async (req, res) => {
      const checkOut = req.body;
      console.log(checkOut);
      const result = await checkOutCollection.insertOne(checkOut);
      res.send(result)
    })


    app.patch("/checkOut/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateBookings = req.body;
      const updateDoc = {
        $set: {
          status: updateBookings.status
        },
      };
      const result =await checkOutCollection.updateOne(filter,updateDoc);
      res.send(result)
    })


    app.delete("/checkOut/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await checkOutCollection.deleteOne(query);
      res.send(result)
    })


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get("/", (req, res) => {
  res.send("car doctor server is running")
})

app.listen(port, () => {
  console.log(`server is running on ${port}`)
})
