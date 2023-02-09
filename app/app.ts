require('dotenv').config()
import express from 'express';
import { Request, Response } from 'express';
import jwtDecode from 'jwt-decode';
import { TokenSet } from 'openid-client';
import cors from 'cors';

import { XeroAccessToken, XeroIdToken, XeroClient, Contact, LineItem, Invoice, Invoices, Phone, Contacts } from 'xero-node';

const session = require('express-session');

const client_id: string = process.env.CLIENT_ID;
const client_secret: string = process.env.CLIENT_SECRET;
const redirectUrl: string = process.env.REDIRECT_URI;
const scopes: string = 'openid profile email accounting.settings accounting.reports.read accounting.journals.read accounting.contacts accounting.attachments accounting.transactions offline_access';

const xero = new XeroClient({
	clientId: client_id,
	clientSecret: client_secret,
	redirectUris: [redirectUrl],
	scopes: scopes.split(' '),
});

if (!client_id || !client_secret || !redirectUrl) {
	throw Error('Environment Variables not all set - please check your .env file in the project root or create one!')
}

const app: express.Application = express();
app.use(cors())
app.use(express.static(__dirname + '/build'));

app.use(session({
	secret: 'something crazy',
	resave: false,
	saveUninitialized: true,
	cookie: { secure: false },
}));

const authenticationData: any = (req: Request, res: Response) => {
	return {
		decodedIdToken: req.session.decodedIdToken,
		decodedAccessToken: req.session.decodedAccessToken,
		tokenSet: req.session.tokenSet,
		allTenants: req.session.allTenants,
		activeTenant: req.session.activeTenant,
	};
};

app.get('/', (req: Request, res: Response) => {
	res.send(`<a href='/connect'>Connect to Xero</a>`);
});

app.get('/connect', async (req: Request, res: Response) => {
	try {
		const consentUrl: string = await xero.buildConsentUrl();
		res.redirect(consentUrl);
	} catch (err) {
		res.send('Sorry, something went wrong');
	}
});

app.get('/callback', async (req: Request, res: Response) => {
	try {
		const tokenSet: TokenSet = await xero.apiCallback(req.url);
		await xero.updateTenants();
		const decodedIdToken: XeroIdToken = jwtDecode(tokenSet.id_token);
		const decodedAccessToken: XeroAccessToken = jwtDecode(tokenSet.access_token);
		req.session.decodedIdToken = decodedIdToken;
		req.session.decodedAccessToken = decodedAccessToken;
		req.session.tokenSet = tokenSet;
		req.session.allTenants = xero.tenants;
		// XeroClient is sorting tenants behind the scenes so that most recent / active connection is at index 0
		req.session.activeTenant = xero.tenants[0];
		const authData: any = authenticationData(req, res);
		console.log(authData);
		res.redirect('/organisation');
	} catch (err) {
		res.send('Sorry, something went wrong');
	}
});

app.get('/organisation', async (req: Request, res: Response) => {
	try {
		const tokenSet: TokenSet = await xero.readTokenSet();
		console.log(tokenSet.expired() ? 'expired' : 'valid');
		const response: any = await xero.accountingApi.getOrganisations(req.session.activeTenant.tenantId);
		res.send(`Hello, ${response.body.organisations[0].name}`);
	} catch (err) {
		res.send('Sorry, something went wrong');
	}
});

app.get('/getBankTransactions', async (req: Request, res: Response) => {
	try {
		const profit = await xero.accountingApi.getBankTransactions(req.session.activeTenant.tenantId);
		console.log('profit: ', JSON.stringify(profit.body));
		res.json(profit.body);
	} catch (err) {
		res.json(err);
	}
});

app.get('/getBankTransfers', async (req: Request, res: Response) => {
	try {
		const profit = await xero.accountingApi.getBankTransfers(req.session.activeTenant.tenantId);
		console.log('profit: ', JSON.stringify(profit.body));
		res.json(profit.body);
	} catch (err) {
		res.json(err);
	}
});

//getCurrencies
app.get('/getCurrencies', async (req: Request, res: Response) => {
	try {
		const profit = await xero.accountingApi.getCurrencies(req.session.activeTenant.tenantId);
		console.log('profit: ', JSON.stringify(profit.body));
		res.json(profit.body);
	} catch (err) {
		res.json(err);
	}
});

