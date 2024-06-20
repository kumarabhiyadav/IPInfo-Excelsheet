// Example using import syntax in ES module
import express from 'express';
import path from 'path';

const app = express();
const port = process.env.PORT || 5000;

// Serve static files from the build folder
app.use(express.static(path.join(__dirname, 'build')));

// Handle GET requests to serve the index.html file
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
