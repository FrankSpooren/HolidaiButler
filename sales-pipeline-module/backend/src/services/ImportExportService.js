/**
 * Import/Export Service
 * Bulk data operations with validation
 */

import { parse } from 'csv-parse';
import { stringify } from 'csv-stringify';
import XLSX from 'xlsx';
import { createReadStream, createWriteStream } from 'fs';
import { mkdir, unlink } from 'fs/promises';
import path from 'path';
import { pipeline } from 'stream/promises';
import { v4 as uuidv4 } from 'uuid';
import {
  ImportJob,
  ExportJob,
  Account,
  Contact,
  Lead,
  Deal,
  Activity,
  Product,
  User,
  sequelize
} from '../models/index.js';
import { pubsub } from '../config/redis.js';
import logger from '../utils/logger.js';

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const EXPORT_DIR = process.env.EXPORT_DIR || './exports';

class ImportExportService {
  constructor() {
    this.models = {
      accounts: Account,
      contacts: Contact,
      leads: Lead,
      deals: Deal,
      activities: Activity,
      products: Product
    };

    this.fieldMappings = {
      accounts: {
        required: ['name'],
        optional: ['domain', 'industry', 'phone', 'email', 'website', 'employeeCount', 'annualRevenue', 'type', 'tier'],
        transform: {
          employeeCount: (v) => parseInt(v) || null,
          annualRevenue: (v) => parseFloat(v) || null
        }
      },
      contacts: {
        required: ['firstName', 'lastName', 'email'],
        optional: ['phone', 'mobilePhone', 'jobTitle', 'department', 'accountName'],
        transform: {}
      },
      leads: {
        required: ['firstName', 'lastName', 'email'],
        optional: ['phone', 'company', 'jobTitle', 'industry', 'source', 'status'],
        transform: {}
      },
      deals: {
        required: ['name', 'value'],
        optional: ['stage', 'expectedCloseDate', 'probability', 'accountName', 'contactEmail'],
        transform: {
          value: (v) => parseFloat(v) || 0,
          probability: (v) => parseInt(v) || 0,
          expectedCloseDate: (v) => v ? new Date(v) : null
        }
      },
      products: {
        required: ['name', 'price'],
        optional: ['code', 'description', 'category', 'type', 'billingPeriod'],
        transform: {
          price: (v) => parseFloat(v) || 0
        }
      }
    };
  }

  /**
   * Create import job
   */
  async createImportJob(fileInfo, options, userId) {
    const job = await ImportJob.create({
      name: options.name || `Import ${options.entityType}`,
      entityType: options.entityType,
      fileUrl: fileInfo.path,
      fileName: fileInfo.originalname,
      fileSize: fileInfo.size,
      fileFormat: this.getFileFormat(fileInfo.originalname),
      columnMapping: options.columnMapping || {},
      options: {
        skipDuplicates: options.skipDuplicates !== false,
        updateExisting: options.updateExisting === true,
        validateOnly: options.validateOnly === true,
        batchSize: options.batchSize || 100
      },
      duplicateField: options.duplicateField || 'email',
      duplicateAction: options.duplicateAction || 'skip',
      defaultValues: options.defaultValues || {},
      assignToUserId: options.assignToUserId,
      assignToTeamId: options.assignToTeamId,
      createdBy: userId
    });

    return job;
  }

  /**
   * Process import job
   */
  async processImport(jobId) {
    const job = await ImportJob.findByPk(jobId);
    if (!job) throw new Error('Import job not found');

    try {
      await job.update({ status: 'validating' });

      // Parse file
      const records = await this.parseFile(job.fileUrl, job.fileFormat);
      await job.update({ totalRows: records.length });

      // Validate records
      const { valid, errors } = await this.validateRecords(
        records,
        job.entityType,
        job.columnMapping
      );

      if (job.options.validateOnly) {
        await job.update({
          status: 'completed',
          processedRows: records.length,
          successCount: valid.length,
          errorCount: errors.length,
          errors: errors.slice(0, 100) // Limit stored errors
        });
        return job;
      }

      if (errors.length > 0 && !job.options.skipDuplicates) {
        await job.update({
          status: 'failed',
          errors: errors.slice(0, 100),
          errorCount: errors.length
        });
        return job;
      }

      // Process in batches
      await job.update({ status: 'processing' });
      const result = await this.importRecords(job, valid);

      await job.update({
        status: 'completed',
        processedRows: records.length,
        successCount: result.created.length + result.updated.length,
        errorCount: result.errors.length,
        duplicateCount: result.duplicates,
        createdIds: result.created,
        updatedIds: result.updated,
        errors: result.errors.slice(0, 100)
      });

      // Notify user
      await pubsub.publish(`import:${job.createdBy}`, {
        type: 'import_complete',
        jobId: job.id,
        status: 'completed',
        successCount: result.created.length + result.updated.length
      });

      return job;
    } catch (error) {
      logger.error('Import processing error:', error);
      await job.update({
        status: 'failed',
        errors: [{ error: error.message }]
      });
      throw error;
    }
  }

