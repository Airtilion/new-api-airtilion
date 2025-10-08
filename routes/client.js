// routes/clients.js

import { Router } from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import authenticateApiKey from "../middleware/authenticateApiKey.js";

const router = Router();

// multer storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const { user } = req.body;
    if (!user) {
      return cb(new Error('Missing user data'), false);
    }
    const clientFolder = path.join(process.cwd(), "uploads", "clients", user);
    if (!fs.existsSync(clientFolder)) {
      fs.mkdirSync(clientFolder, { recursive: true });
    }
    cb(null, clientFolder);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage });

router.post(
  "/",
  authenticateApiKey,
  upload.fields([
    { name: "logo", maxCount: 1 },
    { name: "background", maxCount: 1 },
    { name: "icon", maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const { user } = req.body;
      if (!user) {
        return res.status(400).json({ message: "Missing user data" });
      }

      const logoFileObj       = req.files.logo?.[0]       || null;
      const backgroundFileObj = req.files.background?.[0] || null;
      const iconFileObj       = req.files.icon?.[0]       || null;

      if (!logoFileObj || !backgroundFileObj || !iconFileObj) {
        return res
          .status(400)
          .json({ message: "Logo, background or icon file missing" });
      }

      // build relative paths
      const baseUploadPath = path.join("uploads", "clients", user);
      const logoPath       = path.join(baseUploadPath, logoFileObj.filename);
      const backgroundPath = path.join(baseUploadPath, backgroundFileObj.filename);
      const iconPath       = path.join(baseUploadPath, iconFileObj.filename);

      console.log("Logo saved to:      ", logoPath);
      console.log("Background saved to:", backgroundPath);
      console.log("Icon saved to:      ", iconPath);

      res.status(200).json({
        message: "Files uploaded successfully",
        files: {
          logo:       logoPath,
          background: backgroundPath,
          icon:       iconPath
        }
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Error processing client upload" });
    }
  }
);

router.post("/update", authenticateApiKey,
  
  upload.fields([
    { name: "logo", maxCount: 1 },
    { name: "background", maxCount: 1 },
    { name: "icon", maxCount: 1 },
  ]),

  async (req, res) => {
    try {
      const { Client, oldLogo, oldBackground, oldIcon } = req.body;

      if (!Client) {
        return res.status(400).json({ message: "Missing Client" });
      }

      const baseDir = path.join(process.cwd(), "uploads", "clients");
      const folder = path.join(baseDir, Client);

      // Zakładamy, że folder już istnieje lub Multer go stworzył
      if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder, { recursive: true });
      }

      // Usuń stare pliki, jeśli podane (zastępowane)
      const deleteOldFile = (folder, oldFileName) => {
        if (oldFileName) {
          oldFileName = path.basename(oldFileName);
          const oldPath = path.join(folder, oldFileName);
          console.log(`Trying to delete old file: ${oldPath}`); 
          if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath);
            console.log(`Deleted: ${oldPath}`);
          } else {
            console.log(`File not found, skipped: ${oldPath}`);
          }
        }
      };

      deleteOldFile(folder, oldLogo);
      deleteOldFile(folder, oldBackground);
      deleteOldFile(folder, oldIcon);

      const basePath = path.join("uploads", "clients", Client);

      const logo = req.files.logo ? path.join(basePath, req.files.logo[0].filename) : null;
      const background = req.files.background ? path.join(basePath, req.files.background[0].filename) : null;
      const icon = req.files.icon ? path.join(basePath, req.files.icon[0].filename) : null;

      res.status(200).json({
        message: "Files updated successfully",
        Client,
        files: {
          logo,
          background,
          icon,
        },
      });
    } catch (err) {
      console.error("Update error:", err);
      res.status(500).json({ message: "Server error during file update", details: err.message });
    }
  }
);

export default router;
