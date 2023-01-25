const express = require('express');
const next = require('next');
const mongoose = require('mongoose');
const { Schema } = mongoose;

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();
const axios = require('axios');
const cors = require('cors')
const cookieParser = require('cookie-parser');

// Connect to MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/lobbies', { useNewUrlParser: true, useUnifiedTopology: true });

function generateUniqueUrl() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let id = '';
    for (let i = 0; i < 5; i++) {
        id += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return id;
}

async function generateRandomUsername() {
    try {
        const words = await axios.get('https://random-word-api.herokuapp.com/word?number=2');
        return words.data.join("_");
    } catch (error) {
        console.error(error);
        return "user";
    }
}

const lobbySchema = new Schema({
    url: { type: String, required: true, unique: true, default: generateUniqueUrl() },
    users: [{ type: Schema.Types.ObjectId, ref: 'User' }],
});

const userSchema = new Schema({
    username: { type: String, required: true, unique: true },
    lobby: { type: Schema.Types.ObjectId, ref: 'Lobby' },
});

const Lobby = mongoose.model('Lobby', lobbySchema);
const User = mongoose.model('User', userSchema);

app.prepare().then(() => {
    const server = express();
    server.use(cors({ origin: "http://localhost:3000", credentials: true }))
    server.use(cookieParser());

    server.post('/api/lobbies', async (req, res) => {
        const newLobby = new Lobby({ url: generateUniqueUrl() });
        await newLobby.save();
        res.json({ lobby: newLobby });
    });

    // TODO: Remove this route.
    server.get('/ping', async (req, res) => {
        console.log("Pong!");
    });

    server.get('/api/lobbies/:id', async (req, res) => {
        const lobbyId = req.params.id;
        const lobby = await Lobby.findOne({ url: `${lobbyId}` }).populate('users');
        if (!lobby) {
            res.status(404).send("Lobby not found");
            return;
        }

        const cookie = req.cookies[lobbyId];
        if (!cookie) {
            res.cookie(lobbyId, true, { maxAge: 60 * 60 * 24 * 7, isHttpOnly: false });
            // create a new user and add them to the lobby
            const newUser = new User({ lobby: lobby._id, username: await generateRandomUsername() });
            await newUser.save();
            lobby.users.push(newUser);
            res.cookie(`${lobbyId}/user`, newUser.username, { maxAge: 60 * 60 * 24 * 7, isHttpOnly: false });
        }
        await lobby.save();
        res.json({ lobby: lobby });
    });

    server.get('/api/lobbies/:id/users', async (req, res) => {
        const lobbyId = req.params.id;
        const users = await User.find({ lobby: lobbyId });
        res.json({ users });
    });

    server.get('*', (req, res) => {
        return handle(req, res);
    });

    server.listen(3001, (err) => {
        if (err) throw err;
        console.log('> Ready on http://localhost:3001');
    });
});