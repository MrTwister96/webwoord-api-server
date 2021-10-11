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
    const identity = req.query.identity;
    const host = req.query.host;

    const canPublish = host ? true : false;

    const accessParams = {
        identity: identity,
    };

    const at = new AccessToken(LKAPIKEY, LKAPISECRET, accessParams);
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

let streams = [];

io.on("connection", (socket) => {
    const livekitHost = "http://192.168.0.114:7880";
    const svc = new RoomServiceClient(livekitHost, LKAPIKEY, LKAPISECRET);

    // list rooms
    svc.listRooms().then((rooms) => {
        rooms.map((room) => {
            const stream = {
                streamer: room.name,
                speaker: "Placeholder",
                description: "Placeholder",
                listeners: "Placeholder",
            };

            const newStreams = streams.filter((s) => s.streamer !== room.name);
            streams = [...newStreams, stream];
        });
        console.log("existing rooms", rooms);
    });

    socket.emit("all-streams", streams);

    console.log(`${socket.id} Connected`);

    socket.on("disconnect", (reason) => {
        console.log(`${socket.id} Disconnected. Reason: ${reason}`);
    });
});

// Start HTTP Server
const PORT = process.env.EXPRESS_PORT || 5001;
server.listen(PORT, () => {
    console.log(`SERVER STARTED ON ${PORT}`);
});
