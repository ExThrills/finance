# Integrating Plaid API (Sandbox) with Next.js and Supabase

## 1\. Plaid Developer Account Setup and API Keys

Begin by creating a Plaid developer account on the [Plaid Dashboard](https://dashboard.plaid.com). In the Dashboard, navigate to **Team Settings → Keys** to find your **client ID** and **API secrets** for each environment[\[1\]](https://plaid.com/docs/quickstart/#:~:text=You%27ll%20have%20two%20different%20API,to%20find%20your%20Sandbox%20secret)[\[2\]](https://plaid.com/docs/transactions/add-to-app/#:~:text=If%20you%20don%27t%20already%20have,menu%20on%20the%20Plaid%20Dashboard). For Sandbox testing, you will use the **Sandbox secret**, which is distinct from development or production secrets.

- **Get API Keys:** Note down your Plaid client_id and your Sandbox secret (found under _Sandbox_ keys in the dashboard)[\[1\]](https://plaid.com/docs/quickstart/#:~:text=You%27ll%20have%20two%20different%20API,to%20find%20your%20Sandbox%20secret). You do not need special permission for Sandbox; every developer account has a Sandbox environment available.
- **Enable Products:** Ensure that the **Transactions** product (and optionally **Balance**) is enabled for your account. In Sandbox, all core products are available by default, but in production you would request access to each product.

**Plaid Sandbox Credentials:** Plaid provides a universal set of test credentials for Sandbox. When linking an institution in Sandbox mode, use the username **user_good** and password **pass_good** to simulate a successful login[\[3\]](https://plaid.com/docs/sandbox/test-credentials/#:~:text=Sandbox%20simple%20test%20credentials). These will work for any available test institution. If prompted for a multi-factor code, you can use 1234 (the default MFA code in Sandbox)[\[4\]](https://plaid.com/docs/quickstart/#:~:text=Quickstart%20,enter%20a%202FA%20code%3A%201234).

## 2\. Installing Dependencies

Next, set up your Next.js application with the required packages. In addition to your existing stack (React, TypeScript, Tailwind, shadcn/ui), install the Plaid SDK and the Plaid Link React library:

\# Using npm or yarn to install Plaid and Plaid Link libraries  
npm install plaid react-plaid-link @supabase/supabase-js

This will install: - **plaid** - Official Plaid Node.js client library for server-side API calls. - **react-plaid-link** - React hook/component for integrating Plaid Link on the frontend. - **@supabase/supabase-js** - Supabase client for interacting with your database.

_(If you prefer, you can use fetch for API calls instead of adding axios. The examples below will use the Fetch API for simplicity.)_

## 3\. Configuring Environment Variables

Create a file named **.env.local** in the root of your Next.js project to store your environment variables. Add the following entries (replace the placeholder values with your actual keys):

\# Plaid API keys and environment  
PLAID_CLIENT_ID=&lt;your_plaid_client_id&gt;  
PLAID_SECRET=&lt;your_plaid_sandbox_secret&gt;  
PLAID_ENV=sandbox  
<br/>\# Supabase keys and URL  
NEXT_PUBLIC_SUPABASE_URL=&lt;your_supabase_project_url&gt;  
NEXT_PUBLIC_SUPABASE_ANON_KEY=&lt;your_supabase_anon_public_key&gt;  
SUPABASE_SERVICE_ROLE_KEY=&lt;your_supabase_service_role_key&gt;

- PLAID_CLIENT_ID and PLAID_SECRET should come from your Plaid dashboard (as obtained in step 1). We set PLAID_ENV=sandbox to ensure the Plaid client targets the Sandbox environment[\[5\]](https://medium.com/@nazardubovyk/step-by-step-guide-to-integrate-plaid-with-next-js-14-app-router-356b547b5a4a#:~:text=Create%20a%20,configure%20the%20Plaid%20development%20environment).
- The Supabase URL and anon key will be used on the frontend (NEXT_PUBLIC_\* variables are exposed to the client), while the SUPABASE_SERVICE_ROLE_KEY (which is sensitive) will only be used server-side for inserts. **Never expose your service role key on the client.**

After adding these, restart your dev server to load the new environment variables. Next.js will make process.env.PLAID_CLIENT_ID, etc., available in your Node.js environment, and NEXT_PUBLIC_\* vars available in the browser code.

## 4\. Designing the Supabase Schema (Accounts & Transactions)

Before writing integration code, set up your Supabase database tables to store account and transaction data. A straightforward schema design is as follows:

- **plaid_items** (optional but recommended): stores each Plaid **Item** (a connection to a financial institution) for a user.
- id (PK, auto-increment or UUID)
- user_id (foreign key to your app's user, e.g., Supabase auth.users UID)
- item_id (text, Plaid Item ID)
- access_token (text, the Plaid access token for this Item - **store encrypted or in a secure vault**)
- institution_name (text, name of the bank/institution)
- institution_id (text, Plaid institution ID)
- created_at (timestamp)
- **plaid_accounts**: stores bank account details for each Item.
- id (PK)
- user_id (references your user)
- item_id (text or foreign key referencing plaid_items.item_id)
- account_id (text, Plaid account ID, unique per Item)
- name (text, e.g. "My Checking") and official_name (text, full official account name)
- type and subtype (text, account type categorization from Plaid, e.g. _depository/checking_)
- mask (text, last 2-4 digits of the account number)
- current_balance (numeric)
- available_balance (numeric, nullable - available balance for depository accounts)
- iso_currency_code (text, currency code, e.g. "USD")
- **plaid_transactions**: stores transaction records.
- id (PK)
- user_id (your user reference for ownership, denormalized for convenience)
- account_id (text, Plaid account ID or foreign key to plaid_accounts.account_id)
- transaction_id (text, Plaid transaction ID, unique)
- name (text, transaction description/merchant)
- amount (numeric, transaction amount)
- date (date, posted date of the transaction)
- category (text or JSON, e.g. "Food and Drink")
- pending (boolean, true if the transaction is pending clearance)

In Supabase, you can create these tables via SQL or the table editor. For example, the plaid_accounts and plaid_transactions tables can be created with SQL like:

\-- Example: Create plaid_accounts table  
CREATE TABLE plaid_accounts (  
id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,  
user_id UUID REFERENCES auth.users(id),  
item_id TEXT,  
account_id TEXT UNIQUE,  
name TEXT,  
official_name TEXT,  
type TEXT,  
subtype TEXT,  
mask TEXT,  
current_balance NUMERIC,  
available_balance NUMERIC,  
iso_currency_code TEXT  
);  
<br/>\-- Example: Create plaid_transactions table  
CREATE TABLE plaid_transactions (  
id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,  
user_id UUID REFERENCES auth.users(id),  
account_id TEXT,  
transaction_id TEXT UNIQUE,  
name TEXT,  
amount NUMERIC,  
date DATE,  
category TEXT,  
pending BOOLEAN  
);

_(You might also implement foreign keys between plaid_accounts.account_id and plaid_transactions.account_id for data integrity.)_

By including user_id in each table, we can enforce row-level security so that users can only access their own records. If using Supabase Auth, consider adding RLS policies like _"users can only see their own accounts/transactions"_ using auth.uid()[\[6\]](https://docs.earna.sh/console/plaid-integration#:~:text=,uid%28%29%20%3D%20user_id) for security.

## 5\. Backend - Setting up Plaid API Route Handlers (Next.js)

We will create Next.js **Route Handlers** under the app/api directory to interact with Plaid. These are the backend endpoints that our frontend will call.

Before writing the route code, instantiate the Plaid client with your keys and environment. You can do this initialization in a separate module (e.g. lib/plaid.ts) or within each route file. We'll illustrate inline for clarity:

// Shared Plaid client configuration (Node.js)  
import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';  
<br/>const config = new Configuration({  
basePath: PlaidEnvironments\[process.env.PLAID_ENV as 'sandbox' | 'development' | 'production'\],  
baseOptions: {  
headers: {  
'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID || '',  
'PLAID-SECRET': process.env.PLAID_SECRET || '',  
},  
},  
});  
const plaidClient = new PlaidApi(config);

This configures the Plaid SDK to use your client ID, secret, and target the Sandbox environment[\[7\]](https://medium.com/@nazardubovyk/step-by-step-guide-to-integrate-plaid-with-next-js-14-app-router-356b547b5a4a#:~:text=import%20,from%20%27plaid)[\[8\]](https://plaid.com/docs/transactions/add-to-app/#:~:text=const%20,plaid). Now, let's create specific endpoints:

### a. Generate a Link Token (POST /api/plaid/create-link-token)

The Link token is a short-lived token that the frontend uses to initialize Plaid Link. Our route will accept a user identifier from the client (to tie the resulting Item to a user) and respond with a new link_token.

**File:** app/api/plaid/create-link-token/route.ts

import { NextRequest, NextResponse } from 'next/server';  
import { plaidClient } from '@/lib/plaid'; // (assuming we moved config into lib/plaid for reuse)  
import { Products, CountryCode } from 'plaid';  
<br/>export async function POST(req: NextRequest) {  
try {  
const { userId } = await req.json();  
// userId is a unique identifier for the current user (e.g., Supabase auth UID)  
<br/>// Create a new link token with desired settings  
const response = await plaidClient.linkTokenCreate({  
user: { client_user_id: userId }, // associate token with user  
client_name: 'My Next.js App',  
products: \[Products.Transactions\], // Products to use (e.g., Transactions)  
country_codes: \[CountryCode.Us\], // Country of institutions  
language: 'en',  
webhook: undefined // optional: set a webhook URL for transaction updates  
});  
<br/>const linkToken = response.data.link_token;  
return NextResponse.json({ link_token: linkToken });  
} catch (err) {  
console.error('Error creating link token:', err);  
return NextResponse.json({ error: 'Failed to create link token' }, { status: 500 });  
}  
}

**Explanation:** This handler calls plaidClient.linkTokenCreate() with a configuration object[\[9\]](https://plaid.com/docs/transactions/add-to-app/#:~:text=user%3A%20,page.html%27%2C%20country_codes%3A%20%5B%27US): - client_user_id is set to the current user's ID (so Plaid can associate the Item with your user). - client_name is an app name that appears in the Link UI. - products includes "transactions" (and you can add "auth" or "balance" if needed for other data). - country_codes here is just US (adjust if you need other regions). - webhook can be set to a URL that Plaid will call for updates (more on this in the sync section). For Sandbox testing, this can be left undefined or set to a test URL.

If successful, the route returns JSON containing the link_token. On error, it logs and returns a 500 status. The Plaid SDK handles sending your API keys in headers (configured in the client), and Plaid will respond with the new link token.

### b. Exchange Public Token for Access Token and Retrieve Data (POST /api/plaid/exchange-token)

Once the user successfully links their account in the frontend, Plaid Link will provide a public_token. We must exchange this for a permanent access_token on the backend, then use it to fetch account and transaction data. We will also store the results in Supabase.

**File:** app/api/plaid/exchange-token/route.ts

import { NextRequest, NextResponse } from 'next/server';  
import { plaidClient } from '@/lib/plaid';  
import { createClient } from '@supabase/supabase-js';  
<br/>// Initialize a Supabase client for server-side (use Service Role key for full DB access)  
const supabaseAdmin = createClient(  
process.env.NEXT_PUBLIC_SUPABASE_URL!,  
process.env.SUPABASE_SERVICE_ROLE_KEY!  
);  
<br/>export async function POST(req: NextRequest) {  
const { public_token, institution, accounts } = await req.json();  
// 'institution' and 'accounts' can be passed from client for reference (from Link onSuccess metadata)  
<br/>try {  
// 1. Exchange the public token for an access token  
const tokenResponse = await plaidClient.itemPublicTokenExchange({ public_token });  
const accessToken = tokenResponse.data.access_token;  
const itemId = tokenResponse.data.item_id;  
<br/>// 2. Store the new item (access token) in Supabase  
const userId = /\* your logic to get current user ID (from session or request) \*/;  
await supabaseAdmin.from('plaid_items').insert({  
user_id: userId,  
item_id: itemId,  
access_token: accessToken, // (Consider encrypting this before storing in a real app)  
institution_name: institution?.name,  
institution_id: institution?.institution_id,  
created_at: new Date().toISOString()  
});  
<br/>// 3. Fetch accounts associated with this Item from Plaid  
const accountsRes = await plaidClient.accountsGet({ access_token: accessToken });  
const plaidAccounts = accountsRes.data.accounts; // array of account objects  
<br/>// Store accounts in Supabase (convert to insertable format)  
const accountsToInsert = plaidAccounts.map(acct => ({  
user_id: userId,  
item_id: itemId,  
account_id: acct.account_id,  
name: acct.name,  
official_name: acct.official_name,  
type: acct.type,  
subtype: acct.subtype,  
mask: acct.mask,  
current_balance: acct.balances.current,  
available_balance: acct.balances.available,  
iso_currency_code: acct.balances.iso_currency_code  
}));  
if (accountsToInsert.length) {  
await supabaseAdmin.from('plaid_accounts').upsert(accountsToInsert, { onConflict: 'account_id' });  
}  
<br/>// 4. Fetch initial transactions data (e.g., last 30 days) from Plaid  
const now = new Date();  
const startDate = new Date();  
startDate.setMonth(startDate.getMonth() - 1); // 1 month ago  
const formatDate = (d: Date) => d.toISOString().split('T')\[0\];  
const transactionsRes = await plaidClient.transactionsGet({  
access_token: accessToken,  
start_date: formatDate(startDate),  
end_date: formatDate(now)  
});  
const plaidTransactions = transactionsRes.data.transactions;  
<br/>// Store transactions in Supabase  
const transactionsToInsert = plaidTransactions.map(tx => ({  
user_id: userId,  
account_id: tx.account_id,  
transaction_id: tx.transaction_id,  
name: tx.name,  
amount: tx.amount,  
date: tx.date,  
category: tx.category?.\[0\] || null,  
pending: tx.pending  
}));  
if (transactionsToInsert.length) {  
await supabaseAdmin.from('plaid_transactions').upsert(transactionsToInsert, { onConflict: 'transaction_id' });  
}  
<br/>return NextResponse.json({ success: true, item_id: itemId });  
} catch (error) {  
console.error('Error exchanging token or fetching data:', error);  
return NextResponse.json({ error: 'Token exchange or data fetch failed' }, { status: 500 });  
}  
}

**What this route does:**

- **Exchange public_token for access_token:** It calls plaidClient.itemPublicTokenExchange() with the public token provided by the client[\[10\]](https://plaid.com/docs/transactions/add-to-app/#:~:text=app,public_token%3A%20publicToken%2C). If successful, we receive a long-lived access_token and an item_id. The access token will be used for all future API calls for this Item (and should be kept secret). Plaid's docs recommend saving both the access_token and item_id in a secure datastore[\[11\]](https://plaid.com/docs/transactions/add-to-app/#:~:text=Save%20the%20,no%20need%20to%20store%20it).
- **Store the Item in the database:** We insert a record into plaid_items (or equivalent) with the user_id (you would determine the current user from auth context or session), item_id, and access_token. **Note:** In a production app, encrypt the access token before storing, or use a secure secrets manager[\[12\]](https://docs.earna.sh/console/plaid-integration#:~:text=%2F%2F%20Encrypt%20access%20token%20before,access_token). We also store institution info (from the request body metadata sent by client) for reference.
- **Fetch Accounts:** Using the access_token, we call plaidClient.accountsGet() to retrieve the accounts under this Item (e.g., checking or savings accounts) and their balances. We then upsert these into our plaid_accounts table. Each account object includes a Plaid account_id (unique per Item) and balance information (current and available) among other fields.
- **Fetch Transactions:** We call plaidClient.transactionsGet() with a date range (here, the last 30 days as an example) to get transactions for all accounts in the Item[\[13\]](https://plaid.com/docs/api/products/transactions/#:~:text=const%20request%3A%20TransactionsGetRequest%20%3D%20,total_transactions). The response includes an array of transactions and also an array of accounts (which we already handled)[\[14\]](https://plaid.com/docs/api/products/transactions/#:~:text=accounts). We map and insert the transaction records into plaid_transactions. We use upsert in case this route is called again or transactions already exist (on conflict by transaction_id). In Sandbox, the initial 30 days of transactions are usually available immediately, but full history (up to 2 years) might take a bit longer to populate; in production, you might need to handle the case where not all transactions are available immediately[\[15\]](https://plaid.com/docs/transactions/add-to-app/#:~:text=Typically%2C%20the%20first%2030%20days,and%20call%20the%20endpoint%20again).

Finally, the route returns a success response with the item_id. (In a real app, you might not send the access_token to the client at all, as the backend can query data as needed. Here we just confirm success.)

## 6\. Frontend - Integrating Plaid Link in Next.js

With the backend in place, integrate the Plaid Link flow on the frontend using React. We'll create a component that: (a) requests a Link token from our backend, (b) initializes the Plaid Link UI, and (c) handles the success callback to exchange the token and fetch data.

Key steps on the frontend: - Use a **client-side** component (Next.js React Server Components should be avoided here because Plaid Link interacts with window and user events). - Fetch the Link token by calling our /api/plaid/create-link-token endpoint. - Initialize Plaid Link using the usePlaidLink hook from react-plaid-link. - On success, send the public_token to our /api/plaid/exchange-token endpoint. - Provide feedback or trigger UI updates as needed (e.g., refresh a list of accounts or transactions from the database).

**File:** app/components/PlaidLinkButton.tsx (a client component)

"use client";  
<br/>import { useState, useEffect, useCallback } from 'react';  
import { usePlaidLink } from 'react-plaid-link';  
// If using shadcn/ui:  
import { Button } from "@/components/ui/button";  
<br/>interface Props {  
userId: string; // an identifier for the current user (could be a Supabase user ID)  
}  
<br/>export default function PlaidLinkButton({ userId }: Props) {  
const \[linkToken, setLinkToken\] = useState&lt;string | null&gt;(null);  
const \[loading, setLoading\] = useState(false);  
<br/>// 1. On mount, request a new Link token for this user  
useEffect(() => {  
const createLinkToken = async () => {  
try {  
const res = await fetch('/api/plaid/create-link-token', {  
method: 'POST',  
headers: { 'Content-Type': 'application/json' },  
body: JSON.stringify({ userId })  
});  
const data = await res.json();  
setLinkToken(data.link_token);  
} catch (err) {  
console.error("Failed to create link token:", err);  
}  
};  
createLinkToken();  
}, \[userId\]);  
<br/>// 2. Define the onSuccess callback for Plaid Link  
const onSuccess = useCallback(async (public_token: string, metadata: any) => {  
setLoading(true);  
try {  
// Send the public_token (and some metadata) to exchange for access_token and fetch data  
const res = await fetch('/api/plaid/exchange-token', {  
method: 'POST',  
headers: { 'Content-Type': 'application/json' },  
body: JSON.stringify({  
public_token,  
institution: metadata.institution,  
accounts: metadata.accounts  
})  
});  
const data = await res.json();  
if (res.ok && data.success) {  
console.log("Plaid item linked! Item ID:", data.item_id);  
// TODO: you could refresh local state or navigate to a dashboard showing accounts  
} else {  
console.error("Exchange failed:", data.error);  
}  
} catch (error) {  
console.error("Error exchanging public token:", error);  
} finally {  
setLoading(false);  
}  
}, \[\]);  
<br/>// 3. Prepare the Plaid Link configuration  
const config: Parameters&lt;typeof usePlaidLink&gt;\[0\] = {  
token: linkToken!,  
onSuccess,  
onExit: (err, metadata) => {  
if (err) {  
console.error('Plaid Link exited with error:', err);  
}  
// Handle if user closed the Link flow without completing  
},  
onEvent: (eventName, metadata) => {  
console.log('Plaid Link event:', eventName, metadata);  
}  
};  
<br/>const { open, ready } = usePlaidLink(config);  
<br/>return (  
&lt;div&gt;  
{linkToken ? (  
&lt;Button onClick={open} disabled={!ready || loading}&gt;  
{loading ? 'Linking...' : 'Connect Bank Account'}  
&lt;/Button&gt;  
) : (  
&lt;p&gt;Loading...&lt;/p&gt;  
)}  
&lt;/div&gt;  
);  
}

**Explanation:** This React component handles the Plaid Link flow: - On initial render, it POSTs to /api/plaid/create-link-token with the current user's ID to get a link_token[\[16\]](https://medium.com/@nazardubovyk/step-by-step-guide-to-integrate-plaid-with-next-js-14-app-router-356b547b5a4a#:~:text=const%20createLinkToken%20%3D%20async%20,token%27%2C). The Link token is stored in state. - It then configures usePlaidLink with that token and defines: - **onSuccess**: This callback is invoked after the user successfully links an account. We call our /api/plaid/exchange-token endpoint, sending the public_token and some metadata (like institution name and accounts selected)[\[17\]](https://docs.earna.sh/console/plaid-integration#:~:text=%2F%2F%20Handle%20successful%20connection%20const,%7B%20setLoading%28true)[\[18\]](https://docs.earna.sh/console/plaid-integration#:~:text=%3D). On a successful response, you might update UI to show that the account was linked (e.g., fetch and display accounts from Supabase). - **onExit**: Handles cases where the user closes the Plaid Link modal or an error occurs before completing. Here we just log it. - **onEvent** (optional): Logs other events during the Link flow (useful for debugging or analytics). - The component uses the Button from _shadcn/ui_ for styling, but you can use any button. We disable the button while loading or until ready is true (the ready flag indicates the Link script has loaded and is ready to open). - When the user clicks **Connect Bank Account**, it calls open() which launches the Plaid Link flow in a modal.

**Note:** The react-plaid-link hook automatically loads the Plaid Link script for you when provided with a token, so you don't need to include the &lt;script&gt; tag manually. Ensure the component is wrapped in a client context (using "use client" at top) because it interacts with the browser.

## 7\. Testing the Integration (Sandbox Mode)

With everything set up, you can now test the full flow in Sandbox:

- Start your Next.js dev server and navigate to the page where the PlaidLinkButton (or component) is rendered. For example, if you included it on a settings page or a dedicated /plaid-link page, go there in the browser.
- Click **Connect Bank Account** (which triggers the Plaid Link flow). A Plaid modal will appear allowing you to select a financial institution.
- In Sandbox, you can choose any institution (e.g., "First Platypus Bank" or "Chase (Sandbox)"). When prompted for credentials, use **Username:** user_good and **Password:** pass_good[\[3\]](https://plaid.com/docs/sandbox/test-credentials/#:~:text=Sandbox%20simple%20test%20credentials). This will simulate a successful login for the test institution. If an MFA code is requested (some institutions simulate multi-factor auth in sandbox), enter 1234 (the universal code for sandbox MFA).
- Upon success, the Plaid Link modal will close and your onSuccess callback will fire. This will call your backend /exchange-token route. Monitor your server logs or network tab:
- The exchange-token endpoint should return a { success: true, item_id: "..." } JSON if everything went right.
- Check your Supabase tables: you should see a new row in plaid_items (with the item ID and encrypted access token, if you implemented encryption) and one or more rows in plaid_accounts (for each account in that institution). The plaid_transactions table will have the latest transactions fetched for those accounts.
- You can extend the frontend to query your Supabase (using Supabase JS client or an API route) to display the accounts and transactions to the user, confirming that the integration works.

## 8\. (Optional) Keeping Transactions in Sync

In Sandbox, the data is static unless you use special sandbox test users. In a real app (and Plaid's Development/Production environments), transactions are updated as new banking activity occurs. To keep your stored transactions in sync with the bank, consider the following best practices:

- **Plaid Webhooks:** When creating the Link token, you can specify a webhook URL (e.g., an endpoint in your app)[\[19\]](https://plaid.com/docs/transactions/add-to-app/#:~:text=products%3A%20,page.html%27%2C%20country_codes%3A%20%5B%27US). Plaid will send POST requests to that webhook whenever there are new transactions, account balance updates, item login issues, etc. For Transactions, Plaid now uses a webhook event SYNC_UPDATES_AVAILABLE to indicate new or changed transactions[\[20\]](https://plaid.com/docs/transactions/sync-migration/#:~:text=Instead%2C%20update%20your%20webhook%20handlers,when%20this%20webhook%20is%20received). Your webhook handler can listen for this event and respond by fetching the latest data.
- **/transactions/sync endpoint:** Instead of periodically pulling the entire transaction history, Plaid offers /transactions/sync, an endpoint that uses a cursor to fetch only new or modified transactions since your last sync[\[21\]](https://plaid.com/docs/transactions/sync-migration/#:~:text=%2Ftransactions%2Fsync%20%20is%20a%20newer,updates%20have%20already%20been%20applied). This is more efficient than repeatedly calling /transactions/get for date ranges. On first call (with no cursor), it will return all available transactions (initial pull). It also returns a next_cursor value. You store this cursor (perhaps in your plaid_items table). On subsequent calls (or when you receive a webhook), call /transactions/sync with the saved cursor to get incremental updates[\[22\]](https://plaid.com/docs/transactions/sync-migration/#:~:text=%2Ftransactions%2Fsync%20%20instead%20uses%20a,updates%20have%20already%20been%20applied). This avoids duplicates and missing data, simplifying the sync logic.
- **Periodic Job (alternative):** If setting up webhooks is not feasible (for example, if running locally or on a platform without easily configurable webhooks), you can schedule periodic syncs. For instance, you could use a CRON job or a background worker to run every few hours: it would iterate over each saved access_token in your database, call Plaid for new transactions (either via /transactions/sync or by calling /transactions/get with the last stored transaction date), then update the database. Supabase Cloud Functions or Scheduler could facilitate this, or a simple Node cron in your server if it runs continuously.

**Simulating Updates in Sandbox:** Plaid Sandbox has special test users and endpoints to simulate new transactions. For example, using the user_transactions_dynamic credentials will generate transactions over time and even fire webhooks when /transactions/refresh is called[\[23\]](https://plaid.com/docs/sandbox/test-credentials/#:~:text=Use%20the%20username%20,user_small_business). This can help test your syncing logic. For simplicity, the basic user_good test user will have a fixed set of sample transactions.

By following this guide, you have integrated Plaid into a Next.js app using Route Handlers, and stored the financial data in a Supabase PostgreSQL database. You have a secure server-client token exchange flow[\[11\]](https://plaid.com/docs/transactions/add-to-app/#:~:text=Save%20the%20,no%20need%20to%20store%20it), and a foundation to build upon (for instance, displaying transactions in your UI, handling multiple bank links per user, adding Plaid webhooks for real-time updates, etc.). Happy coding!

**Sources:**

- Plaid Official Docs - Quickstart and API Reference[\[1\]](https://plaid.com/docs/quickstart/#:~:text=You%27ll%20have%20two%20different%20API,to%20find%20your%20Sandbox%20secret)[\[9\]](https://plaid.com/docs/transactions/add-to-app/#:~:text=user%3A%20,page.html%27%2C%20country_codes%3A%20%5B%27US)[\[10\]](https://plaid.com/docs/transactions/add-to-app/#:~:text=app,public_token%3A%20publicToken%2C)
- Plaid Official Docs - Sandbox Test Credentials[\[3\]](https://plaid.com/docs/sandbox/test-credentials/#:~:text=Sandbox%20simple%20test%20credentials)
- Plaid Official Docs - Transactions Sync Best Practices[\[21\]](https://plaid.com/docs/transactions/sync-migration/#:~:text=%2Ftransactions%2Fsync%20%20is%20a%20newer,updates%20have%20already%20been%20applied)[\[20\]](https://plaid.com/docs/transactions/sync-migration/#:~:text=Instead%2C%20update%20your%20webhook%20handlers,when%20this%20webhook%20is%20received)
- _Medium_ - _Plaid Integration with Next.js 14_ (Nazar Dubovyk)[\[24\]](https://medium.com/@nazardubovyk/step-by-step-guide-to-integrate-plaid-with-next-js-14-app-router-356b547b5a4a#:~:text=export%20async%20function%20POST,Products.Auth%2C%20Products.Transactions%2C)[\[25\]](https://medium.com/@nazardubovyk/step-by-step-guide-to-integrate-plaid-with-next-js-14-app-router-356b547b5a4a#:~:text=const%20client%20%3D%20new%20PlaidApi,public_token) (example code for Link token and token exchange)
- _Earna AI Docs_ - _Plaid Integration Guide_[\[12\]](https://docs.earna.sh/console/plaid-integration#:~:text=%2F%2F%20Encrypt%20access%20token%20before,access_token)[\[26\]](https://docs.earna.sh/console/plaid-integration#:~:text=%2F%2F%20Store%20connection%20in%20database,institution_id%2C%20accounts%3A%20accounts) (secure storage and Next.js route handler patterns)

[\[1\]](https://plaid.com/docs/quickstart/#:~:text=You%27ll%20have%20two%20different%20API,to%20find%20your%20Sandbox%20secret) [\[4\]](https://plaid.com/docs/quickstart/#:~:text=Quickstart%20,enter%20a%202FA%20code%3A%201234) Quickstart | Plaid Docs

<https://plaid.com/docs/quickstart/>

[\[2\]](https://plaid.com/docs/transactions/add-to-app/#:~:text=If%20you%20don%27t%20already%20have,menu%20on%20the%20Plaid%20Dashboard) [\[8\]](https://plaid.com/docs/transactions/add-to-app/#:~:text=const%20,plaid) [\[9\]](https://plaid.com/docs/transactions/add-to-app/#:~:text=user%3A%20,page.html%27%2C%20country_codes%3A%20%5B%27US) [\[10\]](https://plaid.com/docs/transactions/add-to-app/#:~:text=app,public_token%3A%20publicToken%2C) [\[11\]](https://plaid.com/docs/transactions/add-to-app/#:~:text=Save%20the%20,no%20need%20to%20store%20it) [\[15\]](https://plaid.com/docs/transactions/add-to-app/#:~:text=Typically%2C%20the%20first%2030%20days,and%20call%20the%20endpoint%20again) [\[19\]](https://plaid.com/docs/transactions/add-to-app/#:~:text=products%3A%20,page.html%27%2C%20country_codes%3A%20%5B%27US) Transactions - Add Transactions to your app | Plaid Docs

<https://plaid.com/docs/transactions/add-to-app/>

[\[3\]](https://plaid.com/docs/sandbox/test-credentials/#:~:text=Sandbox%20simple%20test%20credentials) [\[23\]](https://plaid.com/docs/sandbox/test-credentials/#:~:text=Use%20the%20username%20,user_small_business) Sandbox - Test credentials | Plaid Docs

<https://plaid.com/docs/sandbox/test-credentials/>

[\[5\]](https://medium.com/@nazardubovyk/step-by-step-guide-to-integrate-plaid-with-next-js-14-app-router-356b547b5a4a#:~:text=Create%20a%20,configure%20the%20Plaid%20development%20environment) [\[7\]](https://medium.com/@nazardubovyk/step-by-step-guide-to-integrate-plaid-with-next-js-14-app-router-356b547b5a4a#:~:text=import%20,from%20%27plaid) [\[16\]](https://medium.com/@nazardubovyk/step-by-step-guide-to-integrate-plaid-with-next-js-14-app-router-356b547b5a4a#:~:text=const%20createLinkToken%20%3D%20async%20,token%27%2C) [\[24\]](https://medium.com/@nazardubovyk/step-by-step-guide-to-integrate-plaid-with-next-js-14-app-router-356b547b5a4a#:~:text=export%20async%20function%20POST,Products.Auth%2C%20Products.Transactions%2C) [\[25\]](https://medium.com/@nazardubovyk/step-by-step-guide-to-integrate-plaid-with-next-js-14-app-router-356b547b5a4a#:~:text=const%20client%20%3D%20new%20PlaidApi,public_token) Plaid Integration With Next.js 14 | Medium

<https://medium.com/@nazardubovyk/step-by-step-guide-to-integrate-plaid-with-next-js-14-app-router-356b547b5a4a>

[\[6\]](https://docs.earna.sh/console/plaid-integration#:~:text=,uid%28%29%20%3D%20user_id) [\[12\]](https://docs.earna.sh/console/plaid-integration#:~:text=%2F%2F%20Encrypt%20access%20token%20before,access_token) [\[17\]](https://docs.earna.sh/console/plaid-integration#:~:text=%2F%2F%20Handle%20successful%20connection%20const,%7B%20setLoading%28true) [\[18\]](https://docs.earna.sh/console/plaid-integration#:~:text=%3D) [\[26\]](https://docs.earna.sh/console/plaid-integration#:~:text=%2F%2F%20Store%20connection%20in%20database,institution_id%2C%20accounts%3A%20accounts) Plaid Integration - Earna AI Documentation

<https://docs.earna.sh/console/plaid-integration>

[\[13\]](https://plaid.com/docs/api/products/transactions/#:~:text=const%20request%3A%20TransactionsGetRequest%20%3D%20,total_transactions) [\[14\]](https://plaid.com/docs/api/products/transactions/#:~:text=accounts) API - Transactions | Plaid Docs

<https://plaid.com/docs/api/products/transactions/>

[\[20\]](https://plaid.com/docs/transactions/sync-migration/#:~:text=Instead%2C%20update%20your%20webhook%20handlers,when%20this%20webhook%20is%20received) [\[21\]](https://plaid.com/docs/transactions/sync-migration/#:~:text=%2Ftransactions%2Fsync%20%20is%20a%20newer,updates%20have%20already%20been%20applied) [\[22\]](https://plaid.com/docs/transactions/sync-migration/#:~:text=%2Ftransactions%2Fsync%20%20instead%20uses%20a,updates%20have%20already%20been%20applied) Transactions - Transactions Sync migration guide | Plaid Docs

<https://plaid.com/docs/transactions/sync-migration/>