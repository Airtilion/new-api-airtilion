import { Router } from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import authenticateApiKey from "../middleware/authenticateApiKey.js";

const router = Router();

// Konfiguracja multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const { Client, projectName } = req.body;
    if (!Client || !projectName) {
      return cb(new Error("Brak Client lub projectName"), false);
    }

    const projectFolder = path.join(
      process.cwd(),
      "uploads",
      "projects",
      Client,
      projectName
    );

    if (!fs.existsSync(projectFolder)) {
      fs.mkdirSync(projectFolder, { recursive: true });
    }

    cb(null, projectFolder);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

router.post(
  "/",
  authenticateApiKey,
  upload.fields([
    { name: "screens", maxCount: 10 },
    { name: "visualization", maxCount: 10 },
    { name: "logo", maxCount: 1 },
    { name: "background", maxCount: 1 },
    { name: "smallBackground", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const { Client, projectName } = req.body;

      if (!Client || !projectName) {
        return res.status(400).json({ message: "Missing Client or projectName" });
      }

      const basePath = path.join("uploads", "projects", Client, projectName);

      const mapFiles = (arr) =>
        arr?.map((file) => path.join(basePath, file.filename)) || [];

      const screens = mapFiles(req.files.screens);
      const visualization = mapFiles(req.files.visualization);
      const logo = req.files.logo ? path.join(basePath, req.files.logo[0].filename) : null;
      const background = req.files.background ? path.join(basePath, req.files.background[0].filename) : null;
      const smallBackground = req.files.smallBackground ? path.join(basePath, req.files.smallBackground[0].filename) : null;

      res.status(200).json({
        message: "Files uploaded successfully",
        Client,
        files: {
          logo,
          background,
          smallBackground,
          screens,
          visualization,
        },
      });
    } catch (err) {
      console.error("Upload error:", err);
      res.status(500).json({ message: "Server error during file upload" });
    }
  }
);

export default router;
