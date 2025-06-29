import { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
export declare function getGstReport(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]>;
export declare function getVatInvoiceReport(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]>;
export declare function getVatInvoicePdfLinks(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]>;
