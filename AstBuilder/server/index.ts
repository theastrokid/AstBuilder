import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '5000', 10);
const isDevelopment = process.env.NODE_ENV === 'development';

const clientDistPath = join(__dirname, '..', 'dist', 'client');
const publicPath = join(__dirname, '..');
const clientPath = isDevelopment ? publicPath : clientDistPath;

app.use(express.static(clientPath));

app.use('/data', express.static(join(publicPath, 'data')));
app.use('/images', express.static(join(publicPath, 'images')));
app.use('/videos', express.static(join(publicPath, 'videos')));
app.use('/attached_assets', express.static(join(publicPath, 'attached_assets')));

app.get('/healthz', (req, res) => {
  res.status(200).send('OK');
});

app.use((req, res) => {
  res.sendFile(join(clientPath, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
