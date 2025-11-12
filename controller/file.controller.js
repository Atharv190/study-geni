import User from "../model/user.model.js";
import File from "../model/file.model.js";
import cloudinary from "../config/cloud.js";
import streamifier from "streamifier";
import pdfParse from "pdf2json";

export const uploadFile = async (req, res) => {
  try {
    const user = req.user;

    
    if (user.role !== "teacher") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only teachers can upload files.",
      });
    }

    const teacherId = user.id; 
    const { title, description, subject } = req.body;

    if (!title || !subject || !req.file) {
      return res.status(400).json({
        success: false,
        message: "Title, subject, and file are required",
      });
    }

    let extractedText = "";
    if (req.file.mimetype === "application/pdf") {
      try {
        const data = await pdfParse(req.file.buffer);
        extractedText = data.text;
      } catch (err) {
        console.error("PDF text extraction failed:", err.message);
      }
    }

    const resourceType =
      req.file.mimetype === "application/pdf" ? "raw" : "auto";
    const bufferStream = streamifier.createReadStream(req.file.buffer);

    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: resourceType,
          folder: "studygeni_files",
          use_filename: true,
          unique_filename: false,
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      bufferStream.pipe(uploadStream);
    });

    const file = await File.create({
      title,
      description,
      subject,
      fileUrl: result.secure_url,
      createdBy: teacherId,
      extractedText,
    });

    res.status(201).json({
      success: true,
      message: "File uploaded successfully",
      file,
    });
  } catch (err) {
    console.error("Upload file error:", err);
    res.status(500).json({
      success: false,
      message: "Server error while uploading file",
      error: err.message,
    });
  }
};


export const getAllFiles = async (req, res) => {
  try {
    const files = await File.find()
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: files.length,
      files,
    });
  } catch (err) {
    console.error("Get files error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


export const getFileById = async (req, res) => {
  try {
    const file = await File.findById(req.params.id).populate(
      "createdBy",
      "name email"
    );

    if (!file) {
      return res.status(404).json({
        success: false,
        message: "File not found",
      });
    }

    res.status(200).json({
      success: true,
      file,
    });
  } catch (err) {
    console.error("Get file error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
