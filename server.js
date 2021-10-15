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
    const socketId = req.query.socketId;

    let canPublish = false;
    if (host === "true") {
        canPublish = true;
    }

    console.log(`${identity} - CAN PUB - ${canPublish}`);

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

    const streamExist = streams.find((s) => s.room === roomName);

    if (streamExist === undefined) {
        const newStream = {
            host: socketId,
            room: roomName,
            streamer: roomName,
            speaker: identity,
            description: "Placeholder",
            listeners: "Placeholder",
            participants: [],
        };

        streams.push(newStream);

        io.emit("all-streams", streams);
    }

    console.log(streams);

    // console.log(streamExist);

    // updateStreams();

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
    socket.emit("all-streams", streams);
    console.log(`${socket.id} Connected`);

    socket.on("disconnect", (reason) => {
        cleanRooms(socket);
        console.log(`${socket.id} Disconnected. Reason: ${reason}`);
    });

    socket.on("join-room", (roomName) => {
        console.log(streams);

        const stream = streams.find((s) => s.room === roomName);

        const newParticipants = [socket.id, ...stream.participants];

        const newStream = {
            ...stream,
            participants: newParticipants,
        };

        const filterStreams = streams.filter((s) => s.room !== roomName);

        const newStreams = [...filterStreams, newStream];

        streams = newStreams;

        console.log(streams);
    });
});

const cleanRooms = async (socket) => {
    // console.log(socketId);
    // console.log(streams);
    const stream = streams.find((s) => s.host === socket.id);
    console.log(stream);

    if (stream) {
        const roomName = stream.room;

        stream.participants.forEach((part) => {
            io.to(part).emit("leave-room");
        });

        const newStreams = streams.filter((s) => s.room !== roomName);
        streams = newStreams;
        io.emit("all-streams", streams);

        setTimeout(() => {
            const livekitHost = "http://localhost:7880";
            // const livekitHost = "http://192.168.0.114:7880";
            const svc = new RoomServiceClient(
                livekitHost,
                LKAPIKEY,
                LKAPISECRET
            );

            svc.deleteRoom(roomName).then(() => {
                console.log("Stream Deleted");
            });
        }, 5000);
    }
};

// Start HTTP Server
const PORT = process.env.EXPRESS_PORT || 5001;
server.listen(PORT, () => {
    console.log(`SERVER STARTED ON ${PORT}`);
});
