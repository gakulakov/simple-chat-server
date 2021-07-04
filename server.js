const express = require("express");
const app = require("express")();
const server = require("http").createServer(app);
const io = require("socket.io")(server, {
    cors: {
        origin: "http://localhost:3000",
        credentials: true
    }
});


const rooms = new Map()


app.use(express.json()) // Указываю, что серверное приложение может принимать json-данные


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