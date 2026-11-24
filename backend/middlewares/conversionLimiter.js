import { rateLimit } from "express-rate-limit";

const conversionLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
        message: "Too many conversion requests. Please try again in 15 minutes.",
    },
});

export default conversionLimiter;