//getOrganisations
app.get('/getOrganisations', async (req: Request, res: Response) => {
	try {
		const profit = await xero.accountingApi.getOrganisations(req.session.activeTenant.tenantId);
		console.log('profit: ', JSON.stringify(profit.body));
		res.json(profit.body);
	} catch (err) {
		res.json(err);
	}
});

//getOverpayments
app.get('/getOverpayments', async (req: Request, res: Response) => {
	try {
		const profit = await xero.accountingApi.getOverpayments(req.session.activeTenant.tenantId);
		console.log('profit: ', JSON.stringify(profit.body));
		res.json(profit.body);
	} catch (err) {
		res.json(err);
	}
});

//getReportProfitAndLoss
app.get('/getReportProfitAndLoss', async (req: Request, res: Response) => {
	var totalincome;
	var totalcostofsales = 0;
	var grossProfitPercent = 0;
	var totaloperatingexpense = 0;
	var netprofit = 0;
	try {
		const profit = await xero.accountingApi.getReportProfitAndLoss(req.session.activeTenant.tenantId,'2022-12-01');
		console.log('profit: ', JSON.stringify(profit.body));
        totalincome = profit.body['reports'][0]['rows'];
		res.json(profit.body);
	} catch (err) {
		console.log("error occured");	
		res.json(err);
	}
});

//getReportProfitAndLoss
app.get('/getReportBalanceSheet', async (req: Request, res: Response) => {
	try {
		const profit = await xero.accountingApi.getReportBalanceSheet(req.session.activeTenant.tenantId,'2022-12-01');
		console.log('profit: ', JSON.stringify(profit.body));
		res.json(profit.body);
	} catch (err) {
		console.log("error occured");	
		res.json(err);
	}
});

//finance api
app.get('/getFinancialStatementCashflow', async (req: Request, res: Response) => {
	try {
		const profit = await xero.financeApi.getFinancialStatementCashflow(req.session.activeTenant.tenantId);
		console.log('profit: ', JSON.stringify(profit.body));
		res.json(profit.body);
	} catch (err) {
		console.log("error occured");	
		res.json(err);
	}
});

//getReportExecutiveSummary
app.get('/getReportExecutiveSummary', async (req: Request, res: Response) => {
	try {
		const profit = await xero.accountingApi.getReportExecutiveSummary(req.session.activeTenant.tenantId,'2022-12-01');
		console.log('getReportExecutiveSummary: ', JSON.stringify(profit.body));
		res.json(profit.body);
	} catch (err) {
		res.json(err);
	}
});

//getPurchaseOrderHistory
app.get('/getPurchaseOrderHistory', async (req: Request, res: Response) => {
	try {
		const profit = await xero.accountingApi.getPurchaseOrderHistory(req.session.activeTenant.tenantId,'8086ffca-9fb1-4415-8cec-253f223f92f1');
		console.log('profit: ', JSON.stringify(profit.body));
		res.json(profit.body);
	} catch (err) {
		res.json(err);
	}
});

//getPurchaseOrder
app.get('/getPurchaseOrder', async (req: Request, res: Response) => {
	try {
		const profit = await xero.accountingApi.getPurchaseOrder(req.session.activeTenant.tenantId,'8086ffca-9fb1-4415-8cec-253f223f92f1');
		console.log('profit: ', JSON.stringify(profit.body));
		res.json(profit.body);
	} catch (err) {
		res.json(err);
	}
});

//getPrepayments
app.get('/getPrepayments', async (req: Request, res: Response) => {
	try {
		const profit = await xero.accountingApi.getPrepayments(req.session.activeTenant.tenantId);
		console.log('profit: ', JSON.stringify(profit.body));
		res.json(profit.body);
	} catch (err) {
		res.json(err);
	}
});

//getRepeatingInvoices
app.get('/getRepeatingInvoices', async (req: Request, res: Response) => {
	try {
		const profit = await xero.accountingApi.getRepeatingInvoices(req.session.activeTenant.tenantId,'8086ffca-9fb1-4415-8cec-253f223f92f1');
		console.log('profit: ', JSON.stringify(profit.body));
		res.json(profit.body);
	} catch (err) {
		res.json(err);
	}
});

