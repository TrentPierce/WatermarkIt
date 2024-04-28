const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const ffmpegPath = path.join(__dirname, 'node_modules', 'ffmpeg-static', 'ffmpeg');
const fs = require('fs');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfmpegPath(ffmpegPath);

const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(cors());

// Set up Multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads');
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
});

const upload = multer({ storage: storage });

// Endpoint to handle file uploads and return the watermarked media URL
app.post('/upload', upload.fields([{ name: 'file', maxCount: 1 }, { name: 'watermark', maxCount: 1 }]), (req, res) => {
    const uploadedFile = req.files['file'][0];
    const watermarkFile = req.files['watermark'] ? req.files['watermark'][0] : null;

    if (!uploadedFile) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const originalFilePath = uploadedFile.path;
    const watermarkedFileName = path.basename(originalFilePath, path.extname(originalFilePath)) + '_watermarked.mp4';
    const watermarkedFilePath = path.join('uploads', watermarkedFileName);

    console.log('Original file path:', originalFilePath);
    console.log('Watermark file path:', watermarkFile ? watermarkFile.path : 'No watermark file provided');

    // Apply watermark using ffmpeg
    const command = ffmpeg()
        .input(originalFilePath)
        .input(watermarkFile.path) // Input watermark file
        .complexFilter('[0:v][1:v]overlay=10:10') // Overlay watermark onto video
        .output(watermarkedFilePath) // Output watermarked video file
        .on('start', (commandLine) => {
            console.log('ffmpeg command:', commandLine);
        })
        .on('progress', (progress) => {
            // Send progress updates to the client
            res.write(`data: ${Math.floor(progress.percent)}\n\n`);
        })
        .on('end', () => {
            // Finish the SSE connection
            res.write(`data: 100\n\n`);
            res.write(`data: ${watermarkedFileName}\n\n`); // Provide the filename to the client
            res.end();
        })
        .on('error', (err, stdout, stderr) => {
            console.error('Error applying watermark:', err);
            console.error('ffmpeg stdout:', stdout);
            console.error('ffmpeg stderr:', stderr);
            res.status(500).json({ error: 'Error applying watermark' });
        })
        .run();
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
