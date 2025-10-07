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

router.post(
  "/update",
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
      const { Client, projectName, oldClient, oldProjectName, oldLogo, oldBackground, oldSmallBackground, oldScreens, oldVisualization } = req.body;
      console.log(Client, projectName, oldClient, oldProjectName, oldLogo, oldBackground, oldSmallBackground, oldScreens, oldVisualization)

      if (!Client || !projectName) {
        return res.status(400).json({ message: "Missing Client or projectName" });
      }

      const baseDir = path.join(process.cwd(), "uploads", "projects");
      const effectiveOldClient = oldClient || Client;
      const effectiveOldProjectName = oldProjectName || projectName;
      const oldFolder = path.join(baseDir, effectiveOldClient, effectiveOldProjectName);
      const newFolder = path.join(baseDir, Client, projectName);

      // Jeśli nazwa folderu się zmieniła (Client lub projectName), przenieś zawartość starego folderu do nowego
      if (oldFolder !== newFolder && fs.existsSync(oldFolder)) {
        // Multer już stworzył nowy folder i wrzucił tam nowe pliki (jeśli jakieś są)
        if (!fs.existsSync(newFolder)) {
          fs.mkdirSync(newFolder, { recursive: true });
        }

        // Przenieś pliki ze starego folderu do nowego, obsługując ewentualne konflikty nazw (zachowaj nowe pliki, usuń stare jeśli konflikt)
        const files = fs.readdirSync(oldFolder);
        for (const file of files) {
          const oldPath = path.join(oldFolder, file);
          const newPath = path.join(newFolder, file);
          if (fs.existsSync(newPath)) {
            // Konflikt: usuń stary plik (zakładamy, że nowy jest aktualny/zastępczy)
            fs.unlinkSync(oldPath);
          } else {
            // Przenieś plik
            fs.renameSync(oldPath, newPath);
          }
        }

        // Usuń stary folder (powinien być pusty po przeniesieniu)
        fs.rmSync(oldFolder, { recursive: true, force: true });
      }

      // Usuń stare pliki, jeśli podane (zastępowane)
      const deleteOldFile = (folder, oldFileName) => {
        if (oldFileName) {
          // Oczyść oldFileName do czystej nazwy pliku (usuń ewentualne prefiksy/ścieżki)
          oldFileName = path.basename(oldFileName);
          const oldPath = path.join(folder, oldFileName);
          console.log(`Trying to delete old file: ${oldPath}`);  // Debug log - usuń po testach
          if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath);
            console.log(`Deleted: ${oldPath}`);  // Debug
          } else {
            console.log(`File not found, skipped: ${oldPath}`);  // Debug
          }
        }
      };

      deleteOldFile(newFolder, oldLogo);
      deleteOldFile(newFolder, oldBackground);
      deleteOldFile(newFolder, oldSmallBackground);

      const parsedOldScreens = oldScreens ? JSON.parse(oldScreens) : [];
      parsedOldScreens.forEach(oldFileName => deleteOldFile(newFolder, oldFileName));

      const parsedOldVis = oldVisualization ? JSON.parse(oldVisualization) : [];
      parsedOldVis.forEach(oldFileName => deleteOldFile(newFolder, oldFileName));

      const basePath = path.join("uploads", "projects", Client, projectName);

      const mapFiles = (arr) =>
        arr?.map((file) => path.join(basePath, file.filename)) || [];

      const screens = mapFiles(req.files.screens);
      const visualization = mapFiles(req.files.visualization);
      const logo = req.files.logo ? path.join(basePath, req.files.logo[0].filename) : null;
      const background = req.files.background ? path.join(basePath, req.files.background[0].filename) : null;
      const smallBackground = req.files.smallBackground ? path.join(basePath, req.files.smallBackground[0].filename) : null;

      res.status(200).json({
        message: "Files updated successfully",
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
      console.error("Update error:", err);
      res.status(500).json({ message: "Server error during file update", details: err.message });
    }
  }
);

router.post(
  "/rename-folder",
  authenticateApiKey,
  async (req, res) => {
    try {
      const { Client, projectName, oldClient, oldProjectName } = req.body;

      if (!Client || !projectName) {
        return res.status(400).json({ message: "Missing Client or projectName" });
      }

      const baseDir = path.join(process.cwd(), "uploads", "projects");
      const effectiveOldClient = oldClient || Client;
      const effectiveOldProjectName = oldProjectName || projectName;
      const oldFolder = path.join(baseDir, effectiveOldClient, effectiveOldProjectName);
      const newFolder = path.join(baseDir, Client, projectName);

      if (oldFolder !== newFolder) {
        if (!fs.existsSync(oldFolder)) {
          return res.status(404).json({ message: "Old folder not found" });
        }

        if (fs.existsSync(newFolder)) {
          return res.status(409).json({ message: "New folder already exists" });
        }

        fs.renameSync(oldFolder, newFolder);
      }

      res.status(200).json({
        message: "Folder renamed successfully",
        Client,
        projectName,
      });
    } catch (err) {
      console.error("Rename error:", err);
      res.status(500).json({ message: "Server error during folder rename", details: err.message });
    }
  }
);

export default router;