  /**
   * Parse file based on format
   */
  async parseFile(filePath, format) {
    switch (format) {
      case 'csv':
        return this.parseCsv(filePath);
      case 'xlsx':
        return this.parseXlsx(filePath);
      case 'json':
        return this.parseJson(filePath);
      default:
        throw new Error(`Unsupported file format: ${format}`);
    }
  }

  async parseCsv(filePath) {
    return new Promise((resolve, reject) => {
      const records = [];
      const stream = createReadStream(filePath).pipe(
        parse({
          columns: true,
          skip_empty_lines: true,
          trim: true
        })
      );

      stream.on('data', (record) => records.push(record));
      stream.on('error', reject);
      stream.on('end', () => resolve(records));
    });
  }

  async parseXlsx(filePath) {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    return XLSX.utils.sheet_to_json(sheet);
  }

  async parseJson(filePath) {
    const fs = await import('fs/promises');
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  }

  /**
   * Validate records
   */
  async validateRecords(records, entityType, columnMapping) {
    const config = this.fieldMappings[entityType];
    if (!config) throw new Error(`Unknown entity type: ${entityType}`);

    const valid = [];
    const errors = [];

    records.forEach((record, index) => {
      const mapped = this.mapRecord(record, columnMapping);
      const recordErrors = [];

      // Check required fields
      config.required.forEach(field => {
        if (!mapped[field] || mapped[field].toString().trim() === '') {
          recordErrors.push({ field, error: `${field} is required` });
        }
      });

      // Validate email format
      if (mapped.email && !this.isValidEmail(mapped.email)) {
        recordErrors.push({ field: 'email', error: 'Invalid email format' });
      }

      if (recordErrors.length > 0) {
        errors.push({ row: index + 1, errors: recordErrors, data: record });
      } else {
        // Transform values
        Object.entries(config.transform).forEach(([field, transformer]) => {
          if (mapped[field] !== undefined) {
            mapped[field] = transformer(mapped[field]);
          }
        });
        valid.push({ row: index + 1, data: mapped });
      }
    });

    return { valid, errors };
  }

