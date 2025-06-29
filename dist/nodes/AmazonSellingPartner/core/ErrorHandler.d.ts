import { AxiosResponse, AxiosError } from 'axios';
import { NodeOperationError } from 'n8n-workflow';
export declare class ErrorHandler {
    static handleApiError(response: AxiosResponse): Promise<NodeOperationError>;
    static handleNetworkError(error: AxiosError): Promise<NodeOperationError>;
}
