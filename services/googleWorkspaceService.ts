/// <reference types="@types/gapi" />
/// <reference types="@types/gapi.client.docs" />
/// <reference types="@types/gapi.client.drive" />

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const SCOPES = 'https://www.googleapis.com/auth/documents https://www.googleapis.com/auth/drive.file';

let tokenClient: any;
let gapiInitialized = false;
let gsiInitialized = false;

// Initialize gapi client
const initializeGapiClient = async () => {
    await new Promise<void>((resolve, reject) => {
        gapi.load('client', {
            callback: resolve,
            onerror: reject,
        });
    });
    
    await gapi.client.init({
        discoveryDocs: [
            'https://docs.googleapis.com/$discovery/rest?version=v1',
            'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'
        ],
    });
    gapiInitialized = true;
};

// Initialize Google Identity Services
const initializeGsiClient = () => {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: '', // defined at request time
    });
    gsiInitialized = true;
};

export const initGoogleWorkspace = async () => {
    if (!CLIENT_ID) {
        throw new Error("VITE_GOOGLE_CLIENT_ID is not configured.");
    }
    const gapiPromise = initializeGapiClient();
    if (!gsiInitialized) {
        initializeGsiClient();
    }
    await gapiPromise;
};

export const authorize = (): Promise<string> => {
    return new Promise((resolve, reject) => {
        if (!tokenClient) {
            reject(new Error("Google Identity Services not initialized"));
            return;
        }

        tokenClient.callback = async (resp: any) => {
            if (resp.error !== undefined) {
                reject(resp);
                return;
            }
            resolve(resp.access_token);
        };

        if (gapi.client.getToken() === null) {
            tokenClient.requestAccessToken({prompt: 'consent'});
        } else {
            tokenClient.requestAccessToken({prompt: ''});
        }
    });
};

export const exportToGoogleDocs = async (title: string, content: string): Promise<string> => {
    if (!gapiInitialized || !gsiInitialized) {
        await initGoogleWorkspace();
    }
    await authorize();

    try {
        // 1. Create a new empty document
        const createResponse = await gapi.client.docs.documents.create({
            title: title
        });
        
        const documentId = createResponse.result.documentId;
        
        if (!documentId) {
            throw new Error("Failed to create document.");
        }

        // 2. Insert content into the document
        // We do a simple insert text at index 1
        await gapi.client.docs.documents.batchUpdate({
            documentId: documentId,
            resource: {
                requests: [
                    {
                        insertText: {
                            location: {
                                index: 1,
                            },
                            text: content
                        }
                    }
                ]
            }
        });

        // Return the document URL
        return `https://docs.google.com/document/d/${documentId}/edit`;
    } catch (error) {
        console.error("Error exporting to Google Docs:", error);
        throw error;
    }
};
