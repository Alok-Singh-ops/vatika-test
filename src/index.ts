


import express, { Request, Response } from 'express';
import cron from 'node-cron';
import axios from 'axios';
import dotenv from 'dotenv';
import cors from "cors"
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

type DataType = any; 
let cachedData: DataType = null;



const BASE_URL = process.env.BASE_URL;
const API_KEY = process.env.API_KEY;
// const DATASETS_ENDPOINT = `${BASE_URL}/datasets?page=1&size=12&sourceOrg=%5B%225fa2a8ef-b9ea-46d6-b2ce-400c331d641e%22%5D&sort=name%3AASC`;




// Helper function to fetch and cache data (used by cron and manual trigger)
async function fetchAndCacheData(page = 1, size = 12, cache = true) {
	try {
		const endpoint = `${BASE_URL}/datasets?page=${page}&size=${size}&sourceOrg=%5B%225fa2a8ef-b9ea-46d6-b2ce-400c331d641e%22%5D&sort=name%3AASC`;
		const response = await axios.get(endpoint, {
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
	} catch (error) {
		console.error('Error fetching data:', error);
		let errorMsg = 'Unknown error';
		if (error && typeof error === 'object' && 'message' in error) {
			errorMsg = (error as any).message;
		} else if (typeof error === 'string') {
			errorMsg = error;
		}
		return { success: false, error: errorMsg };
	}
}


// Schedule a cron job to fetch data every day at 2am
cron.schedule('0 2 * * *', () => fetchAndCacheData());

app.post('/fetch-now', async (req: Request, res: Response) => {
	const result = await fetchAndCacheData();
	if (result.success) {
		res.json({ success: true, message: 'Data fetched and cached successfully.', data: result.data });
	} else {
		res.status(500).json({ success: false, message: 'Failed to fetch data.', error: result.error });
	}
});


app.get('/data', async (req: Request, res: Response) => {
	const page = parseInt(req.query.page as string) || 1;
	const size = parseInt(req.query.size as string) || 12;

	
	if (page === 1 && size === 12 && cachedData) {
		res.json({ success: true, data: cachedData });
		return;
	}


	const result = await fetchAndCacheData(page, size, false);
	if (result.success) {
		res.json({ success: true, data: result.data });
	} else {
		res.status(503).json({ success: false, message: 'Failed to fetch data.', error: result.error });
	}
});

// GET API to send the cached data to the client
app.get('/data', (req: Request, res: Response) => {
	if (cachedData) {
		res.json({ success: true, data: cachedData });
	} else {
		res.status(503).json({ success: false, message: 'Data not available yet. Please try after 2am.' });
	}
});

app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
});


