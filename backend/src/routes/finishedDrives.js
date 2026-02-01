const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const pool = require('../db/pool');
const PDFDocument = require('pdfkit');
const { PassThrough } = require('stream');

// Get finished drives with optional filtering
router.get('/', authenticateToken, authorizeRoles('HEAD', 'COORDINATOR'), async (req, res) => {
  try {
    const { limit, months, start_date, end_date } = req.query;
    
    let query = `
      SELECT fd.*, pd.pdf_path, pd.domain_id, jd.domain_name
      FROM finished_drives fd
      JOIN placement_drives pd ON fd.drive_id = pd.drive_id
      LEFT JOIN job_domains jd ON pd.domain_id = jd.domain_id
      WHERE 1=1
    `;
    const params = [];
    
    // Date filtering
    if (months) {
      params.push(parseInt(months));
      query += ` AND fd.finished_date >= NOW() - INTERVAL '${parseInt(months)} months'`;
    } else if (start_date && end_date) {
      params.push(start_date, end_date);
      query += ` AND fd.finished_date BETWEEN $${params.length - 1} AND $${params.length}`;
    }
    
    query += ` ORDER BY fd.finished_date DESC`;
    
    if (limit) {
      params.push(parseInt(limit));
      query += ` LIMIT $${params.length}`;
    }
    
    const result = await pool.query(query, params.filter((_, i) => query.includes(`$${i + 1}`)));
    res.json(result.rows);
  } catch (e) {
    console.error('Error fetching finished drives:', e);
    res.status(500).json({ message: 'Error fetching finished drives' });
  }
});

// Download finished drives as PDF
router.get('/download-pdf', authenticateToken, authorizeRoles('HEAD', 'COORDINATOR'), async (req, res) => {
  try {
    const { months, start_date, end_date } = req.query;
    
    let query = `
      SELECT fd.*, pd.pdf_path, pd.domain_id, jd.domain_name
      FROM finished_drives fd
      JOIN placement_drives pd ON fd.drive_id = pd.drive_id
      LEFT JOIN job_domains jd ON pd.domain_id = jd.domain_id
      WHERE 1=1
    `;
    const params = [];
    
    // Date filtering
    if (months) {
      params.push(parseInt(months));
      query += ` AND fd.finished_date >= NOW() - INTERVAL '${parseInt(months)} months'`;
    } else if (start_date && end_date) {
      params.push(start_date, end_date);
      query += ` AND fd.finished_date BETWEEN $${params.length - 1} AND $${params.length}`;
    }
    
    query += ` ORDER BY fd.finished_date DESC`;
    
    const result = await pool.query(query, params.filter((_, i) => query.includes(`$${i + 1}`)));
    const drives = result.rows;

    // Create PDF
    const doc = new PDFDocument({ margin: 50 });
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=finished-drives-${Date.now()}.pdf`);
    
    // Pipe PDF to response
    doc.pipe(res);

    // Add title
    doc.fontSize(20).font('Helvetica-Bold').text('Finished Placement Drives Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).font('Helvetica').text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });
    doc.moveDown(2);

    if (drives.length === 0) {
      doc.fontSize(12).text('No finished drives found for the selected date range.', { align: 'center' });
    } else {
      // Add summary
      doc.fontSize(14).font('Helvetica-Bold').text('Summary', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica');
      doc.text(`Total Drives: ${drives.length}`);
      const totalRegistered = drives.reduce((sum, d) => sum + d.total_registered, 0);
      const totalPresent = drives.reduce((sum, d) => sum + d.total_present, 0);
      const totalAbsent = drives.reduce((sum, d) => sum + d.total_absent, 0);
      doc.text(`Total Registered: ${totalRegistered}`);
      doc.text(`Total Present: ${totalPresent}`);
      doc.text(`Total Absent: ${totalAbsent}`);
      doc.moveDown(2);

      // Add drives details
      doc.fontSize(14).font('Helvetica-Bold').text('Drive Details', { underline: true });
      doc.moveDown();

      drives.forEach((drive, index) => {
        if (doc.y > 700) {
          doc.addPage();
        }

        doc.fontSize(12).font('Helvetica-Bold').text(`${index + 1}. ${drive.company_name}`, { continued: false });
        doc.fontSize(10).font('Helvetica');
        doc.text(`   Job Title: ${drive.job_title}`);
        doc.text(`   Interview Date: ${new Date(drive.interview_date).toLocaleDateString()}`);
        doc.text(`   Finished Date: ${new Date(drive.finished_date).toLocaleDateString()}`);
        doc.text(`   Registered: ${drive.total_registered} | Present: ${drive.total_present} | Absent: ${drive.total_absent}`);
        if (drive.domain_name) {
          doc.text(`   Domain: ${drive.domain_name}`);
        }
        doc.moveDown(1);
      });
    }

    // Finalize PDF
    doc.end();
  } catch (e) {
    console.error('Error generating PDF:', e);
    res.status(500).json({ message: 'Error generating PDF' });
  }
});

// Download finished drives as true Excel (.xlsx)
router.get('/download-excel', authenticateToken, authorizeRoles('HEAD', 'COORDINATOR'), async (req, res) => {
  try {
    const ExcelJS = require('exceljs');
    const { months, start_date, end_date } = req.query;
    let query = `
      SELECT fd.*, pd.domain_id, jd.domain_name
      FROM finished_drives fd
      JOIN placement_drives pd ON fd.drive_id = pd.drive_id
      LEFT JOIN job_domains jd ON pd.domain_id = jd.domain_id
      WHERE 1=1
    `;
    const params = [];

    if (months) {
      params.push(parseInt(months));
      query += ` AND fd.finished_date >= NOW() - INTERVAL '${parseInt(months)} months'`;
    } else if (start_date && end_date) {
      params.push(start_date, end_date);
      query += ` AND fd.finished_date BETWEEN $${params.length - 1} AND $${params.length}`;
    }

    query += ` ORDER BY fd.finished_date DESC`;

    const result = await pool.query(query, params.filter((_, i) => query.includes(`$${i + 1}`)));
    const drives = result.rows;

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Finished Drives');

    sheet.columns = [
      { header: 'Drive ID', key: 'drive_id', width: 10 },
      { header: 'Company Name', key: 'company_name', width: 30 },
      { header: 'Job Title', key: 'job_title', width: 30 },
      { header: 'Interview Date', key: 'interview_date', width: 20 },
      { header: 'Finished Date', key: 'finished_date', width: 20 },
      { header: 'Total Registered', key: 'total_registered', width: 15 },
      { header: 'Total Present', key: 'total_present', width: 12 },
      { header: 'Total Absent', key: 'total_absent', width: 12 },
      { header: 'Domain', key: 'domain_name', width: 20 }
    ];

    drives.forEach(d => {
      sheet.addRow({
        drive_id: d.drive_id,
        company_name: d.company_name,
        job_title: d.job_title,
        interview_date: d.interview_date ? new Date(d.interview_date) : null,
        finished_date: d.finished_date ? new Date(d.finished_date) : null,
        total_registered: d.total_registered || 0,
        total_present: d.total_present || 0,
        total_absent: d.total_absent || 0,
        domain_name: d.domain_name || ''
      });
    });

    // Format header row
    sheet.getRow(1).font = { bold: true };

    const buffer = await workbook.xlsx.writeBuffer();

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=finished-drives-${Date.now()}.xlsx`);
    res.send(Buffer.from(buffer));
  } catch (e) {
    console.error('Error generating Excel:', e);
    res.status(500).json({ message: 'Error generating Excel' });
  }
});

module.exports = router;