  /**
   * Import validated records
   */
  async importRecords(job, validRecords) {
    const Model = this.models[job.entityType];
    const result = {
      created: [],
      updated: [],
      errors: [],
      duplicates: 0
    };

    const batchSize = job.options.batchSize || 100;
    const transaction = await sequelize.transaction();

    try {
      for (let i = 0; i < validRecords.length; i += batchSize) {
        const batch = validRecords.slice(i, i + batchSize);

        for (const item of batch) {
          try {
            const data = {
              ...item.data,
              ...job.defaultValues
            };

            if (job.assignToUserId) data.ownerId = job.assignToUserId;
            if (job.assignToTeamId) data.teamId = job.assignToTeamId;

            // Check for duplicates
            if (job.duplicateField && data[job.duplicateField]) {
              const existing = await Model.findOne({
                where: { [job.duplicateField]: data[job.duplicateField] },
                transaction
              });

              if (existing) {
                if (job.duplicateAction === 'update') {
                  await existing.update(data, { transaction });
                  result.updated.push(existing.id);
                } else if (job.duplicateAction === 'skip') {
                  result.duplicates++;
                }
                continue;
              }
            }

            // Resolve relationships
            if (job.entityType === 'contacts' && data.accountName) {
              const account = await Account.findOne({
                where: { name: data.accountName },
                transaction
              });
              if (account) data.accountId = account.id;
              delete data.accountName;
            }

            if (job.entityType === 'deals') {
              if (data.accountName) {
                const account = await Account.findOne({
                  where: { name: data.accountName },
                  transaction
                });
                if (account) data.accountId = account.id;
                delete data.accountName;
              }
              if (data.contactEmail) {
                const contact = await Contact.findOne({
                  where: { email: data.contactEmail },
                  transaction
                });
                if (contact) data.contactId = contact.id;
                delete data.contactEmail;
              }
            }

            const record = await Model.create(data, { transaction });
            result.created.push(record.id);
          } catch (error) {
            result.errors.push({
              row: item.row,
              error: error.message,
              data: item.data
            });
          }
        }

        // Update progress
        await job.update({
          processedRows: Math.min(i + batchSize, validRecords.length)
        });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }

    return result;
  }

  /**
   * Create export job
   */
  async createExportJob(options, userId) {
    const job = await ExportJob.create({
      name: options.name || `Export ${options.entityType}`,
      entityType: options.entityType,
      fileFormat: options.format || 'csv',
      filters: options.filters || {},
      columns: options.columns || [],
      columnLabels: options.columnLabels || {},
      sortBy: options.sortBy,
      sortOrder: options.sortOrder || 'desc',
      options: {
        includeHeaders: options.includeHeaders !== false,
        dateFormat: options.dateFormat || 'YYYY-MM-DD',
        timezone: options.timezone || 'Europe/Amsterdam'
      },
      notifyOnComplete: options.notifyOnComplete !== false,
      notifyEmail: options.notifyEmail,
      createdBy: userId
    });

    return job;
  }

  /**
   * Process export job
   */
  async processExport(jobId) {
    const job = await ExportJob.findByPk(jobId);
    if (!job) throw new Error('Export job not found');

    try {
      await job.update({ status: 'processing' });

      // Get data
      const Model = this.models[job.entityType];
      if (!Model) throw new Error(`Unknown entity type: ${job.entityType}`);

      const records = await Model.findAll({
        where: job.filters,
        order: job.sortBy ? [[job.sortBy, job.sortOrder]] : [['createdAt', 'DESC']]
      });

      await job.update({ totalRecords: records.length });

      // Transform records
      const data = records.map(record => {
        const json = record.toJSON();
        if (job.columns.length > 0) {
          const filtered = {};
          job.columns.forEach(col => {
            const label = job.columnLabels[col] || col;
            filtered[label] = json[col];
          });
          return filtered;
        }
        return json;
      });

      // Generate file
      await mkdir(EXPORT_DIR, { recursive: true });
      const fileName = `${job.entityType}_${uuidv4()}.${job.fileFormat}`;
      const filePath = path.join(EXPORT_DIR, fileName);

      switch (job.fileFormat) {
        case 'csv':
          await this.writeCsv(filePath, data, job.options);
          break;
        case 'xlsx':
          await this.writeXlsx(filePath, data, job.options);
          break;
        case 'json':
          await this.writeJson(filePath, data);
          break;
        default:
          throw new Error(`Unsupported format: ${job.fileFormat}`);
      }

      // Get file size
      const fs = await import('fs/promises');
      const stats = await fs.stat(filePath);

      await job.update({
        status: 'completed',
        processedRecords: records.length,
        fileUrl: `/exports/${fileName}`,
        fileName,
        fileSize: stats.size
      });

      // Notify user
      await pubsub.publish(`export:${job.createdBy}`, {
        type: 'export_complete',
        jobId: job.id,
        fileUrl: job.fileUrl
      });

      return job;
    } catch (error) {
      logger.error('Export processing error:', error);
      await job.update({
        status: 'failed',
        errorMessage: error.message
      });
      throw error;
    }
  }

  async writeCsv(filePath, data, options) {
    return new Promise((resolve, reject) => {
      const output = createWriteStream(filePath);
      const stringifier = stringify({
        header: options.includeHeaders,
        columns: data.length > 0 ? Object.keys(data[0]) : []
      });

      stringifier.pipe(output);
      stringifier.on('error', reject);
      output.on('finish', resolve);

      data.forEach(record => stringifier.write(record));
      stringifier.end();
    });
  }

  async writeXlsx(filePath, data, options) {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
    XLSX.writeFile(workbook, filePath);
  }

  async writeJson(filePath, data) {
    const fs = await import('fs/promises');
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  }

  /**
   * Get import/export jobs for user
   */
  async getJobs(userId, type = 'import', options = {}) {
    const Model = type === 'import' ? ImportJob : ExportJob;
    const { page = 1, limit = 20 } = options;

    const { count, rows } = await Model.findAndCountAll({
      where: { createdBy: userId },
      order: [['createdAt', 'DESC']],
      limit,
      offset: (page - 1) * limit
    });

    return {
      jobs: rows,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit)
    };
  }

  // Helper methods
  getFileFormat(filename) {
    const ext = path.extname(filename).toLowerCase().slice(1);
    return ['csv', 'xlsx', 'json'].includes(ext) ? ext : 'csv';
  }

  mapRecord(record, mapping) {
    if (!mapping || Object.keys(mapping).length === 0) {
      return record;
    }

    const mapped = {};
    Object.entries(mapping).forEach(([source, target]) => {
      if (record[source] !== undefined) {
        mapped[target] = record[source];
      }
    });
    return mapped;
  }

  isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }
}

export default new ImportExportService();
