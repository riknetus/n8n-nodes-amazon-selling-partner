"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeDataKioskOperation = void 0;
const n8n_workflow_1 = require("n8n-workflow");
const SpApiRequest_1 = require("../helpers/SpApiRequest");
const downloadPresigned_1 = require("../helpers/downloadPresigned");
const graphql_1 = require("../helpers/graphql");
const DATA_KIOSK_BASE = '/dataKiosk/2023-11-15';
async function executeDataKioskOperation(operation, itemIndex) {
    switch (operation) {
        case 'createQuery':
            return await createQuery.call(this, itemIndex);
        case 'getQueries':
            return await getQueries.call(this, itemIndex);
        case 'getQuery':
            return await getQuery.call(this, itemIndex);
        case 'cancelQuery':
            return await cancelQuery.call(this, itemIndex);
        case 'getDocument':
            return await getDocument.call(this, itemIndex);
        case 'runQueryAndDownload':
            return await runQueryAndDownload.call(this, itemIndex);
        default:
            throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Unknown dataKiosk operation: ${operation}`);
    }
}
exports.executeDataKioskOperation = executeDataKioskOperation;
async function createQuery(index) {
    let query = this.getNodeParameter('query', index);
    const minify = this.getNodeParameter('minifyGraphql', index, true);
    const paginationToken = this.getNodeParameter('paginationToken', index, '');
    if (minify) {
        query = (0, graphql_1.minifyGraphql)(query);
    }
    if (query.length > 8000) {
        throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'GraphQL query exceeds 8000 characters after minification');
    }
    const body = { query };
    if (paginationToken)
        body.paginationToken = paginationToken;
    const res = await SpApiRequest_1.SpApiRequest.makeRequest(this, {
        method: 'POST',
        endpoint: `${DATA_KIOSK_BASE}/queries`,
        body,
    });
    return [{ json: { queryId: res.data.queryId } }];
}
async function getQueries(index) {
    const processingStatuses = this.getNodeParameter('processingStatuses', index, []);
    const pageSize = this.getNodeParameter('pageSize', index, 10);
    const createdSince = this.getNodeParameter('createdSince', index, '');
    const createdUntil = this.getNodeParameter('createdUntil', index, '');
    const paginationToken = this.getNodeParameter('paginationToken', index, '');
    const query = {};
    if (processingStatuses?.length)
        query.processingStatuses = processingStatuses;
    if (pageSize)
        query.pageSize = pageSize;
    if (createdSince)
        query.createdSince = createdSince;
    if (createdUntil)
        query.createdUntil = createdUntil;
    if (paginationToken)
        query.paginationToken = paginationToken;
    const res = await SpApiRequest_1.SpApiRequest.makeRequest(this, {
        method: 'GET',
        endpoint: `${DATA_KIOSK_BASE}/queries`,
        query,
    });
    return [{ json: res.data }];
}
async function getQuery(index) {
    const queryId = this.getNodeParameter('queryId', index);
    const res = await SpApiRequest_1.SpApiRequest.makeRequest(this, {
        method: 'GET',
        endpoint: `${DATA_KIOSK_BASE}/queries/${encodeURIComponent(queryId)}`,
    });
    return [{ json: res.data }];
}
async function cancelQuery(index) {
    const queryId = this.getNodeParameter('queryId', index);
    await SpApiRequest_1.SpApiRequest.makeRequest(this, {
        method: 'DELETE',
        endpoint: `${DATA_KIOSK_BASE}/queries/${encodeURIComponent(queryId)}`,
    });
    return [{ json: { success: true, queryId } }];
}
async function getDocument(index) {
    const documentId = this.getNodeParameter('documentId', index);
    const output = this.getNodeParameter('output', index, 'binary');
    const binaryPropertyName = this.getNodeParameter('binaryPropertyName', index, 'dataKioskFile');
    const meta = await SpApiRequest_1.SpApiRequest.makeRequest(this, {
        method: 'GET',
        endpoint: `${DATA_KIOSK_BASE}/documents/${encodeURIComponent(documentId)}`,
    });
    const { buffer, contentType } = await (0, downloadPresigned_1.downloadPresigned)(meta.data.documentUrl);
    if (output === 'text') {
        return [{ json: { documentId, contentType, content: buffer.toString('utf-8') } }];
    }
    return [{
            json: { documentId, contentType },
            binary: {
                [binaryPropertyName]: {
                    data: buffer.toString('base64'),
                    fileName: `${documentId}.dat`,
                    mimeType: contentType || 'application/octet-stream',
                },
            },
        }];
}
async function runQueryAndDownload(index) {
    const metricsCollectorModule = await Promise.resolve().then(() => __importStar(require('../core/MetricsCollector')));
    const metricsCollector = metricsCollectorModule.metricsCollector;
    let query = this.getNodeParameter('query', index);
    const minify = this.getNodeParameter('minifyGraphql', index, true);
    const output = this.getNodeParameter('output', index, 'binary');
    const binaryPropertyName = this.getNodeParameter('binaryPropertyName', index, 'dataKioskFile');
    const pollIntervalMs = this.getNodeParameter('pollIntervalMs', index, 2000);
    const timeoutMs = this.getNodeParameter('timeoutMs', index, 300000);
    const multiPageHandling = this.getNodeParameter('multiPageHandling', index, 'keepPagesSeparate');
    if (minify)
        query = (0, graphql_1.minifyGraphql)(query);
    if (query.length > 8000) {
        throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'GraphQL query exceeds 8000 characters after minification');
    }
    const startedAt = Date.now();
    const items = [];
    let paginationToken = undefined;
    let pageIndex = 0;
    const requestMetrics = (success, errorCode) => {
        metricsCollector.recordApiRequest('dataKiosk', Date.now() - startedAt, success, errorCode);
    };
    do {
        // 1) Create query
        const createRes = await SpApiRequest_1.SpApiRequest.makeRequest(this, {
            method: 'POST',
            endpoint: `${DATA_KIOSK_BASE}/queries`,
            body: paginationToken ? { query, paginationToken } : { query },
        });
        const queryId = createRes.data.queryId;
        // 2) Poll status
        let status;
        do {
            if (Date.now() - startedAt > timeoutMs) {
                requestMetrics(false, 'TIMEOUT');
                throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'Timeout while waiting for Data Kiosk query to complete');
            }
            await new Promise((r) => setTimeout(r, pollIntervalMs));
            const statusRes = await SpApiRequest_1.SpApiRequest.makeRequest(this, {
                method: 'GET',
                endpoint: `${DATA_KIOSK_BASE}/queries/${encodeURIComponent(queryId)}`,
            });
            status = statusRes.data;
        } while (status && (status.processingStatus === 'IN_QUEUE' || status.processingStatus === 'IN_PROGRESS'));
        if (!status) {
            requestMetrics(false, 'NO_STATUS');
            throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'Unable to fetch query status');
        }
        if (status.processingStatus === 'FATAL') {
            if (status.errorDocumentId) {
                const docMeta = await SpApiRequest_1.SpApiRequest.makeRequest(this, {
                    method: 'GET',
                    endpoint: `${DATA_KIOSK_BASE}/documents/${encodeURIComponent(status.errorDocumentId)}`,
                });
                const { buffer, contentType } = await (0, downloadPresigned_1.downloadPresigned)(docMeta.data.documentUrl);
                throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Data Kiosk query failed. errorDocumentId=${status.errorDocumentId}, contentType=${contentType}, content=${buffer.toString('utf-8').slice(0, 500)}`);
            }
            throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'Data Kiosk query failed with FATAL status');
        }
        if (status.processingStatus === 'CANCELLED') {
            throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'Data Kiosk query was cancelled');
        }
        // 3) Download data document if present
        if (status.dataDocumentId) {
            const meta = await SpApiRequest_1.SpApiRequest.makeRequest(this, {
                method: 'GET',
                endpoint: `${DATA_KIOSK_BASE}/documents/${encodeURIComponent(status.dataDocumentId)}`,
            });
            const { buffer, contentType } = await (0, downloadPresigned_1.downloadPresigned)(meta.data.documentUrl);
            if (output === 'text') {
                items.push({ json: {
                        queryId: status.queryId,
                        pageIndex,
                        contentType,
                        content: buffer.toString('utf-8'),
                        processingStatus: status.processingStatus,
                        processingStartTime: status.processingStartTime,
                        processingEndTime: status.processingEndTime,
                    } });
            }
            else {
                items.push({
                    json: {
                        queryId: status.queryId,
                        pageIndex,
                        contentType,
                        processingStatus: status.processingStatus,
                        processingStartTime: status.processingStartTime,
                        processingEndTime: status.processingEndTime,
                    },
                    binary: {
                        [binaryPropertyName]: {
                            data: buffer.toString('base64'),
                            fileName: `${status.queryId}_${pageIndex}.dat`,
                            mimeType: contentType || 'application/octet-stream',
                        },
                    },
                });
            }
        }
        // 4) Handle pagination token from status
        paginationToken = status.pagination?.nextToken;
        pageIndex += 1;
        if (multiPageHandling === 'stopAfterFirst')
            break;
        requestMetrics(true);
    } while (paginationToken);
    return items;
}
