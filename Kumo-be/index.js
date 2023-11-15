const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const bcrypt = require('bcrypt');
const cookieParser = require('cookie-parser');
const User = require('./Models/User');
const Message = require('./Models/Message');
const ws = require('ws');
const fs = require('fs');

dotenv.config();

mongoose.connect(process.env.DB);
const jwtSecret = process.env.JWT_SECRET;
const bcryptSalt = bcrypt.genSaltSync(10);
const app = express();
app.use('/uploads', express.static(__dirname + '/uploads'));
app.use(express.json());
app.use(cookieParser());

app.use(cors({
  credentials: true,
  origin: 'https://u09-kumo-fe.vercel.app',
  methods: ['POST', 'GET'],
  exposedHeaders: ['Access-Control-Allow-Origin']
}));

async function getUserDataFromRequest(req) {
  return new Promise((resolve, reject) => {
    const token = req.cookies?.token
    if (token) {
      jwt.verify(token, jwtSecret, {}, (err, userData) => {
        if (err) {
          throw err
        }
        resolve(userData)
      });
    } else {
      reject('no token')
    }
  })

}

// test
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', 'https://u09-kumo-fe.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', true);
  next();
});
app.get('/test', (req, res) => {
  res.json('test ok')
})

app.get("/messages/:userId", async (req, res) => {
  const { userId } = req.params;
  const userData = await getUserDataFromRequest(req)
  const ourUserId = userData.userId
  const messages = await Message.find({
    sender: { $in: [userId, ourUserId] },
    recipient: { $in: [userId, ourUserId] }
  }).sort({ createdAt: 1 });
  res.json(messages)
})

app.get('/people', async (req, res) => {
  const users = await User.find({}, { '_id': 1, 'username': 1 })
  res.json(users)
})

app.get('/profile', (req, res) => {
  const token = req.cookies?.token
  if (token) {
    jwt.verify(token, jwtSecret, {}, (err, userData) => {
      if (err) {
        throw err
      }
      res.json(userData)
    })
  } else {
    res.status(401).json('no token')
  }

})


app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const foundUser = await User.findOne({ username })
  if (foundUser) {
    const passOk = bcrypt.compareSync(password, foundUser.password)
    if (passOk) {
      jwt.sign({ userId: foundUser._id, username }, jwtSecret, {}, (err, token) => {
        res.cookie('token', token).json({ id: foundUser._id, username }).status(200)
      })
    }
  }
})

app.post('/logout', (req, res) => {
  res.cookie('token', '').json('ok')
})

app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    const hashedPassword = bcrypt.hashSync(password, bcryptSalt)
    const createdUser = await User.create({
      username: username,
      password: hashedPassword
    })
    jwt.sign({ userId: createdUser._id, username }, jwtSecret, {}, (err, token) => {
      if (err) {
        throw err
      }
      res.cookie('token', token).json({ id: createdUser._id, username }).status(201)
    })
  } catch (error) {
    if (error) throw error
    res.json('error').status(500)
  }


})
const server = app.listen(9000)

const WSS = new ws.WebSocketServer({ server })

WSS.on('connection', (connection, req) => {

  function notifyAboutOnlinePeople() {
    [...WSS.clients].forEach(client => {
      client.send(JSON.stringify({ online: [...WSS.clients].map(c => ({ userId: c.userId, username: c.username })) }))
    })
  }

  connection.isAlive = true

  connection.timer = setInterval(() => {
    connection.ping()
    connection.deathTimer = setTimeout(() => {
      connection.isAlive = false
      clearInterval(connection.timer)
      connection.terminate()
      notifyAboutOnlinePeople()
      console.log('dead')
    }, 1000)
  }, 5000);

  connection.on('pong', () => {
    clearTimeout(connection.deathTimer)
  })

  // read username and id form the cookie for this connection
  const cookies = req.headers.cookie

  if (cookies) {
    const tokenCookieString = cookies.split(';').find(str => str.startsWith('token='))

    if (tokenCookieString) {
      const token = tokenCookieString.split('=')[1]
      if (token) {
        jwt.verify(token, jwtSecret, {}, (err, userData) => {
          if (err) {
            throw err
          }
          const { userId, username } = userData
          connection.userId = userId
          connection.username = username
        })
      }
    }
  }

  connection.on('message', async (message,) => {
    const messageData = JSON.parse(message.toString())

    const { recipient, text, file } = messageData
    let fileName = null
    if (file) {
      console.log('size', file.data.length);
      const parts = file.name.split('.')
      const ext = parts[parts.length - 1]
      fileName = Date.now() + '.' + ext;
      const filePath = __dirname + '/uploads/' + fileName
      const bufferData = Buffer.from(file.data.split(',')[1], 'base64')
      fs.writeFile(filePath, bufferData, () => {
        console.log('file saved:' + filePath)
      })
    }

    if (recipient && (text || file)) {
      const messageDoc = await Message.create({
        sender: connection.userId,
        recipient,
        text,
        file: file ? fileName : null,
      });
      console.log('created message');
      [...WSS.clients]
        .filter(c => c.userId === recipient)
        .forEach(c => c.send(JSON.stringify({
          text,
          sender: connection.userId,
          recipient,
          file: file ? fileName : null,
          _id: messageDoc._id,
        })));
    }
  });



  // notify everyone about online people (when someone connects)
  notifyAboutOnlinePeople()
})



