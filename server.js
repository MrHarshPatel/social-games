const express = require('express');
const next = require('next');
const mongoose = require('mongoose');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();
const axios = require('axios');

// Connect to MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/lobbies', { useNewUrlParser: true, useUnifiedTopology: true });

function generateUniqueUrl() {
    // Code to generate a unique URL
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

const lobbySchema = new mongoose.Schema({
    numUsers: { type: Number, default: 0 }
});

const userSchema = new mongoose.Schema({
    username: { type: String, default: generateRandomUsername() },
    lobby: { type: mongoose.Schema.Types.ObjectId, ref: 'Lobby' }
});

const Lobby = mongoose.model('Lobby', lobbySchema);
const User = mongoose.model('User', userSchema);

app.prepare().then(() => {
    const server = express();

    server.post('/api/lobbies', async (req, res) => {
        const newLobby = new Lobby({ url: generateUniqueUrl() });
        await newLobby.save();
        res.json({ lobby: newLobby });
    });

    server.get('/test', async (req, res) => {
        console.log("TEST!");
    });

    server.get('/lobby/:id', async (req, res) => {
        const lobbyId = req.params.id;
        const lobby = await Lobby.findOne({ url: `/lobby/${lobbyId}` });
        if (!lobby) {
            res.status(404).send("Lobby not found");
            return;
        }
        const newUser = new User({ lobby: lobby._id });
        await newUser.save();
        lobby.numUsers++;
        await lobby.save();
        console.log(`User ${newUser.username} joined lobby ${lobbyId} which now has ${lobby.users} users`);
        res.json({ message: "You have joined the lobby", username: newUser.username });
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