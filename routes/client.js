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

export default router;
