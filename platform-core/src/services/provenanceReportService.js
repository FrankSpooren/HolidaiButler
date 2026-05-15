/**
 * Provenance Report Service — Blok 7.2 Fase B (v4.95)
 *
 * Generates audit-ready PDF rapporten per content_item conform EU AI Act
 * Article 50 transparency obligation. Bevat: signature, model, source_ids,
 * generated_at, validation_result, tamper-status + volledige body-tekst voor
 * regulatory inspectie (NL Autoriteit Persoonsgegevens, EU AI Act audit).
 *
 * Output: PDF stream/buffer via pdfkit (deterministic, geen browser dependency).
 *
 * @module provenanceReportService
 * @version 1.0.0
 */

import PDFDocument from 'pdfkit';
import { mysqlSequelize } from '../config/database.js';
import logger from '../utils/logger.js';
import { verifyProvenance, detectBodyLang } from './provenanceService.js';

const PAGE_MARGIN = 50;
const FONT_TITLE = 16;
const FONT_HEADING = 12;
const FONT_BODY = 10;
const FONT_MONO = 9;
const COLOR_PRIMARY = '#02C39A';
const COLOR_DANGER = '#C62828';
const COLOR_WARNING = '#EF6C00';
const COLOR_SUCCESS = '#2E7D32';
const COLOR_TEXT = '#212529';
const COLOR_MUTED = '#6C757D';

function fmtDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('nl-NL', { dateStyle: 'long', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

function stripHtml(html) {
  if (!html) return '';
  return String(html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

async function loadItem(contentItemId) {
  const [[row]] = await mysqlSequelize.query(
    `SELECT ci.id, ci.destination_id, ci.title, ci.body_en, ci.body_nl, ci.body_de,
            ci.body_es, ci.body_fr, ci.target_platform,
            ci.content_type, ci.ai_model, ci.ai_generated, ci.approval_status,
            ci.provenance, ci.created_at, ci.updated_at,
            d.name AS destination_name
       FROM content_items ci
       LEFT JOIN destinations d ON d.id = ci.destination_id
       WHERE ci.id = :id`,
    { replacements: { id: Number(contentItemId) } }
  );
  if (!row) return null;
  if (typeof row.provenance === 'string') {
    try { row.provenance = JSON.parse(row.provenance); } catch { /* keep raw */ }
  }
  // Detect language uit body kolommen — content_items heeft geen target_language
  row.detected_lang = detectBodyLang(row);
  return row;
}

/**
 * Genereer audit PDF voor een content_item. Schrijft naar stream.
 *
 * @param {number} contentItemId
 * @param {import('stream').Writable} stream  - HTTP response of file stream
 * @returns {Promise<{filename: string, item: Object}>}
 */
export async function generateProvenancePDF(contentItemId, stream) {
  const item = await loadItem(contentItemId);
  if (!item) throw new Error(`Content item ${contentItemId} not found`);

  const lang = item.detected_lang || 'en';
  const body = item[`body_${lang}`] || item.body_en || item.body_nl || '';
  const bodyText = stripHtml(body);
  const verifyResult = item.provenance ? verifyProvenance(bodyText, item.provenance) : { valid: false, reason: 'no_provenance' };

  const filename = `provenance-item${item.id}-${new Date().toISOString().slice(0, 10)}.pdf`;

  const doc = new PDFDocument({ size: 'A4', margin: PAGE_MARGIN, info: {
    Title: `Provenance audit report — content item #${item.id}`,
    Author: 'HolidaiButler Platform Core',
    Subject: 'EU AI Act Article 50 transparency report',
    Keywords: 'AI provenance, EU AI Act, audit, compliance',
  } });
  doc.pipe(stream);

  // === Header ===
  doc.fillColor(COLOR_PRIMARY).fontSize(FONT_TITLE).font('Helvetica-Bold')
    .text('AI Provenance Audit Report', { align: 'left' });
  doc.fillColor(COLOR_MUTED).fontSize(FONT_BODY).font('Helvetica')
    .text('EU AI Act Article 50 — Transparency Obligation Compliance');
  doc.moveDown(0.3);
  doc.strokeColor(COLOR_PRIMARY).lineWidth(1.5).moveTo(PAGE_MARGIN, doc.y).lineTo(545, doc.y).stroke();
  doc.moveDown(0.8);

  // === Item identification ===
  doc.fillColor(COLOR_TEXT).fontSize(FONT_HEADING).font('Helvetica-Bold').text('Item Identification');
  doc.moveDown(0.3);
  doc.fontSize(FONT_BODY).font('Helvetica');
  const idTable = [
    ['Item ID', String(item.id)],
    ['Title', item.title || '—'],
    ['Destination', `${item.destination_name || '—'} (id ${item.destination_id})`],
    ['Platform', item.target_platform || '—'],
    ['Content type', item.content_type || '—'],
    ['Language', lang],
    ['Approval status', item.approval_status || '—'],
    ['Created at', fmtDate(item.created_at)],
    ['Last updated', fmtDate(item.updated_at)],
    ['Report generated', fmtDate(new Date().toISOString())],
  ];
  for (const [k, v] of idTable) {
    doc.font('Helvetica-Bold').text(`${k}:`, { continued: true, width: 150 });
    doc.font('Helvetica').text(`  ${v}`);
  }
  doc.moveDown(0.6);

  // === Verification result (most prominent) ===
  doc.fontSize(FONT_HEADING).font('Helvetica-Bold').fillColor(COLOR_TEXT).text('Verification Result');
  doc.moveDown(0.3);
  const verifyColor = verifyResult.valid && !verifyResult.contentChanged ? COLOR_SUCCESS
                    : verifyResult.contentChanged ? COLOR_WARNING : COLOR_DANGER;
  const verifyLabel = verifyResult.valid && !verifyResult.contentChanged ? 'VALID — signature intact'
                    : verifyResult.contentChanged ? 'CONTENT MODIFIED POST-GENERATION'
                    : `INVALID — ${verifyResult.reason || 'unknown'}`;
  doc.fillColor(verifyColor).fontSize(FONT_BODY + 1).font('Helvetica-Bold').text(verifyLabel);
  doc.fillColor(COLOR_TEXT).fontSize(FONT_BODY).font('Helvetica');
  if (verifyResult.reason) {
    doc.text(`Reason: ${verifyResult.reason}`);
  }
  if (verifyResult.contentChanged) {
    doc.fillColor(COLOR_WARNING).text('De huidige content komt niet overeen met de SHA-256 hash uit het signature. Manuele wijziging is gedetecteerd. Audit verplicht.', { width: 495 });
  }
  doc.fillColor(COLOR_TEXT);
  doc.moveDown(0.6);

  // === Provenance metadata ===
  doc.fontSize(FONT_HEADING).font('Helvetica-Bold').text('Provenance Metadata');
  doc.moveDown(0.3);
  doc.fontSize(FONT_BODY).font('Helvetica');
  const p = item.provenance || {};
  const provTable = [
    ['Schema version', p.schema_version || '—'],
    ['AI generated', p.ai_generated ? 'yes' : 'no'],
    ['Model', p.model || '—'],
    ['Operation', p.operation || '—'],
    ['Locale', p.locale || '—'],
    ['Generated at', fmtDate(p.generated_at)],
    ['Source IDs', Array.isArray(p.source_ids) ? p.source_ids.join(', ') || '—' : '—'],
  ];
  for (const [k, v] of provTable) {
    doc.font('Helvetica-Bold').text(`${k}:`, { continued: true, width: 150 });
    doc.font('Helvetica').text(`  ${v}`);
  }
  doc.moveDown(0.4);

  // === Signature + content hash (monospace) ===
  doc.font('Helvetica-Bold').text('Signature (SHA-256):');
  doc.font('Courier').fontSize(FONT_MONO).fillColor(COLOR_MUTED).text(p.signature || '—', { width: 495 });
  doc.fillColor(COLOR_TEXT).fontSize(FONT_BODY);
  doc.moveDown(0.2);
  doc.font('Helvetica-Bold').text('Content SHA-256:');
  doc.font('Courier').fontSize(FONT_MONO).fillColor(COLOR_MUTED).text(p.content_sha256 || '—', { width: 495 });
  doc.fillColor(COLOR_TEXT).fontSize(FONT_BODY);
  doc.moveDown(0.6);

  // === Source citations ===
  doc.fontSize(FONT_HEADING).font('Helvetica-Bold').text('Cited Sources');
  doc.moveDown(0.3);
  doc.fontSize(FONT_BODY).font('Helvetica');
  const sources = Array.isArray(p.source_metadata) ? p.source_metadata : [];
  if (sources.length === 0) {
    doc.fillColor(COLOR_MUTED).text('No source metadata recorded.');
    doc.fillColor(COLOR_TEXT);
  } else {
    sources.forEach((s, idx) => {
      doc.font('Helvetica-Bold').text(`${idx + 1}. ${s.name || `Source #${idx + 1}`}`);
      doc.font('Helvetica').fillColor(COLOR_MUTED);
      if (s.url) doc.text(`   ${s.url}`, { link: s.url });
      if (s.type) doc.text(`   Type: ${s.type}`);
      doc.fillColor(COLOR_TEXT);
      doc.moveDown(0.1);
    });
  }
  doc.moveDown(0.6);

  // === Validation result ===
  if (p.validation) {
    doc.fontSize(FONT_HEADING).font('Helvetica-Bold').text('Validation Result');
    doc.moveDown(0.3);
    doc.fontSize(FONT_BODY).font('Helvetica');
    const validationLines = [
      ['Passed', p.validation.passed === false ? 'NO (hallucination detected)' : 'yes'],
      ['Hallucination rate', p.validation.hallucinationRate !== undefined ? `${(p.validation.hallucinationRate * 100).toFixed(1)}%` : '—'],
      ['Retries', String(p.validation.retries || 0)],
      ['Entity count', String(p.validation.entityCount || 0)],
    ];
    for (const [k, v] of validationLines) {
      doc.font('Helvetica-Bold').text(`${k}:`, { continued: true, width: 150 });
      doc.font('Helvetica').text(`  ${v}`);
    }
    const ungrounded = p.validation.ungroundedEntities || p.validation.ungrounded_entities || [];
    if (ungrounded.length > 0) {
      doc.moveDown(0.2);
      doc.font('Helvetica-Bold').fillColor(COLOR_DANGER).text('Ungrounded entities:');
      doc.font('Helvetica').fillColor(COLOR_TEXT);
      ungrounded.slice(0, 20).forEach((e) => {
        const label = typeof e === 'string' ? e : e?.entity || JSON.stringify(e);
        doc.text(`  • ${label}`);
      });
    }
    doc.moveDown(0.6);
  }

  // === Body content (audit-eis: volledige tekst opnemen) ===
  if (doc.y > 700) doc.addPage();
  doc.fontSize(FONT_HEADING).font('Helvetica-Bold').text('Generated Content (full text)');
  doc.moveDown(0.3);
  doc.fontSize(FONT_BODY).font('Helvetica');
  if (item.title) {
    doc.font('Helvetica-Bold').text(item.title);
    doc.moveDown(0.2);
  }
  doc.font('Helvetica').fillColor(COLOR_TEXT).text(bodyText || '(empty)', { width: 495, align: 'left' });
  doc.moveDown(0.8);

  // === Footer met legal disclosure ===
  doc.fontSize(FONT_MONO).fillColor(COLOR_MUTED).font('Helvetica-Oblique');
  doc.text('Dit rapport is automatisch gegenereerd door HolidaiButler Platform Core conform EU AI Act Article 50. Provenance signature gebruikt SHA-256 over (model, operation, source_ids, locale, destination_id, generated_at, content_sha256). Wijzigingen aan de content na generatie worden gedetecteerd via tamper-detection.', { width: 495 });

  doc.end();
  return { filename, item, verifyResult };
}

export default { generateProvenancePDF };
