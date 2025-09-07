"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const node_cron_1 = __importDefault(require("node-cron"));
const axios_1 = __importDefault(require("axios"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
let cachedData = null;
const BASE_URL = process.env.BASE_URL;
const API_KEY = process.env.API_KEY;
// const DATASETS_ENDPOINT = `${BASE_URL}/datasets?page=1&size=12&sourceOrg=%5B%225fa2a8ef-b9ea-46d6-b2ce-400c331d641e%22%5D&sort=name%3AASC`;
// Helper function to fetch and cache data (used by cron and manual trigger)
function fetchAndCacheData(page = 1, size = 12, cache = true) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const endpoint = `${BASE_URL}/datasets?page=${page}&size=${size}&sourceOrg=%5B%225fa2a8ef-b9ea-46d6-b2ce-400c331d641e%22%5D&sort=name%3AASC`;
            const response = yield axios_1.default.get(endpoint, {
                headers: {
                    'accept': 'application/json, text/plain, */*',
                    'accept-language': 'en-GB,en;q=0.6',
                    'cache-control': 'no-cache',
                    'x-api-key': API_KEY,
                },
            });
            if (cache) {
                cachedData = response.data;
            }
            console.log('Data fetched:', response.data);
            return { success: true, data: response.data };
        }
        catch (error) {
            console.error('Error fetching data:', error);
            let errorMsg = 'Unknown error';
            if (error && typeof error === 'object' && 'message' in error) {
                errorMsg = error.message;
            }
            else if (typeof error === 'string') {
                errorMsg = error;
            }
            return { success: false, error: errorMsg };
        }
    });
}
// Schedule a cron job to fetch data every day at 2am
node_cron_1.default.schedule('0 2 * * *', () => fetchAndCacheData());
app.post('/fetch-now', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield fetchAndCacheData();
    if (result.success) {
        res.json({ success: true, message: 'Data fetched and cached successfully.', data: result.data });
    }
    else {
        res.status(500).json({ success: false, message: 'Failed to fetch data.', error: result.error });
    }
}));
app.get('/data', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const page = parseInt(req.query.page) || 1;
    const size = parseInt(req.query.size) || 12;
    if (page === 1 && size === 12 && cachedData) {
        res.json({ success: true, data: cachedData });
        return;
    }
    const result = yield fetchAndCacheData(page, size, false);
    if (result.success) {
        res.json({ success: true, data: result.data });
    }
    else {
        res.status(503).json({ success: false, message: 'Failed to fetch data.', error: result.error });
    }
}));
// GET API to send the cached data to the client
app.get('/data', (req, res) => {
    if (cachedData) {
        res.json({ success: true, data: cachedData });
    }
    else {
        res.status(503).json({ success: false, message: 'Data not available yet. Please try after 2am.' });
    }
});
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
