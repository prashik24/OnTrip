import multer from "multer";

const storage = multer.memoryStorage();

function fileFilter(req, file, cb) {
  const allowedMimeTypes = [
    // images
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",

    // videos
    "video/mp4",
    "video/webm",
    "video/quicktime",
  ];

  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(new Error("Only image and video files are allowed"), false);
  }

  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 25 * 1024 * 1024,
  },
});

export default upload;