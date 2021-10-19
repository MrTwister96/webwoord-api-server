import { createServer } from "http";
import { Server } from "socket.io";
import { RoomServiceClient, AccessToken } from "livekit-server-sdk";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

const LIVEKIT_SERVER = process.env.LIVEKIT_SERVER;
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEIT_API_SECRET = process.env.LIVEIT_API_SECRET;
const CORS_ORIGIN = process.env.CORS_ORIGIN.split(" ");
console.log(CORS_ORIGIN);

const app = express();
const server = createServer(app);
app.use(cors());
const io = new Server(server, {
    cors: {
        origin: CORS_ORIGIN,
        methods: ["GET", "POST"],
        allowedHeaders: ["my-custom-header"],
        credentials: true,
    },
});

app.get("/api/get-token", (req, res) => {
    const roomName = req.query.roomName;
    const identity = req.query.identity;
    const isHost = req.query.isHost;

    let canPublish;
    isHost === "true" ? (canPublish = true) : (canPublish = false);

    const at = new AccessToken(LIVEKIT_API_KEY, LIVEIT_API_SECRET, {
        identity: identity,
    });

    at.addGrant({
        roomJoin: true,
        room: roomName,
        canPublish: canPublish,
        canSubscribe: !canPublish,
    });

    const token = at.toJwt();

    if (canPublish) {
        const roomHostSocketId = req.query.roomHostSocketId;
        const prediker = req.query.prediker;
        const beskrywing = req.query.beskrywing;

        const roomExist = rooms.find((room) => room.roomName === roomName);

        if (roomExist === undefined) {
            const newRoom = {
                roomName: roomName,
                roomHost: identity,
                roomHostSocketId: roomHostSocketId,
                prediker: prediker,
                beskrywing: beskrywing,
                listenerCount: 0,
                listeners: [],
            };

            rooms.push(newRoom);

            io.emit("update-rooms", rooms);
        }
    }

    return res.send({ token: token });
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
    const room = rooms.find((room) => room.roomHostSocketId === socket.id);

    if (room) {
        room.listeners.forEach((listener) => {
            io.to(listener).emit("leave-room");
        });

        const newRooms = rooms.filter((r) => r.roomName !== room.roomName);
        rooms = newRooms;
        io.emit("update-rooms", rooms);

        setTimeout(() => {
            const svc = new RoomServiceClient(
                LIVEKIT_SERVER,
                LIVEKIT_API_KEY,
                LIVEIT_API_SECRET
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

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`SERVER STARTED ON ${PORT}`);
});