//getReportsList
app.get('/getReportsList', async (req: Request, res: Response) => {
	try {
		const profit = await xero.accountingApi.getReportsList(req.session.activeTenant.tenantId);
		console.log('profit: ', JSON.stringify(profit.body));
		res.json(profit.body);
	} catch (err) {
		res.json(err);
	}
});

//getTrackingCategories
app.get('/getTrackingCategories', async (req: Request, res: Response) => {
	try {
		const profit = await xero.accountingApi.getTrackingCategories(req.session.activeTenant.tenantId);
		console.log('profit: ', JSON.stringify(profit.body));
		res.json(profit.body);
	} catch (err) {
		res.json(err);
	}
});

//getUser
app.get('/getUser', async (req: Request, res: Response) => {
	try {
		const profit = await xero.accountingApi.getUser(req.session.activeTenant.tenantId,'8086ffca-9fb1-4415-8cec-253f223f92f1');
		console.log('profit: ', JSON.stringify(profit.body));
		res.json(profit.body);
	} catch (err) {
		res.json(err);
	}
});

//getUsers
app.get('/getUsers', async (req: Request, res: Response) => {
	try {
		const profit = await xero.accountingApi.getUsers(req.session.activeTenant.tenantId);
		console.log('profit: ', JSON.stringify(profit.body));
		res.json(profit.body);
	} catch (err) {
		res.json(err);
	}
});

//getTaxRates
app.get('/getTaxRates', async (req: Request, res: Response) => {
	try {
		const profit = await xero.accountingApi.getTaxRates(req.session.activeTenant.tenantId);
		console.log('profit: ', JSON.stringify(profit.body));
		res.json(profit.body);
	} catch (err) {
		res.json(err);
	}
});

//getPurchaseOrders
app.get('/getPurchaseOrders', async (req: Request, res: Response) => {
	try {
		const profit = await xero.accountingApi.getPurchaseOrders(req.session.activeTenant.tenantId);
		console.log('profit: ', JSON.stringify(profit.body));
		res.json(profit.body);
	} catch (err) {
		res.json(err);
	}
});

//getBudgets
app.get('/getBudgets', async (req: Request, res: Response) => {
	try {
		const profit = await xero.accountingApi.getBudgets(req.session.activeTenant.tenantId);
		console.log('profit: ', JSON.stringify(profit.body));
		res.json(profit.body);
	} catch (err) {
		res.json(err);
	}
});

app.get('/getBatchPayments', async (req: Request, res: Response) => {
	try {
		const profit = await xero.accountingApi.getBatchPayments(req.session.activeTenant.tenantId);
		console.log('profit: ', JSON.stringify(profit.body));
		res.json(profit.body);
	} catch (err) {
		res.json(err);
	}
});

//get one account
app.get('/getAccount', async (req: Request, res: Response) => {
	try {
		const account = await xero.accountingApi.getAccounts(req.session.activeTenant.tenantId);
		console.log('getAccount: ', JSON.stringify(account.body));
		res.json(account.body);
	} catch (err) {
		res.json(err);
	}
});

//get accounts
app.get('/getAccounts', async (req: Request, res: Response) => {
	try {
		const account = await xero.accountingApi.getAccounts(req.session.activeTenant.tenantId);
		console.log('getAccounts: ', JSON.stringify(account.body));
		res.json(account.body);
	} catch (err) {
		res.json(err);
	}
});

app.get('/invoice', async (req: Request, res: Response) => {
	try {
		const contacts = await xero.accountingApi.getContacts(req.session.activeTenant.tenantId);
		//const profit = await xero.accountingApi.getReportProfitAndLoss(req.session.activeTenant.tenantId);
		const profit = await xero.accountingApi.getBankTransactions(req.session.activeTenant.tenantId);
		console.log('profit: ', JSON.stringify(profit.body));
		res.json(profit.body);
	} catch (err) {
		res.json(err);
	}
});


const PORT = process.env.PORT || 4100;

app.listen(PORT, () => {
	console.log(`App listening on port ${PORT}`);
});