"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeAnalyticsOperation = void 0;
const n8n_workflow_1 = require("n8n-workflow");
const SpApiRequest_1 = require("../helpers/SpApiRequest");
const AuditLogger_1 = require("../core/AuditLogger");
// Main execution function
async function executeAnalyticsOperation(operation, index) {
    switch (operation) {
        case 'validateAccess':
            return await validateAnalyticsAccess.call(this, index);
        default:
            throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Unknown analytics operation: ${operation}`);
    }
}
exports.executeAnalyticsOperation = executeAnalyticsOperation;
// Validate Analytics Access
async function validateAnalyticsAccess(_index) {
    const nodeId = this.getNode().id;
    try {
        let dataKioskAccess = false;
        let reportsAccess = false;
        const errors = [];
        // Probe Data Kiosk access (lightweight query)
        try {
            await SpApiRequest_1.SpApiRequest.makeRequest(this, {
                method: 'GET',
                endpoint: '/dataKiosk/2023-11-15/queries',
                query: { pageSize: 1 },
            });
            dataKioskAccess = true;
        }
        catch (error) {
            errors.push(`Data Kiosk: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        // Probe Reports API access
        try {
            await SpApiRequest_1.SpApiRequest.makeRequest(this, {
                method: 'GET',
                endpoint: '/reports/2021-06-30/reports',
                query: { reportTypes: 'GET_SALES_AND_TRAFFIC_REPORT' },
            });
            reportsAccess = true;
        }
        catch (error) {
            errors.push(`Reports API: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        const result = {
            success: dataKioskAccess || reportsAccess,
            dataKioskAccess,
            reportsAccess,
            recommendedMode: dataKioskAccess ? 'dataKiosk' : reportsAccess ? 'reports' : 'none',
            errors: errors.length > 0 ? errors : undefined,
            timestamp: new Date().toISOString(),
        };
        AuditLogger_1.auditLogger.logEvent({
            nodeId,
            action: 'analytics_access_validation',
            resource: 'analytics',
            details: result,
            severity: result.success ? 'low' : 'high',
            source: 'system',
            outcome: result.success ? 'success' : 'failure',
        });
        return [{ json: result }];
    }
    catch (error) {
        throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Failed to validate analytics access: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
