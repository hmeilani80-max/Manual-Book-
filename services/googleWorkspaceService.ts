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
        const createResponse = await gapi.client.docs.documents.create({
            title: title
        });
        
        const documentId = createResponse.result.documentId;
        
        if (!documentId) {
            throw new Error("Failed to create document.");
        }

        let plainText = "";
        let currentIndex = 1;
        const formatRequests: any[] = [];
        
        const lines = content.split('\n');
        
        for (let line of lines) {
            // Detect layout roles
            let isTitle = line.includes('Manual Book Draft');
            let isH1 = /^\d+\.\s/.test(line.trim());
            let isH2 = line.includes('**Fungsi**') || line.includes('**Manfaat**') || line.includes('**Langkah Penggunaan**');
            let isSubtitle = /^\(.*\)$/.test(line.trim());
            let isDivider = line.includes('=================================') || line.includes('---');
            
            // Clean markdown tokens
            line = line.replace(/\*\*/g, '');
            line = line.replace(/\*/g, '');
            
            const textToInsert = line + '\n';
            const startIndex = currentIndex;
            const endIndex = startIndex + textToInsert.length;
            
            plainText += textToInsert;
            currentIndex = endIndex;
            
            // Add formatting requests for non-empty structural lines
            if (textToInsert.trim().length > 0 && !isDivider) {
                const range = { startIndex, endIndex };
                
                // Base Paragraph Text Style (Arial, 11pt, Dark Gray)
                formatRequests.push({
                    updateTextStyle: {
                        range,
                        textStyle: {
                            weightedFontFamily: { fontFamily: 'Arial' },
                            fontSize: { magnitude: 11, unit: 'PT' },
                            foregroundColor: { color: { rgbColor: { red: 0.1, green: 0.1, blue: 0.1 } } }
                        },
                        fields: 'weightedFontFamily,fontSize,foregroundColor'
                    }
                });
                
                // Title Override
                if (isTitle) {
                    formatRequests.push({
                        updateTextStyle: {
                            range,
                            textStyle: { fontSize: { magnitude: 24, unit: 'PT' }, bold: true },
                            fields: 'fontSize,bold'
                        }
                    });
                    formatRequests.push({
                        updateParagraphStyle: {
                            range,
                            paragraphStyle: { alignment: 'CENTER' },
                            fields: 'alignment'
                        }
                    });
                } 
                // Heading 1 Override (NasDem Blue)
                else if (isH1) {
                    formatRequests.push({
                        updateTextStyle: {
                            range,
                            textStyle: { 
                                fontSize: { magnitude: 16, unit: 'PT' }, 
                                bold: true, 
                                foregroundColor: { color: { rgbColor: { red: 0, green: 43/255, blue: 92/255 } } } 
                            },
                            fields: 'fontSize,bold,foregroundColor'
                        }
                    });
                } 
                // Heading 2 Override
                else if (isH2) {
                    formatRequests.push({
                        updateTextStyle: {
                            range,
                            textStyle: { fontSize: { magnitude: 11, unit: 'PT' }, bold: true },
                            fields: 'fontSize,bold'
                        }
                    });
                } 
                // Subtitle Override
                else if (isSubtitle) {
                    formatRequests.push({
                        updateTextStyle: {
                            range,
                            textStyle: { italic: true, foregroundColor: { color: { rgbColor: { red: 0.4, green: 0.4, blue: 0.4 } } } },
                            fields: 'italic,foregroundColor'
                        }
                    });
                }
                
                // Paragraph Spacing
                formatRequests.push({
                    updateParagraphStyle: {
                        range,
                        paragraphStyle: {
                            spaceAbove: { magnitude: isH1 ? 24 : (isH2 ? 14 : 0), unit: 'PT' },
                            spaceBelow: { magnitude: isH1 ? 4 : (isH2 ? 4 : 8), unit: 'PT' },
                            indentStart: { magnitude: (!isTitle && !isH1 && !isH2 && !isSubtitle) ? 18 : 0, unit: 'PT' }
                        },
                        fields: 'spaceAbove,spaceBelow,indentStart'
                    }
                });
            }
        }

        // Apply everything in a single batch
        await gapi.client.docs.documents.batchUpdate({
            documentId: documentId,
            resource: {
                requests: [
                    { insertText: { location: { index: 1 }, text: plainText } },
                    ...formatRequests
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
