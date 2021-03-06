const express = require('express');
const app = express();
require('dotenv').config();
const bodyParser = require('body-parser');
const shortid = require('shortid');
const cors = require('cors');
const formatLog = require('./utils/formatLog');

const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

app.use(cors());

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(express.static('public'));
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

// User schema
const Schema = mongoose.Schema;
const userSchema = new Schema(
  {
    _id: String,
    username: String,
    log: [{ description: String, duration: Number, date: Date }],
  },
  {
    writeConcern: {
      w: 'majority',
      j: true,
      wtimeout: 1000,
    },
  }
);

// User model
const UserModel = mongoose.model('User', userSchema);

// Endpoint for creating a new user
app.post('/api/exercise/new-user', (req, res, next) => {
  const username = req.body.username;

  // Checks if username already taken
  UserModel.findOne({ username: username }, (err, user) => {
    if (err) return next(err);
    if (user) {
      res.send('username already taken');
    } else {
      // Save new user
      const newUser = new UserModel({
        _id: shortid.generate(),
        username: username,
      });
      newUser.save((saveError, result) => {
        if (saveError) return next(saveError);
        res.json({ username: result.username, _id: result._id });
      });
    }
  });
});

// Endpoint for adding user's exercise
app.post('/api/exercise/add', (req, res, next) => {
  const { userId, description, duration } = req.body;
  const date =
    req.body.date === '' || req.body.date === undefined
      ? new Date()
      : req.body.date;
  UserModel.findById({ _id: userId }, (err, user) => {
    if (err) return next(err);
    if (!user) {
      res.send('invalid user id');
    } else {
      user.log.push({
        description: description,
        duration: duration,
        date: date,
      });
      user.save((saveError, result) => {
        if (saveError) return next(saveError);
        const log = result.log;
        const logIndex = log.length - 1;
        const savedDate = new Date(log[logIndex].date).toDateString();
        res.json({
          username: result.username,
          description: log[logIndex].description,
          duration: log[logIndex].duration,
          _id: result._id,
          date: savedDate,
        });
      });
    }
  });
});

// Endpoint for getting all users
app.get('/api/exercise/users', (req, res, next) => {
  UserModel.find({})
    .select({ log: 0 })
    .exec((err, result) => {
      if (err) return next(err);
      res.json(result);
    });
});

// Endpoint for getting user's exercise log
app.get('/api/exercise/log', (req, res, next) => {
  const { userId, from, to, limit } = req.query;
  UserModel.findById({ _id: userId })
    .select({ 'log._id': 0 })
    .exec((err, result) => {
      if (err) return next(err);
      if (!result) {
        next();
      } else {
        const { _id, username, log } = result;
        const { _from, _to, formattedLog } = formatLog(from, to, limit, log);
        const json = {
          _id: _id,
          username: username,
          from: _from ? _from.toDateString() : undefined,
          to: _to ? _to.toDateString() : undefined,
          count: formattedLog.length,
          log: [...formattedLog],
        };
        if (!json.from) {
          delete json.from;
        }
        if (!json.to) {
          delete json.to;
        }
        res.json(json);
      }
    });
});

// Not found middleware
app.use((req, res, next) => {
  return next({ status: 404, message: 'not found' });
});

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage;

  if (err.errors) {
    // mongoose validation error
    errCode = 400; // bad request
    const keys = Object.keys(err.errors);
    // report the first validation error
    errMessage = err.errors[keys[0]].message;
  } else {
    // generic or custom error
    errCode = err.status || 500;
    errMessage = err.message || 'Internal Server Error';
  }
  res.status(errCode).type('txt').send(errMessage);
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});
