import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import { AccessToken } from "livekit-server-sdk";
import { RoomServiceClient, Room } from "livekit-server-sdk";

const app = express();
const server = createServer(app);

app.use(cors());

const LKAPIKEY = "APIn26mHVrdLxBo";
const LKAPISECRET = "MZmJfu0DecJ23eJv7azV1iAfyerPK7LsDXpPq7f6zCdI";

app.get("/api/get-token", (req, res) => {
    const roomName = req.query.roomName;
    const roomHost = req.query.roomHost;
    const roomHostSocketId = req.query.roomHostSocketId;
    const isHost = req.query.isHost;
    const prediker = req.query.prediker;
    const beskrywing = req.query.beskrywing;

    let canPublish;
    isHost === "true" ? (canPublish = true) : (canPublish = false);

    const at = new AccessToken(LKAPIKEY, LKAPISECRET, {
        identity: roomHost,
    });

    at.addGrant({
        roomJoin: true,
        room: roomName,
        canPublish: canPublish,
        canSubscribe: !canPublish,
    });

    const token = at.toJwt();

    const roomExist = rooms.find((room) => room.roomName === roomName);

    if (roomExist === undefined) {
        const newRoom = {
            roomName: roomName,
            roomHost: roomHost,
            roomHostSocketId: roomHostSocketId,
            prediker: prediker,
            beskrywing: beskrywing,
            listenerCount: 0,
            listeners: [],
        };

        rooms.push(newRoom);

        io.emit("update-rooms", rooms);
    }

    return res.send({ token: token });
});

app.get("/api/get-listener-token", (req, res) => {
    const roomName = req.query.roomName;
    const identity = req.query.identity;
    const host = req.query.host;

    let canPublish;
    host === "true" ? (canPublish = true) : (canPublish = false);

    const at = new AccessToken(LKAPIKEY, LKAPISECRET, {
        identity: identity,
    });

    at.addGrant({
        roomJoin: true,
        room: roomName,
        canPublish: canPublish,
        canSubscribe: !canPublish,
    });

    const token = at.toJwt();

    return res.send({ token: token });
});

// Start Socket.IO
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
    },
});

let rooms = [];

io.on("connection", (socket) => {
    console.log(`${socket.id} Connected`);

    socket.emit("update-rooms", rooms);

    socket.on("disconnect", (reason) => {
        disconnectFromRoom(socket);
        cleanRooms(socket);
        console.log(`${socket.id} Disconnected. Reason: ${reason}`);
    });

    socket.on("join-room", (roomName) => {
        const room = rooms.find((room) => room.roomName === roomName);

        const newListeners = [socket.id, ...room.listeners];

        const newRoom = {
            ...room,
            listeners: newListeners,
            listenerCount: room.listenerCount + 1,
        };

        const filterRooms = rooms.filter((room) => room.roomName !== roomName);

        const newRooms = [...filterRooms, newRoom];

        rooms = newRooms;

        io.emit("update-rooms", rooms);
    });

    socket.on("show-streams", () => {
        console.log(rooms);
    });
});

const disconnectFromRoom = (socket) => {
    const room = rooms.find((room) => room.listeners.includes(socket.id));

    if (room) {
        const newListeners = room.listeners.filter(
            (listener) => listener !== socket.id
        );

        const newRoom = {
            ...room,
            listeners: newListeners,
            listenerCount: room.listenerCount - 1,
        };

        const filterRooms = rooms.filter((r) => r.roomName !== room.roomName);

        const newRooms = [...filterRooms, newRoom];

        rooms = newRooms;

        io.emit("update-rooms", rooms);
    }
};

const cleanRooms = async (socket) => {
    console.log(`Clean Rooms. Socket: ${socket.id}`);
    const room = rooms.find((room) => room.roomHostSocketId === socket.id);

    console.log(room);
    if (room) {
        room.listeners.forEach((listener) => {
            io.to(listener).emit("leave-room");
        });

        const newRooms = rooms.filter((r) => r.roomName !== room.roomName);
        rooms = newRooms;
        io.emit("update-rooms", rooms);

        setTimeout(() => {
            // const livekitHost = "http://192.168.0.119:7880";
            const livekitHost = "https://ptype.app/";
            const svc = new RoomServiceClient(
                livekitHost,
                LKAPIKEY,
                LKAPISECRET
            );

            svc.deleteRoom(room.roomName)
                .then(() => {
                    console.log("Room Deleted");
                })
                .catch((error) => {
                    console.log(error);
                });
        }, 5000);
    }
};

// Start HTTP Server
const PORT = 5001;
server.listen(PORT, () => {
    console.log(`SERVER STARTED ON ${PORT}`);
});
