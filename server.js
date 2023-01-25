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
    const http = require('http');
    const httpServer = http.createServer(server).listen(3001, function () {
        console.log("Express server listening on port " + 3001);
    });
    const io = require('socket.io')(httpServer,
        {
            cors: {
                origin: "http://localhost:3000",
                credentials: true
            }
        }
    );

    // Sockets for real-time stuff.
    io.on('connection', (socket) => {
        socket.on('join-lobby', async (lobbyId) => {
            socket.join(lobbyId);
            const lobby = await Lobby.findOne({ url: `${lobbyId}` }).populate('users');
            io.to(lobbyId).emit('update-lobby', { lobby: lobby });
        });

        socket.on('leave-lobby', async (lobbyId, username) => {
            socket.leave(lobbyId);
            const lobby = await Lobby.findOne({ url: `${lobbyId}` });
            const user = await User.findOneAndRemove({ username: `${username}` });
            lobby.users.pull(user);
            if (lobby.users.length < 1) {
                await lobby.remove();
            }
            else {
                await lobby.save();
            }
            io.to(lobbyId).emit('update-lobby', { lobby: await lobby.populate('users') });
        });
    });

    server.use(cors({ origin: "http://localhost:3000", credentials: true }))
    server.use(cookieParser());

    // Routes impact the lobby SQL database.
    server.post('/api/lobbies', async (req, res) => {
        const newLobby = new Lobby({ url: generateUniqueUrl() });
        await newLobby.save();
        res.json({ lobby: newLobby });
    });

    // TODO: Remove this route.
    server.get('/ping', async (req, res) => {
        console.log("Pong!");
    });

    // Route to add a new user if this user is new, and show the lobby.
    server.get('/api/lobbies/:id', async (req, res) => {
        const lobbyId = req.params.id;
        const lobby = await Lobby.findOne({ url: `${lobbyId}` }).populate('users');
        if (!lobby) {
            res.status(404).send("Lobby not found");
            return;
        }
        var addedUser = undefined;

        const cookie = req.cookies[`${lobbyId}/user`];
        if (!cookie) {
            // create a new user and add them to the lobby
            const newUser = new User({ lobby: lobby._id, username: await generateRandomUsername() });
            await newUser.save();
            lobby.users.push(newUser);
            res.cookie(`${lobbyId}/user`, newUser.username, { maxAge: 60 * 60 * 24 * 7, isHttpOnly: false });
            addedUser = newUser.username;
        }
        await lobby.save();
        res.json({ lobby: lobby, addedUser: addedUser });
    });

    // Route to remove a user's cookie.
    server.get('/api/lobbies/:id/user/leave', async (req, res) => {
        res.clearCookie(`${req.params.id}/user`).send();
    });

    server.get('*', (req, res) => {
        return handle(req, res);
    });

});