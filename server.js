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
const port = 8080;

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
app.post('/upload', upload.single('file'), (req, res) => {
    const uploadedFile = req.file;
    const watermarkText = req.body.watermarkText;

    if (!uploadedFile) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const originalFilePath = uploadedFile.path;
    const watermarkedFileName = path.basename(originalFilePath, path.extname(originalFilePath)) + '_watermarked.mp4';
    const watermarkedFilePath = path.join('uploads', watermarkedFileName);

    console.log('Original file path:', originalFilePath);
    console.log('Watermark text:', watermarkText);

    // Apply watermark using ffmpeg
    ffmpeg()
        .input(originalFilePath)
        .complexFilter(`[0:v]drawtext=text='${watermarkText}':x=W-tw-10:y=H-th-10:fontcolor=white@0.5:fontsize=24`)
        .output(watermarkedFilePath)
        .on('start', (commandLine) => {
            console.log('ffmpeg command:', commandLine);
        })
        .on('end', () => {
            const watermarkedMediaUrl = `http://localhost:8080/${watermarkedFilePath}`;
            res.json({ url: watermarkedMediaUrl });
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
