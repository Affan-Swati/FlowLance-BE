import axios from 'axios';
import FormData from 'form-data';
import crypto from 'crypto';
import mongoose from 'mongoose';

// GridFS bucket (initialized lazily after mongoose connects)
let bucket;
const getBucket = () => {
    if (!bucket) {
        bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
            bucketName: 'resumes'
        });
    }
    return bucket;
};

export const processResume = async (req, res) => {
    try {
        const userId = req.user.id;
        const file = req.file;

        if (!file) {
            return res.status(400).json({
                success: false,
                error: "No resume file provided."
            });
        }

        const resumeId = crypto.randomUUID();

        // 1. Store the raw PDF in GridFS
        const bucket = getBucket();
        const uploadStream = bucket.openUploadStream(file.originalname, {
            metadata: {
                user_id: userId.toString(),
                resume_id: resumeId,
                mimetype: file.mimetype,
                originalname: file.originalname
            }
        });

        await new Promise((resolve, reject) => {
            uploadStream.end(file.buffer, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        const gridfsFileId = uploadStream.id;

        // 2. Forward to Python AI microservice for RAG ingestion
        const form = new FormData();
        form.append('user_id', userId.toString());
        form.append('resume_id', resumeId);
        form.append('file', file.buffer, {
            filename: file.originalname,
            contentType: file.mimetype,
        });

        console.log(`🚀 Forwarding resume ${resumeId} for user ${userId} to AI microservice...`);

        const aiEndpoint = `${process.env.AI_SERVICE_URL}/api/agents/resume/process`;

        const pythonResponse = await axios.post(aiEndpoint, form, {
            headers: { ...form.getHeaders() },
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });

        // 3. Store metadata (gridfs file id, original name, resume_id) in freelancer_profiles
        await mongoose.connection.db.collection('freelancer_profiles').updateOne(
            { user_id: userId.toString(), resume_id: resumeId },
            {
                $set: {
                    gridfs_file_id: gridfsFileId,
                    originalname: file.originalname,
                    createdAt: new Date()
                }
            },
            { upsert: false } // Python already upserted this doc
        );

        return res.status(200).json({
            success: true,
            message: "Resume processed and RAG ingestion complete.",
            resumeId: resumeId,
            data: pythonResponse.data
        });

    } catch (error) {
        console.error("❌ AI Microservice Error:", error.response?.data || error.message);
        return res.status(500).json({
            success: false,
            error: "AI Microservice failed to process resume.",
            details: error.response?.data || error.message
        });
    }
};

export const deleteResume = async (req, res) => {
    try {
        const userId = req.user.id;
        const resumeId = req.params.resumeId;

        console.log(`🗑️ Requesting deletion of resume ${resumeId} for user ${userId}...`);

        // 1. Find the GridFS file id before deleting the profile doc
        const profileDoc = await mongoose.connection.db
            .collection('freelancer_profiles')
            .findOne({ user_id: userId.toString(), resume_id: resumeId });

        if (profileDoc?.gridfs_file_id) {
            try {
                const bucket = getBucket();
                await bucket.delete(profileDoc.gridfs_file_id);
                console.log(`✅ Deleted GridFS file ${profileDoc.gridfs_file_id}`);
            } catch (gridErr) {
                console.warn(`⚠️ GridFS delete warning: ${gridErr.message}`);
            }
        }

        // 2. Forward DELETE to Python microservice (deletes vectors + profile doc)
        const aiEndpoint = `${process.env.AI_SERVICE_URL}/api/agents/resume/${resumeId}?user_id=${userId}`;
        const pythonResponse = await axios.delete(aiEndpoint);

        return res.status(200).json({
            success: true,
            message: "Resume successfully deleted.",
            data: pythonResponse.data
        });

    } catch (error) {
        console.error("❌ AI Microservice Delete Error:", error.response?.data || error.message);
        return res.status(500).json({
            success: false,
            error: "AI Microservice failed to delete resume.",
            details: error.response?.data || error.message
        });
    }
};

export const getUserResumes = async (req, res) => {
    try {
        const userId = req.user.id;

        const resumes = await mongoose.connection.db
            .collection('freelancer_profiles')
            .find({ user_id: userId.toString() })
            .project({ resume_id: 1, originalname: 1, "resume_data.name": 1, createdAt: 1 })
            .toArray();

        const formattedResumes = resumes.map(r => ({
            resumeId: r.resume_id,
            filename: r.originalname || r.resume_data?.name || "Uploaded Resume",
            uploadedAt: r.createdAt || new Date()
        }));

        return res.status(200).json({
            success: true,
            resumes: formattedResumes
        });
    } catch (error) {
        console.error("❌ Error fetching resumes:", error);
        return res.status(500).json({ success: false, error: "Failed to fetch resumes." });
    }
};

export const viewResume = async (req, res) => {
    try {
        const userId = req.user.id;
        const resumeId = req.params.resumeId;

        // Find the profile doc to get gridfs_file_id
        const profileDoc = await mongoose.connection.db
            .collection('freelancer_profiles')
            .findOne({ user_id: userId.toString(), resume_id: resumeId });

        if (!profileDoc || !profileDoc.gridfs_file_id) {
            return res.status(404).json({ success: false, error: "Resume file not found." });
        }

        const bucket = getBucket();
        const fileId = profileDoc.gridfs_file_id;

        // Stream the PDF back to the client
        const downloadStream = bucket.openDownloadStream(fileId);

        res.set('Content-Type', 'application/pdf');
        res.set('Content-Disposition', `inline; filename="${profileDoc.originalname || 'resume.pdf'}"`);

        downloadStream.on('error', (err) => {
            console.error("GridFS stream error:", err);
            if (!res.headersSent) {
                res.status(404).json({ success: false, error: "File not found in storage." });
            }
        });

        downloadStream.pipe(res);

    } catch (error) {
        console.error("❌ Error viewing resume:", error);
        return res.status(500).json({ success: false, error: "Failed to retrieve resume file." });
    }
};