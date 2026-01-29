import express, { type Application, type Request, type Response } from 'express';
import cors from 'cors';

const app: Application = express();

const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/', (req: Request, res: Response) => {
  res.send('FoodHub API is running! 🍱');
});


app.listen(PORT, () => {
  console.log(`Server is running on ${PORT}`);
});

export default app;