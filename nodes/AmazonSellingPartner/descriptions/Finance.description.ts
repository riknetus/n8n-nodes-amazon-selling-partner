import { INodeProperties } from 'n8n-workflow';

export const financeOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['finance'],
			},
		},
		options: [
			{
				name: 'List Financial Event Groups',
				value: 'listFinancialEventGroups',
				description: 'Retrieve financial event groups within a specified date range',
				action: 'List financial event groups',
			},
			{
				name: 'List Financial Events by Group ID',
				value: 'listFinancialEventsByGroupId',
				description: 'Retrieve all financial events for a specific financial event group',
				action: 'List financial events by group ID',
			},
			{
				name: 'List Financial Events by Order ID',
				value: 'listFinancialEventsByOrderId',
				description: 'Retrieve all financial events for a specific order',
				action: 'List financial events by order ID',
			},
			{
				name: 'List Financial Events',
				value: 'listFinancialEvents',
				description: 'Retrieve financial events within a specified date range',
				action: 'List financial events',
			},
		],
		default: 'listFinancialEventGroups',
	},
];

export const financeFields: INodeProperties[] = [
	// List Financial Event Groups operation fields
	{
		displayName: 'Financial Event Group Started After',
		name: 'financialEventGroupStartedAfter',
		type: 'dateTime',
		required: false,
		displayOptions: {
			show: {
				resource: ['finance'],
				operation: ['listFinancialEventGroups'],
			},
		},
		default: '',
		description: 'Date used for selecting financial event groups that opened after (or at) a specified date and time (ISO 8601 format)',
	},
	{
		displayName: 'Financial Event Group Started Before',
		name: 'financialEventGroupStartedBefore',
		type: 'dateTime',
		required: false,
		displayOptions: {
			show: {
				resource: ['finance'],
				operation: ['listFinancialEventGroups'],
			},
		},
		default: '',
		description: 'Date used for selecting financial event groups that opened before (but not at) a specified date and time (ISO 8601 format)',
	},
	{
		displayName: 'Additional Options',
		name: 'additionalOptions',
		type: 'collection',
		placeholder: 'Add Option',
		displayOptions: {
			show: {
				resource: ['finance'],
				operation: ['listFinancialEventGroups'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Max Results Per Page',
				name: 'maxResultsPerPage',
				type: 'number',
				typeOptions: {
					minValue: 1,
					maxValue: 100,
				},
				default: 10,
				description: 'Maximum number of results to return per page (1-100)',
			},
			{
				displayName: 'Return All Results',
				name: 'returnAll',
				type: 'boolean',
				default: true,
				description: 'Whether to return all results by automatically handling pagination',
			},
		],
	},

	// List Financial Events by Group ID operation fields
	{
		displayName: 'Event Group ID',
		name: 'eventGroupId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['finance'],
				operation: ['listFinancialEventsByGroupId'],
			},
		},
		default: '',
		description: 'The identifier of the financial event group to which the events belong',
	},
	{
		displayName: 'Posted After',
		name: 'postedAfter',
		type: 'dateTime',
		required: false,
		displayOptions: {
			show: {
				resource: ['finance'],
				operation: ['listFinancialEventsByGroupId', 'listFinancialEvents'],
			},
		},
		default: '',
		description: 'Date used for selecting financial events posted after (or at) a specified time (ISO 8601 format)',
	},
	{
		displayName: 'Posted Before',
		name: 'postedBefore',
		type: 'dateTime',
		required: false,
		displayOptions: {
			show: {
				resource: ['finance'],
				operation: ['listFinancialEventsByGroupId', 'listFinancialEvents'],
			},
		},
		default: '',
		description: 'Date used for selecting financial events posted before (but not at) a specified time (ISO 8601 format)',
	},
	{
		displayName: 'Additional Options',
		name: 'additionalOptions',
		type: 'collection',
		placeholder: 'Add Option',
		displayOptions: {
			show: {
				resource: ['finance'],
				operation: ['listFinancialEventsByGroupId'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Max Results Per Page',
				name: 'maxResultsPerPage',
				type: 'number',
				typeOptions: {
					minValue: 1,
					maxValue: 100,
				},
				default: 100,
				description: 'Maximum number of results to return per page (1-100)',
			},
			{
				displayName: 'Return All Results',
				name: 'returnAll',
				type: 'boolean',
				default: true,
				description: 'Whether to return all results by automatically handling pagination',
			},
		],
	},

	// List Financial Events by Order ID operation fields
	{
		displayName: 'Order ID',
		name: 'orderId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['finance'],
				operation: ['listFinancialEventsByOrderId'],
			},
		},
		default: '',
		description: 'An Amazon-defined order identifier (3-7-7 format)',
	},
	{
		displayName: 'Additional Options',
		name: 'additionalOptions',
		type: 'collection',
		placeholder: 'Add Option',
		displayOptions: {
			show: {
				resource: ['finance'],
				operation: ['listFinancialEventsByOrderId'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Max Results Per Page',
				name: 'maxResultsPerPage',
				type: 'number',
				typeOptions: {
					minValue: 1,
					maxValue: 100,
				},
				default: 100,
				description: 'Maximum number of results to return per page (1-100)',
			},
			{
				displayName: 'Return All Results',
				name: 'returnAll',
				type: 'boolean',
				default: true,
				description: 'Whether to return all results by automatically handling pagination',
			},
		],
	},

	// List Financial Events operation fields
	{
		displayName: 'Additional Options',
		name: 'additionalOptions',
		type: 'collection',
		placeholder: 'Add Option',
		displayOptions: {
			show: {
				resource: ['finance'],
				operation: ['listFinancialEvents'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Max Results Per Page',
				name: 'maxResultsPerPage',
				type: 'number',
				typeOptions: {
					minValue: 1,
					maxValue: 100,
				},
				default: 100,
				description: 'Maximum number of results to return per page (1-100)',
			},
			{
				displayName: 'Return All Results',
				name: 'returnAll',
				type: 'boolean',
				default: true,
				description: 'Whether to return all results by automatically handling pagination',
			},
		],
	},
];
