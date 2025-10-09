"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeReportsOperation = void 0;
const axios_1 = __importDefault(require("axios"));
const n8n_workflow_1 = require("n8n-workflow");
const sync_1 = require("csv-parse/sync");
const zlib_1 = require("zlib");
const util_1 = require("util");
const SpApiRequest_1 = require("../helpers/SpApiRequest");
const SecurityValidator_1 = require("../core/SecurityValidator");
const AuditLogger_1 = require("../core/AuditLogger");
const REPORT_TYPE_MAP = {
    salesTrafficByAsin: 'GET_SALES_AND_TRAFFIC_REPORT',
    returnsByAsinFba: 'GET_FBA_FULFILLMENT_CUSTOMER_RETURNS_DATA',
    returnsByAsinMfn: 'GET_FLAT_FILE_RETURNS_DATA_BY_RETURN_DATE',
};
const gunzipAsync = (0, util_1.promisify)(zlib_1.gunzip);
function normalizeDate(dateStr) {
    if (!dateStr) {
        return undefined;
    }
    const parsed = new Date(dateStr);
    if (Number.isNaN(parsed.getTime())) {
        return undefined;
    }
    return parsed.toISOString();
}
function mapSalesTrafficRow(row) {
    const isoDate = normalizeDate(row['date'] || row['detailed-page-sales-dataset.date']);
    return {
        date: isoDate ?? row['date'] ?? row['detailed-page-sales-dataset.date'] ?? '',
        asin: row['asin'] || row['child-asins.asin'] || row['sku-child.asin'],
        sku: row['sku'] || row['child-asins.sku'] || row['sku-child.sku'],
        parentAsin: row['parent-asins.parent-asin'],
        marketplaceId: row['marketplace'] || row['marketplace-name'],
        orderedUnits: Number(row['units'] || row['ordered-units'] || row['ordered']) || 0,
        orderedProductSales: {
            amount: Number(row['ordered-product-sales'] || row['ordered-revenue']) || 0,
            currencyCode: row['ordered-product-sales-currency-code'] || row['currency-code'] || 'USD',
        },
        sessions: row['sessions'] ? Number(row['sessions']) : undefined,
        pageViews: row['page-views'] ? Number(row['page-views']) : undefined,
        buyBoxPercentage: row['buy-box-percentage'] ? Number(row['buy-box-percentage']) : undefined,
    };
}
function mapReturnsRow(row, channel) {
    return {
        date: normalizeDate(row['return-date'] ||
            row['return_datetime'] ||
            row['posted-date'] ||
            row['return-date-time']) ?? row['return-date'] ?? row['return_datetime'] ?? row['posted-date'] ?? row['return-date-time'] ?? '',
        asin: row['asin'] || row['child-asins.asin'] || row['seller-sku'],
        sku: row['seller-sku'] || row['sku'],
        marketplaceId: row['marketplace-id'] || row['marketplace'],
        returnedUnits: Number(row['quantity'] || row['quantity-returned'] || row['number-of-returned-units']) || 0,
        fulfillmentChannel: channel,
        reason: row['return-reason'] || row['reason'] || row['return-reason-description'],
        reimbursementType: row['reimbursement-type'],
    };
}
function sumRefundEvents(events) {
    const totals = {};
    events.forEach(event => {
        const chargeTransactions = event.refundChargeTransactions || [];
        chargeTransactions.forEach(charge => {
            const marketplaceId = event.marketplaceId || 'UNKNOWN';
            if (!totals[marketplaceId]) {
                totals[marketplaceId] = {
                    amount: 0,
                    currencyCode: charge.amount.currencyCode,
                };
            }
            totals[marketplaceId].amount += Number(charge.amount.amount || 0);
        });
    });
    return totals;
}
async function downloadReportDocument(executeFunctions, reportDocumentId, returnRaw, binaryPropertyName) {
    const response = await SpApiRequest_1.SpApiRequest.makeRequest(executeFunctions, {
        method: 'GET',
        endpoint: `/reports/2021-06-30/documents/${reportDocumentId}`,
    });
    const { url, compressionAlgorithm } = response.data;
    const documentResponse = await axios_1.default.get(url, { responseType: 'arraybuffer' });
    let dataBuffer = Buffer.from(documentResponse.data);
    if (compressionAlgorithm === 'GZIP') {
        dataBuffer = await gunzipAsync(dataBuffer);
    }
    if (!dataBuffer || dataBuffer.length === 0) {
        throw new n8n_workflow_1.NodeOperationError(executeFunctions.getNode(), 'Failed to download report document');
    }
    return {
        buffer: dataBuffer,
        binaryData: returnRaw
            ? {
                propertyName: binaryPropertyName,
                data: dataBuffer.toString('base64'),
                mimeType: compressionAlgorithm === 'GZIP' ? 'application/gzip' : 'text/plain',
                fileName: `${reportDocumentId}.${compressionAlgorithm === 'GZIP' ? 'gz' : 'txt'}`,
            }
            : undefined,
    };
}
async function createReportAndPoll(executeFunctions, reportType, dataStartTime, dataEndTime, marketplaceIds, advancedOptions, options) {
    const node = executeFunctions.getNode();
    const createResponse = await SpApiRequest_1.SpApiRequest.makeRequest(executeFunctions, {
        method: 'POST',
        endpoint: '/reports/2021-06-30/reports',
        body: {
            reportType,
            dataStartTime,
            dataEndTime,
            marketplaceIds,
            reportOptions: options,
        },
    });
    const reportId = createResponse.data.reportId;
    const maxPollTimeMs = (advancedOptions?.maxPollTimeMinutes ?? 10) * 60 * 1000;
    const pollIntervalMs = (advancedOptions?.pollIntervalSeconds ?? 30) * 1000;
    const start = Date.now();
    while (Date.now() - start < maxPollTimeMs) {
        await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
        const statusResponse = await SpApiRequest_1.SpApiRequest.makeRequest(executeFunctions, {
            method: 'GET',
            endpoint: `/reports/2021-06-30/reports/${reportId}`,
        });
        const status = statusResponse.data;
        switch (status.processingStatus) {
            case 'DONE':
            case 'DONE_NO_DATA':
                return status.reportDocumentId;
            case 'CANCELLED':
            case 'FATAL':
                throw new n8n_workflow_1.NodeOperationError(node, `Report ${reportType} failed with status ${status.processingStatus}`);
        }
    }
    throw new n8n_workflow_1.NodeOperationError(node, `Report ${reportType} timed out after ${advancedOptions?.maxPollTimeMinutes ?? 10} minutes`);
}
function parseReport(buffer) {
    try {
        return (0, sync_1.parse)(buffer.toString('utf8'), {
            columns: true,
            skip_empty_lines: true,
        });
    }
    catch (error) {
        throw new Error(`Failed to parse report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
function validateDateRange(start, end, nodeId) {
    const validation = SecurityValidator_1.securityValidator.validateDateRange(start, end, nodeId);
    if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
    }
}
async function executeReportsOperation(operation, itemIndex) {
    const nodeId = this.getNode().id;
    const dateFrom = this.getNodeParameter('dateFrom', itemIndex);
    const dateTo = this.getNodeParameter('dateTo', itemIndex);
    const marketplaceIds = this.getNodeParameter('marketplaceIds', itemIndex);
    const granularity = this.getNodeParameter('granularity', itemIndex);
    AuditLogger_1.auditLogger.logEvent({
        nodeId,
        action: 'operation_start',
        resource: 'reports',
        details: { operation, itemIndex },
        severity: 'low',
        source: 'user',
        outcome: 'success',
    });
    const marketplaceValidation = SecurityValidator_1.securityValidator.validateMarketplaceIds(marketplaceIds, nodeId);
    if (!marketplaceValidation.isValid) {
        throw new n8n_workflow_1.NodeOperationError(this.getNode(), marketplaceValidation.errors.join(', '));
    }
    try {
        validateDateRange(dateFrom, dateTo, nodeId);
    }
    catch (error) {
        throw new n8n_workflow_1.NodeOperationError(this.getNode(), error instanceof Error ? error.message : String(error));
    }
    switch (operation) {
        case 'salesTrafficByAsin':
            return await handleSalesTraffic.call(this, itemIndex, {
                reportType: REPORT_TYPE_MAP.salesTrafficByAsin,
                reportOptions: buildSalesTrafficOptions.call(this, itemIndex, granularity),
            });
        case 'returnsByAsinFba':
            return await handleReturns.call(this, itemIndex, REPORT_TYPE_MAP.returnsByAsinFba, 'FBA');
        case 'returnsByAsinMfn':
            return await handleReturns.call(this, itemIndex, REPORT_TYPE_MAP.returnsByAsinMfn, 'MFN');
        case 'consolidatedSalesAndReturnsByAsin':
            return await handleConsolidated.call(this, itemIndex);
        case 'refundsByAsin':
            return await handleRefunds.call(this, itemIndex);
        default:
            throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Unknown reports operation: ${operation}`);
    }
}
exports.executeReportsOperation = executeReportsOperation;
function buildSalesTrafficOptions(itemIndex, granularity) {
    const aggregationLevel = this.getNodeParameter('aggregationLevel', itemIndex, 'CHILD');
    const includeSessions = this.getNodeParameter('includeSessions', itemIndex, true);
    return {
        'aggregationLevel': aggregationLevel,
        'reportingPeriod': granularity,
        'includeASIN': 'true',
        'includeChildASIN': aggregationLevel === 'PARENT' ? 'false' : 'true',
        'includeSessions': includeSessions ? 'true' : 'false',
    };
}
async function handleSalesTraffic(itemIndex, options) {
    const dateFrom = this.getNodeParameter('dateFrom', itemIndex);
    const dateTo = this.getNodeParameter('dateTo', itemIndex);
    const marketplaceIds = this.getNodeParameter('marketplaceIds', itemIndex);
    const advancedOptions = this.getNodeParameter('advancedOptions', itemIndex, {});
    const reportDocumentId = await createReportAndPoll(this, options.reportType, dateFrom, dateTo, marketplaceIds, this.getNodeParameter('advancedOptions', itemIndex, {}), options.reportOptions);
    const { buffer, binaryData } = await downloadReportDocument(this, reportDocumentId, Boolean(advancedOptions?.returnRawDocument), advancedOptions?.binaryPropertyName || 'data');
    const rows = parseReport(buffer);
    const mapped = rows.map((row) => mapSalesTrafficRow(row));
    return mapped.map(row => {
        const item = {
            json: row,
            pairedItem: { item: itemIndex },
        };
        if (binaryData) {
            item.binary = {
                [binaryData.propertyName]: {
                    data: binaryData.data,
                    fileName: binaryData.fileName,
                    mimeType: binaryData.mimeType,
                },
            };
        }
        return item;
    });
}
async function handleReturns(itemIndex, reportType, channel) {
    const dateFrom = this.getNodeParameter('dateFrom', itemIndex);
    const dateTo = this.getNodeParameter('dateTo', itemIndex);
    const marketplaceIds = this.getNodeParameter('marketplaceIds', itemIndex);
    const advancedOptions = this.getNodeParameter('advancedOptions', itemIndex, {});
    const reportDocumentId = await createReportAndPoll(this, reportType, dateFrom, dateTo, marketplaceIds, this.getNodeParameter('advancedOptions', itemIndex, {}));
    const { buffer, binaryData } = await downloadReportDocument(this, reportDocumentId, Boolean(advancedOptions?.returnRawDocument), advancedOptions?.binaryPropertyName || 'data');
    const rows = parseReport(buffer);
    const mapped = rows.map(row => mapReturnsRow(row, channel));
    return mapped.map(row => {
        const item = {
            json: row,
            pairedItem: { item: itemIndex },
        };
        if (binaryData) {
            item.binary = {
                [binaryData.propertyName]: {
                    data: binaryData.data,
                    fileName: binaryData.fileName,
                    mimeType: binaryData.mimeType,
                },
            };
        }
        return item;
    });
}
async function handleConsolidated(itemIndex) {
    const includeRefunds = this.getNodeParameter('includeRefunds', itemIndex, false);
    const emitRawSubdatasets = this.getNodeParameter('emitRawSubdatasets', itemIndex, false);
    const operations = [
        handleSalesTraffic.call(this, itemIndex, {
            reportType: REPORT_TYPE_MAP.salesTrafficByAsin,
            reportOptions: buildSalesTrafficOptions.call(this, itemIndex, this.getNodeParameter('granularity', itemIndex)),
        }),
        handleReturns.call(this, itemIndex, REPORT_TYPE_MAP.returnsByAsinFba, 'FBA'),
        handleReturns.call(this, itemIndex, REPORT_TYPE_MAP.returnsByAsinMfn, 'MFN'),
    ];
    if (includeRefunds) {
        operations.push(handleRefunds.call(this, itemIndex));
    }
    const [sales, fbaReturns, mfnReturns, refunds] = await Promise.all(operations);
    const consolidatedMap = new Map();
    const keyFn = (row) => `${row.date}|${row.marketplaceId}|${row.asin || row.sku || ''}`;
    sales.forEach(item => {
        const salesRow = item.json;
        const asphaltUnits = Number(salesRow.orderedUnits || 0);
        const productSales = salesRow.orderedProductSales;
        const key = keyFn(salesRow);
        consolidatedMap.set(key, {
            date: salesRow.date,
            marketplaceId: salesRow.marketplaceId,
            asin: salesRow.asin,
            sku: salesRow.sku,
            orderedUnits: asphaltUnits,
            orderedProductSales: {
                amount: Number(productSales?.amount || 0),
                currencyCode: productSales?.currencyCode || 'USD',
            },
            fbaReturnedUnits: 0,
            mfnReturnedUnits: 0,
            refundsAmount: undefined,
            currencyCode: productSales?.currencyCode || 'USD',
        });
    });
    [fbaReturns, mfnReturns].forEach((dataset, index) => {
        dataset.forEach(item => {
            const returnsRow = item.json;
            const key = keyFn(returnsRow);
            const existing = consolidatedMap.get(key) || {
                date: returnsRow.date,
                marketplaceId: returnsRow.marketplaceId,
                asin: returnsRow.asin,
                sku: returnsRow.sku,
                orderedUnits: 0,
                orderedProductSales: { amount: 0, currencyCode: 'USD' },
                fbaReturnedUnits: 0,
                mfnReturnedUnits: 0,
                refundsAmount: undefined,
                currencyCode: 'USD',
            };
            const field = index === 0 ? 'fbaReturnedUnits' : 'mfnReturnedUnits';
            existing[field] += Number(returnsRow.returnedUnits || 0);
            consolidatedMap.set(key, existing);
        });
    });
    if (includeRefunds && refunds) {
        refunds.forEach(item => {
            const refundRow = item.json;
            const key = keyFn(refundRow);
            const existing = consolidatedMap.get(key);
            if (!existing) {
                consolidatedMap.set(key, {
                    date: refundRow.date,
                    marketplaceId: refundRow.marketplaceId,
                    asin: undefined,
                    sku: undefined,
                    orderedUnits: 0,
                    orderedProductSales: { amount: 0, currencyCode: refundRow.currencyCode || 'USD' },
                    fbaReturnedUnits: 0,
                    mfnReturnedUnits: 0,
                    refundsAmount: Number(refundRow.refundsAmount || 0),
                    currencyCode: refundRow.currencyCode || 'USD',
                });
            }
            else {
                existing.refundsAmount = Number(refundRow.refundsAmount || 0);
                existing.currencyCode = refundRow.currencyCode || existing.currencyCode || 'USD';
            }
        });
    }
    const consolidatedItems = Array.from(consolidatedMap.values()).map(value => ({
        json: value,
        pairedItem: { item: itemIndex },
    }));
    if (emitRawSubdatasets) {
        return [
            ...consolidatedItems,
            ...sales,
            ...fbaReturns,
            ...mfnReturns,
            ...(refunds || []),
        ];
    }
    return consolidatedItems;
}
async function handleRefunds(itemIndex) {
    const dateFrom = this.getNodeParameter('dateFrom', itemIndex);
    const dateTo = this.getNodeParameter('dateTo', itemIndex);
    const marketplaceIds = this.getNodeParameter('marketplaceIds', itemIndex);
    const response = await SpApiRequest_1.SpApiRequest.makeRequest(this, {
        method: 'GET',
        endpoint: '/finances/v0/refunds',
        query: {
            postedAfter: dateFrom,
            postedBefore: dateTo,
        },
    });
    const refundEvents = response.data.payload?.RefundEventList || [];
    const totalsByMarketplace = sumRefundEvents(refundEvents);
    const items = [];
    Object.entries(totalsByMarketplace).forEach(([marketplaceId, totals]) => {
        if (!marketplaceIds.includes(marketplaceId)) {
            return;
        }
        items.push({
            json: {
                date: dateTo,
                marketplaceId,
                refundsAmount: totals.amount,
                currencyCode: totals.currencyCode,
            },
            pairedItem: { item: itemIndex },
        });
    });
    return items;
}
