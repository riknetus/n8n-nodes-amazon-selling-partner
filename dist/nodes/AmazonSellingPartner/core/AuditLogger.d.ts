import { EventEmitter } from 'events';
export interface AuditEvent {
    id: string;
    timestamp: Date;
    userId?: string;
    nodeId: string;
    action: string;
    resource: string;
    details: Record<string, any>;
    severity: 'low' | 'medium' | 'high' | 'critical';
    source: 'user' | 'system' | 'api';
    outcome: 'success' | 'failure' | 'warning';
    ipAddress?: string;
    userAgent?: string;
}
export interface SecurityEvent extends AuditEvent {
    threatLevel: 'low' | 'medium' | 'high' | 'critical';
    attackVector?: string;
    mitigationAction?: string;
}
export interface AlertRule {
    id: string;
    name: string;
    condition: (event: AuditEvent) => boolean;
    severity: 'low' | 'medium' | 'high' | 'critical';
    enabled: boolean;
    cooldownMs: number;
    lastTriggered?: Date;
}
export declare class AuditLogger extends EventEmitter {
    private events;
    private securityEvents;
    private alertRules;
    private readonly maxEventsHistory;
    private readonly maxSecurityEventsHistory;
    constructor();
    /**
     * Log an audit event
     */
    logEvent(event: Omit<AuditEvent, 'id' | 'timestamp'>): void;
    /**
     * Log a security-specific event
     */
    logSecurityEvent(event: Omit<SecurityEvent, 'id' | 'timestamp'>): void;
    /**
     * Log API access attempt
     */
    logApiAccess(nodeId: string, endpoint: string, success: boolean, details?: Record<string, any>): void;
    /**
     * Log credential usage
     */
    logCredentialUsage(nodeId: string, credentialType: string, success: boolean, details?: Record<string, any>): void;
    /**
     * Log authentication event
     */
    logAuthentication(nodeId: string, method: string, success: boolean, details?: Record<string, any>): void;
    /**
     * Log rate limiting event
     */
    logRateLimit(nodeId: string, endpoint: string, details?: Record<string, any>): void;
    /**
     * Log error event
     */
    logError(nodeId: string, error: Error, context?: Record<string, any>): void;
    /**
     * Log suspicious activity
     */
    logSuspiciousActivity(nodeId: string, activity: string, details?: Record<string, any>): void;
    /**
     * Get audit events with optional filtering
     */
    getEvents(filter?: {
        severity?: string[];
        action?: string[];
        resource?: string[];
        outcome?: string[];
        timeRange?: {
            start: Date;
            end: Date;
        };
        limit?: number;
    }): AuditEvent[];
    /**
     * Get security events
     */
    getSecurityEvents(limit?: number): SecurityEvent[];
    /**
     * Add custom alert rule
     */
    addAlertRule(rule: AlertRule): void;
    /**
     * Remove alert rule
     */
    removeAlertRule(ruleId: string): void;
    /**
     * Get statistics summary
     */
    getStatistics(timeWindowMs?: number): Record<string, any>;
    /**
     * Export events for external analysis
     */
    exportEvents(format?: 'json' | 'csv', filter?: Parameters<typeof this.getEvents>[0]): string;
    private generateEventId;
    private initializeDefaultAlertRules;
    private checkAlertRules;
    private triggerAlert;
    private triggerSecurityAlert;
}
export declare const auditLogger: AuditLogger;
