import Milestone from '../models/milestone.model.js';
import Gig from '../models/gig.model.js';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Helper to resolve paths in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Utility function to check milestone ownership
const checkMilestoneOwnership = async (milestoneId, userId) => {
    const milestone = await Milestone.findById(milestoneId);
    if (!milestone) return false;
    return milestone.user.toString() === userId.toString();
};

export const getMilestoneById = async (req, res) => {
    try {
        const milestone = await Milestone.findById(req.params.id);
        if (!milestone) return res.status(404).json({ message: 'Milestone not found' });

        // Check for ownership or admin role
        if (milestone.user.toString() !== req.user.id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to view this milestone' });
        }

        res.json(milestone);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const createMilestone = async (req, res) => {
    try {
        const { gigId } = req.params;
        const gig = await Gig.findById(gigId);
        if (!gig) return res.status(404).json({ message: 'Gig not found' });
        
        // Ensure the current user owns the gig
        if (gig.user.toString() !== req.user.id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to add milestones to this gig' });
        }

        const milestone = await Milestone.create({
            ...req.body,
            gig: gigId,
            user: req.user.id // Link milestone to the gig owner
        });
        res.status(201).json(milestone);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const getMilestonesByGig = async (req, res) => {
    try {
        const { gigId } = req.params;
        const gig = await Gig.findById(gigId);
        if (!gig) return res.status(404).json({ message: 'Gig not found' });
        
        // Check for ownership or admin role
        if (gig.user.toString() !== req.user.id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to view milestones for this gig' });
        }

        const milestones = await Milestone.find({ gig: gigId }).sort('createdAt');
        res.json(milestones);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const updateMilestone = async (req, res) => {
    try {
        let milestone = await Milestone.findById(req.params.id);
        if (!milestone) return res.status(404).json({ message: 'Milestone not found' });

        if (!await checkMilestoneOwnership(req.params.id, req.user.id) && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to update this milestone' });
        }

        milestone = await Milestone.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(milestone);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const deleteMilestone = async (req, res) => {
    try {
        const milestone = await Milestone.findById(req.params.id);
        if (!milestone) return res.status(404).json({ message: 'Milestone not found' });

        if (!await checkMilestoneOwnership(req.params.id, req.user.id) && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to delete this milestone' });
        }

        await Milestone.deleteOne({ _id: req.params.id });
        res.json({ message: 'Milestone deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const generateInvoice = async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Get Custom Names (Updated to simpler keys as requested)
        const customClientName = req.query.clientName || req.body.clientName;
        const customFreelancerName = req.query.freelancerName || req.body.freelancerName;

        // 2. Fetch Data
        const milestone = await Milestone.findById(id).populate('gig');
        
        if (!milestone || !milestone.gig) {
            return res.status(404).json({ message: 'Milestone data not found' });
        }

        // 3. Auth Check
        if (milestone.user.toString() !== req.user.id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        // 4. Prepare Variables
        const invoiceNr = `INV-${milestone._id.toString().slice(-6).toUpperCase()}`;
        const gigTitle = milestone.gig.title;
        const finalClientName = customClientName || milestone.gig.clientName || 'Valued Client';
        const finalFreelancerName = customFreelancerName || 'Freelancer'; 
        const amount = milestone.paymentAmount.toFixed(2);
        const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

        // 5. Setup PDF Stream
        const filename = `invoice-${invoiceNr}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${filename}"`);

        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        doc.pipe(res);

        // --- A. HEADER BACKGROUND ---
        // Dark Blue-Grey background
        doc.rect(0, 0, doc.page.width, 160).fill('#2c3e50'); 

        // --- B. LOGO ---
        const logoPath = path.join(__dirname, '..', 'assets', 'logo.png');
        if (fs.existsSync(logoPath)) {
            doc.image(logoPath, 225, 25, { width: 150 });
        }
        
        // Title
        doc.fillColor('#FFFFFF')
           .fontSize(20)
           .text('INVOICE', 0, 95, { width: doc.page.width, align: 'center', letterSpacing: 2 });
        
        // Details (Explicit Y positions to prevent overlapping)
        doc.fontSize(10).fillColor('#E0E0E0');
        doc.text(`Invoice Number: ${invoiceNr}`, 0, 125, { width: doc.page.width, align: 'center' });
        doc.text(`Date: ${date}`, 0, 140, { width: doc.page.width, align: 'center' });

        // --- RESET FOR BODY ---
        doc.fillColor('#000000'); 

        // --- D. FROM / TO SECTIONS ---
        const startY = 210;

        // Left Column (Bill From)
        doc.text('FROM:', 50, startY, { bold: true });
        doc.font('Helvetica-Bold').text(finalFreelancerName, 50, startY + 15);
        doc.font('Helvetica').text('Freelance Developer', 50, startY + 30);

        // Right Column (Bill To)
        doc.text('TO:', 350, startY, { bold: true }); // x=350 ensures good separation
        doc.font('Helvetica-Bold').text(finalClientName, 350, startY + 15);
        doc.font('Helvetica').text(gigTitle, 350, startY + 30);

        // --- E. ITEM TABLE (Fixed Overlap Issue) ---
        const tableTop = 320; 
        
        // Header Row
        doc.rect(50, tableTop, 495, 25).fill('#f0f0f0').stroke('#e0e0e0');
        doc.fillColor('#000000');

        doc.font('Helvetica-Bold');
        doc.text('Description', 60, tableTop + 7);
        doc.text('Amount', 450, tableTop + 7, { width: 90, align: 'right' });

        // Data Row
        const rowTop = tableTop + 35;
        const descriptionWidth = 380; 

        doc.font('Helvetica');
        
        // 1. Print Milestone Title
        doc.text(`Milestone: ${milestone.title}`, 60, rowTop, { width: descriptionWidth });
        
        // 2. Print Description (and let it wrap)
        doc.fontSize(9).fillColor('#666666')
           .text(milestone.description || '', 60, doc.y + 5, { width: descriptionWidth });
        
        const descriptionEndY = doc.y; // Save the position where text ended

        // 3. Print Amount (Always at the top aligned with title)
        doc.fontSize(10).fillColor('#000000')
           .text(`$${amount}`, 450, rowTop, { width: 90, align: 'right' });

        // 4. Draw Line (Dynamically based on which column is taller)
        const lineY = Math.max(rowTop + 30, descriptionEndY + 10);
        
        doc.strokeColor('#aaaaaa').lineWidth(1)
           .moveTo(50, lineY).lineTo(545, lineY).stroke();

        // --- F. TOTAL ---
        const totalY = lineY + 20; // Position total relative to the dynamic line
        doc.font('Helvetica-Bold').fontSize(12).text('Total Due:', 350, totalY);
        doc.fontSize(14).text(`$${amount}`, 450, totalY, { width: 90, align: 'right' });

        // --- G. SIGNATURES ---
        const pageBottom = 700;

        // Freelancer
        doc.lineWidth(1).strokeColor('#000000');
        doc.moveTo(50, pageBottom).lineTo(200, pageBottom).stroke();
        doc.fontSize(10).font('Helvetica').text('Signature (Freelancer)', 50, pageBottom + 10, { width: 150, align: 'center' });
        doc.text(finalFreelancerName, 50, pageBottom + 25, { width: 150, align: 'center', color: '#666666' });

        // Client
        doc.moveTo(350, pageBottom).lineTo(500, pageBottom).stroke();
        doc.fillColor('#000000').text('Signature (Client)', 350, pageBottom + 10, { width: 150, align: 'center' });
        doc.text(finalClientName, 350, pageBottom + 25, { width: 150, align: 'center', color: '#666666' });

        doc.end();

    } catch (err) {
        console.error("PDF Generation Error:", err);
        if (!res.headersSent) {
            res.status(500).json({ message: err.message });
        }
    }
};