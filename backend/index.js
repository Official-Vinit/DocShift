import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();
import conversionRoutes from "./routes/conversionRoutes.js";
import multer from "multer";
import helmet from "helmet";

const app = express();
app.use(helmet());

const allowedOrigins = (process.env.FRONTEND_ORIGINS || "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
app.use(
    cors({
        origin: (origin, callback) => {
            // Requests without an Origin header include tools such as curl.
            if (!origin || allowedOrigins.includes(origin)) {
                return callback(null, true);
            }

            return callback(new Error("This origin is not allowed by CORS."));
        },
    })
);


app.use(express.json());

app.use("/api/conversions", conversionRoutes);

app.get("/api/health", (req, res) => {
    res.status(200).json({ message: "API is healthy" });
});

app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        const message =
            error.code === "LIMIT_FILE_SIZE"
                ? "The file must be 20 MB or smaller."
                : error.message;

        return res.status(400).json({ message });
    }

    if (error.message === "Upload a PDF or DOCX file.") {
        return res.status(400).json({ message: error.message });
    }

    const detail =
        error.response?.data?.message ||
        error.message ||
        "Unknown conversion error";

    console.error("Conversion error:", error.response?.data ?? error.stack ?? error);

    return res.status(500).json({
        message:
            process.env.NODE_ENV === "production"
                ? "Conversion failed. Please try again."
                : detail,
    });
});

async function startServer() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to MongoDB");
        const port = process.env.PORT || 5000;
        app.listen(port, () => {
            console.log(`Server is running on port ${port}`);
        });
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
        process.exit(1);
    }
}

startServer();
