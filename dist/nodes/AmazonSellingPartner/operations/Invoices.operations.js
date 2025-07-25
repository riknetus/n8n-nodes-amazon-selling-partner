"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getVatInvoicePdfLinks = exports.getVatInvoiceReport = exports.getGstReport = void 0;
const n8n_workflow_1 = require("n8n-workflow");
const SpApiRequest_1 = require("../helpers/SpApiRequest");
const ReportDownloader_1 = require("../helpers/ReportDownloader");
async function getGstReport(index) {
    const reportType = this.getNodeParameter('reportType', index);
    const marketplaceId = this.getNodeParameter('marketplaceId', index);
    const outputOptions = this.getNodeParameter('outputOptions', index, {});
    const advancedOptions = this.getNodeParameter('advancedOptions', index, {});
    // Validate marketplace for GST reports
    if (marketplaceId !== 'A21TJRUUN4KGV') {
        throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'GST reports are only available for Amazon.in marketplace (A21TJRUUN4KGV)');
    }
    // Build report request
    const reportRequest = {
        reportType,
        marketplaceIds: [marketplaceId],
    };
    // Add date range for custom reports
    const customReportTypes = ['GET_GST_MTR_B2B_CUSTOM', 'GET_GST_MTR_B2C_CUSTOM', 'GET_GST_STR_ADHOC'];
    if (customReportTypes.includes(reportType)) {
        const startDate = this.getNodeParameter('startDate', index);
        const endDate = this.getNodeParameter('endDate', index);
        if (!startDate || !endDate) {
            throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'Start date and end date are required for custom GST reports');
        }
        reportRequest.dataStartTime = new Date(startDate).toISOString();
        reportRequest.dataEndTime = new Date(endDate).toISOString();
        // Validate date range (max 31 days for GST reports)
        const daysDiff = (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24);
        if (daysDiff > 31) {
            throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'Date range for GST reports cannot exceed 31 days');
        }
    }
    return await processReportRequest.call(this, reportRequest, outputOptions, advancedOptions);
}
exports.getGstReport = getGstReport;
async function getVatInvoiceReport(index) {
    const reportType = this.getNodeParameter('reportType', index);
    const marketplaceId = this.getNodeParameter('marketplaceId', index);
    const reportOptions = this.getNodeParameter('reportOptions', index, {});
    const outputOptions = this.getNodeParameter('outputOptions', index, {});
    const advancedOptions = this.getNodeParameter('advancedOptions', index, {});
    // Validate marketplace for VAT reports
    const euUkMarketplaces = ['A1F83G8C2ARO7P', 'A1PA6795UKMFR9', 'A13V1IB3VIYZZH', 'APJ6JRA9NG5V4', 'A1RKKUPIHCS9HS', 'A1805IZSGTT6HS', 'A2NODRKZP88ZB9', 'A1C3SOZRARQ6R3'];
    if (!euUkMarketplaces.includes(marketplaceId)) {
        throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'VAT invoice reports are only available for EU/UK marketplaces');
    }
    // Build report request
    const reportRequest = {
        reportType,
        marketplaceIds: [marketplaceId],
    };
    // Add date range if not using pending invoices only
    if (!reportOptions.pendingInvoices || reportOptions.all) {
        const startDate = this.getNodeParameter('startDate', index);
        const endDate = this.getNodeParameter('endDate', index);
        if (!startDate || !endDate) {
            throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'Start date and end date are required when not using pending invoices only');
        }
        reportRequest.dataStartTime = new Date(startDate).toISOString();
        reportRequest.dataEndTime = new Date(endDate).toISOString();
        // Validate date range (max 30 days for VAT reports)
        const daysDiff = (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24);
        if (daysDiff > 30) {
            throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'Date range for VAT invoice reports cannot exceed 30 days');
        }
    }
    // Set report options
    if (reportOptions.pendingInvoices && !reportOptions.all) {
        reportRequest.reportOptions = { PendingInvoices: 'true' };
    }
    else if (reportOptions.all) {
        reportRequest.reportOptions = { All: 'true' };
    }
    return await processReportRequest.call(this, reportRequest, outputOptions, advancedOptions);
}
exports.getVatInvoiceReport = getVatInvoiceReport;
async function getVatInvoicePdfLinks(index) {
    const marketplaceId = this.getNodeParameter('marketplaceId', index);
    const outputOptions = this.getNodeParameter('outputOptions', index, {});
    const advancedOptions = this.getNodeParameter('advancedOptions', index, {});
    // VAT calculation report for PDF links
    const reportRequest = {
        reportType: 'SC_VAT_TAX_REPORT',
        marketplaceIds: [marketplaceId],
    };
    return await processReportRequest.call(this, reportRequest, outputOptions, advancedOptions);
}
exports.getVatInvoicePdfLinks = getVatInvoicePdfLinks;
async function processReportRequest(reportRequest, outputOptions, advancedOptions) {
    const maxPollTimeMinutes = advancedOptions.maxPollTimeMinutes || 10;
    const pollIntervalSeconds = advancedOptions.pollIntervalSeconds || 30;
    const maxPollTime = maxPollTimeMinutes * 60 * 1000; // Convert to milliseconds
    const pollInterval = pollIntervalSeconds * 1000; // Convert to milliseconds
    try {
        // Step 1: Create the report
        const reportResponse = await SpApiRequest_1.SpApiRequest.makeRequest(this, {
            method: 'POST',
            endpoint: '/reports/2021-06-30/reports',
            body: reportRequest,
        });
        const reportId = reportResponse.data.reportId;
        // Step 2: Poll for report completion
        const startTime = Date.now();
        let reportStatus;
        do {
            if (Date.now() - startTime > maxPollTime) {
                throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Report generation timed out after ${maxPollTimeMinutes} minutes. The report may still be processing in Amazon's system.`, {
                    description: 'Try increasing the max poll time or check the report status later manually'
                });
            }
            // Wait before polling (except first time)
            if (Date.now() - startTime > 0) {
                await new Promise(resolve => setTimeout(resolve, pollInterval));
            }
            const statusResponse = await SpApiRequest_1.SpApiRequest.makeRequest(this, {
                method: 'GET',
                endpoint: `/reports/2021-06-30/reports/${reportId}`,
            });
            reportStatus = statusResponse.data;
        } while (reportStatus.processingStatus === 'IN_QUEUE' || reportStatus.processingStatus === 'IN_PROGRESS');
        // Check final status
        if (reportStatus.processingStatus === 'CANCELLED') {
            throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'Report generation was cancelled by Amazon');
        }
        if (reportStatus.processingStatus === 'FATAL') {
            throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'Report generation failed with a fatal error');
        }
        if (!reportStatus.reportDocumentId) {
            throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'Report completed but no document ID was provided');
        }
        // Step 3: Get report document details
        const documentResponse = await SpApiRequest_1.SpApiRequest.makeRequest(this, {
            method: 'GET',
            endpoint: `/reports/2021-06-30/documents/${reportStatus.reportDocumentId}`,
        });
        const document = documentResponse.data;
        // Step 4: Download and process the report
        const reportData = await ReportDownloader_1.ReportDownloader.downloadReportDocument(document, this.getNode().id);
        // Continue with processing...
        return await processReportData.call(this, reportStatus, reportRequest, reportData, outputOptions);
    }
    catch (error) {
        if (error instanceof n8n_workflow_1.NodeOperationError) {
            throw error;
        }
        throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Failed to process invoice report: ${error instanceof Error ? error.message : 'Unknown error'}`, {
            description: 'Check your credentials and try again. Some reports may take longer to generate.'
        });
    }
}
async function processReportData(reportStatus, reportRequest, reportData, outputOptions) {
    // Determine output format
    const returnBinary = outputOptions.returnBinary !== false; // Default to true
    const parseToJson = outputOptions.parseToJson === true;
    const binaryPropertyName = outputOptions.binaryPropertyName || 'data';
    if (returnBinary && !parseToJson) {
        // Return as binary data
        const binaryData = await this.helpers.prepareBinaryData(reportData, `${reportRequest.reportType}_${new Date().toISOString().split('T')[0]}.${getFileExtension(reportRequest.reportType)}`, getContentType(reportRequest.reportType));
        return [
            {
                json: {
                    reportId: reportStatus.reportId,
                    reportType: reportStatus.reportType,
                    processingTime: reportStatus.processingEndTime ?
                        new Date(reportStatus.processingEndTime).getTime() - new Date(reportStatus.createdTime).getTime() : null,
                    fileSize: reportData.length,
                    success: true,
                },
                binary: {
                    [binaryPropertyName]: binaryData,
                },
            },
        ];
    }
    else if (parseToJson && (reportRequest.reportType.includes('FLAT_FILE') || reportRequest.reportType.includes('GST'))) {
        // Parse CSV/TSV to JSON
        const textData = reportData.toString('utf-8');
        const lines = textData.trim().split('\n');
        if (lines.length === 0) {
            return [{
                    json: {
                        reportId: reportStatus.reportId,
                        reportType: reportStatus.reportType,
                        message: 'Report is empty',
                        data: [],
                    },
                }];
        }
        // Determine delimiter (tab for most reports, comma for some)
        const delimiter = textData.includes('\t') ? '\t' : ',';
        const headers = lines[0].split(delimiter);
        const rows = lines.slice(1).map(line => {
            const values = line.split(delimiter);
            const row = {};
            headers.forEach((header, index) => {
                row[header.trim()] = values[index]?.trim() || '';
            });
            return row;
        });
        return [{
                json: {
                    reportId: reportStatus.reportId,
                    reportType: reportStatus.reportType,
                    processingTime: reportStatus.processingEndTime ?
                        new Date(reportStatus.processingEndTime).getTime() - new Date(reportStatus.createdTime).getTime() : null,
                    recordCount: rows.length,
                    data: rows,
                    success: true,
                },
            }];
    }
    else {
        // Return as text
        return [{
                json: {
                    reportId: reportStatus.reportId,
                    reportType: reportStatus.reportType,
                    processingTime: reportStatus.processingEndTime ?
                        new Date(reportStatus.processingEndTime).getTime() - new Date(reportStatus.createdTime).getTime() : null,
                    content: reportData.toString('utf-8'),
                    fileSize: reportData.length,
                    success: true,
                },
            }];
    }
}
function getFileExtension(reportType) {
    if (reportType.includes('XML')) {
        return 'xml';
    }
    if (reportType.includes('FLAT_FILE') || reportType.includes('GST')) {
        return 'txt';
    }
    return 'txt';
}
function getContentType(reportType) {
    if (reportType.includes('XML')) {
        return 'application/xml';
    }
    return 'text/plain';
}
