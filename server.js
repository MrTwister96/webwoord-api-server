import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";

const app = express();
const server = createServer(app);

app.use(cors());

// Start Socket.IO
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
    },
});

const streams = [
    {
        streamer: "EG Kerk Maranata",
        speaker: "Ds Willie Olivier",
        description: "Die Nagmal - 1 Kor 11:27",
        listeners: 39,
    },
    {
        streamer: "EG Kerk Pretoria Oos",
        speaker: "Ds Andre Bester",
        description: "Verbly jouself - Fil 4:4",
        listeners: 27,
    },
    {
        streamer: "EG Kerk Benoni",
        speaker: "Ds Gerhard Beukes",
        description: "Die Wonderlike Skepping - Gen 1",
        listeners: 32,
    },
    {
        streamer: "EG Kerk Kempton Park",
        speaker: "Ds Paul Grobbelaar",
        description: "Loof die Here - Ps 102",
        listeners: 18,
    },
    {
        streamer: "EG Kerk Wonderboom",
        speaker: "Ds Jurgens Prinsloo",
        description: "Die Here is my Herder - Ps 23",
        listeners: 22,
    },
];

io.on("connection", (socket) => {
    console.log(`${socket.id} Connected`);

    socket.emit("all-streams", streams);

    socket.on("disconnect", (reason) => {
        console.log(`${socket.id} Disconnected. Reason: ${reason}`);
    });
});

// Start HTTP Server
const PORT = process.env.EXPRESS_PORT || 5000;
server.listen(PORT, () => {
    console.log(`SERVER STARTED ON ${PORT}`);
});
