export interface AnalyticsMetric {
    id: string;
    displayName: string;
    description: string;
    category: 'traffic' | 'sales' | 'conversion' | 'buybox' | 'computed';
    dataType: 'number' | 'percentage' | 'currency';
    computedFormula?: string;
}
export interface SchemaVersion {
    version: string;
    displayName: string;
    description: string;
    supportedMetrics: string[];
    supportedDimensions: string[];
    maxDateRange: number;
}
export declare const SCHEMA_VERSIONS: Record<string, SchemaVersion>;
export declare const ANALYTICS_METRICS: Record<string, AnalyticsMetric>;
export declare const METRIC_CATEGORIES: {
    traffic: {
        displayName: string;
        description: string;
        metrics: string[];
    };
    sales: {
        displayName: string;
        description: string;
        metrics: string[];
    };
    conversion: {
        displayName: string;
        description: string;
        metrics: string[];
    };
    buybox: {
        displayName: string;
        description: string;
        metrics: string[];
    };
    computed: {
        displayName: string;
        description: string;
        metrics: string[];
    };
};
export declare const DATE_PRESETS: {
    today: {
        displayName: string;
        days: number;
        offset: number;
    };
    yesterday: {
        displayName: string;
        days: number;
        offset: number;
    };
    last7days: {
        displayName: string;
        days: number;
        offset: number;
    };
    last30days: {
        displayName: string;
        days: number;
        offset: number;
    };
    last90days: {
        displayName: string;
        days: number;
        offset: number;
    };
    mtd: {
        displayName: string;
        days: string;
        offset: number;
    };
    qtd: {
        displayName: string;
        days: string;
        offset: number;
    };
    ytd: {
        displayName: string;
        days: string;
        offset: number;
    };
};
export declare const ANALYTICS_MODES: {
    dataKiosk: {
        value: string;
        displayName: string;
        description: string;
    };
    reports: {
        value: string;
        displayName: string;
        description: string;
    };
    auto: {
        value: string;
        displayName: string;
        description: string;
    };
};
export declare function buildDataKioskEndpoint(schemaVersion: string, resource: string): string;
export declare function buildAnalyticsEndpoint(schemaVersion: string, resource: string): string;
export declare const REPORTS_FALLBACK_MAPPING: {
    salesAndTrafficByAsin: {
        reportType: string;
        description: string;
        supportedMetrics: string[];
    };
};
export declare const SUPPORTED_CURRENCIES: string[];
export declare const DEFAULT_SETTINGS: {
    schemaVersion: string;
    analyticsMode: string;
    granularity: string;
    pageSize: number;
    maxResults: number;
    includeZeroActivity: boolean;
    outputFormat: string;
    csvDelimiter: string;
    csvDecimalSeparator: string;
    timezone: string;
};
