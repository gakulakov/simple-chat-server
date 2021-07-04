const express = require("express");
const app = require("express")();
const cors = require('cors')
const server = require("http").createServer(app);
const io = require("socket.io")(server, {
    cors: {
        origin: "https://simple-chat-tawny.vercel.app",
        credentials: true
    }
});


const rooms = new Map()

app.use(cors())

app.use(express.json()) // Указываю, что серверное приложение может принимать json-данные

app.use(function (req, res, next) {

    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', 'https://simple-chat-tawny.vercel.app');

    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', true);

    // Pass to next layer of middleware
    next();
});


app.get('/rooms/:id', (req, res) => {
    const {id: roomId} = req.params
    const obj = rooms.has(roomId)
        ? {
            users: [...rooms.get(roomId).get('users').values()],
            messages: [...rooms.get(roomId).get('messages').values()]
        }
        : {users: [], messages: []}

    res.json(obj)
})

app.post('/rooms', (req, res) => {
    const {roomId, userName} = req.body;
    if (!rooms.has(roomId)) {
        rooms.set(roomId, new Map([
                ['users', new Map()],
                ['messages', []]
            ])
        )
    }
    res.json([...rooms.values()]);
})

io.on('connection', socket => {
    socket.on('ROOM: JOIN', (data) => {
        console.log(data)
        socket.join(data.roomId)
        rooms.get(data.roomId).get('users').set(socket.id, data.userName)
        const users = [...rooms.get(data.roomId).get('users').values()];

        socket.to(data.roomId).emit('ROOM: SET_USERS', users)
    })

    socket.on('ROOM: NEW_MESSAGE', ({roomId, userName, text}) => {
        const obj = {
            userName,
            text
        }


        rooms.get(roomId).get('messages').push(obj)

        socket.broadcast.to(roomId).emit('ROOM: NEW_MESSAGE', obj)
    })

    socket.on('disconnect', () => {
        rooms.forEach((value, roomId) => {
            if (value.get('users').delete(socket.id)) {
                const users = [...value.get('users').values()];

                socket.broadcast.to(roomId).emit('ROOM: SET_USERS', users)
            }
        })
    })
    console.log('User connected', socket.id)
})


server.listen(8888, (err) => {
    if (err) throw Error(err)
    console.log('Server has been started!')
})