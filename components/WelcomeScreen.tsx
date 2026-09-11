/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useCallback } from 'react';
import Spinner from './Spinner';
import UploadCloudIcon from './icons/UploadCloudIcon';
import CarIcon from './icons/CarIcon';
import WashingMachineIcon from './icons/WashingMachineIcon';
import TrashIcon from './icons/TrashIcon';

interface WelcomeScreenProps {
    onUpload: () => Promise<void>;
    apiKeyError: string | null;
    files: File[];
    setFiles: React.Dispatch<React.SetStateAction<File[]>>;
}

const sampleDocuments = [
    {
        name: 'Hyundai i10 Manual',
        details: '562 pages, PDF',
        url: 'https://www.hyundai.com/content/dam/hyundai/in/en/data/connect-to-service/owners-manual/2025/i20&i20nlineFromOct2023-Present.pdf',
        icon: <CarIcon />,
        fileName: 'hyundai-i10-manual.pdf'
    },
    {
        name: 'LG Washer Manual',
        details: '36 pages, PDF',
        url: 'https://www.lg.com/us/support/products/documents/WM2077CW.pdf',
        icon: <WashingMachineIcon />,
        fileName: 'lg-washer-manual.pdf'
    }
];

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onUpload, apiKeyError, files, setFiles }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [loadingSample, setLoadingSample] = useState<string | null>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            setFiles(prev => [...prev, ...Array.from(event.target.files!)]);
        }
    };
    
    const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDragging(false);
        if (event.dataTransfer.files) {
            setFiles(prev => [...prev, ...Array.from(event.dataTransfer.files)]);
        }
    }, [setFiles]);

    const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        if (!isDragging) setIsDragging(true);
    }, [isDragging]);
    
    const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDragging(false);
    }, []);

    const handleSelectSample = async (name: string, url: string, fileName: string) => {
        if (loadingSample) return;
        setLoadingSample(name);
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch ${name}: ${response.statusText}. This may be a CORS issue.`);
            }
            const blob = await response.blob();
            const file = new File([blob], fileName, { type: blob.type });
            setFiles(prev => [...prev, file]);
        } catch (error) {
            console.error("Error fetching sample file:", error);
            if (error instanceof Error && error.message.includes('Failed to fetch')) {
                alert(`Could not fetch the sample document. Please try uploading a local file instead.`);
            }
        } finally {
            setLoadingSample(null);
        }
    };

    const handleConfirmUpload = async () => {
        try {
            await onUpload();
        } catch (error) {
            console.error("Upload process failed:", error);
        }
    };

    const handleRemoveFile = (indexToRemove: number) => {
        setFiles(prevFiles => prevFiles.filter((_, index) => index !== indexToRemove));
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 sm:p-6 lg:p-8">
            <div className="w-full max-w-3xl text-center">
                <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-3 text-gem-offwhite">
                    Manual Book Generator
                </h1>
                <p className="text-gem-offwhite/70 mb-8 max-w-xl mx-auto text-base sm:text-lg">
                    Unggah catatan modul, dokumen fitur, atau manual untuk menyusun panduan pengguna terstruktur otomatis.
                </p>

                {apiKeyError && (
                    <div className="w-full max-w-xl mx-auto mb-6 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                        {apiKeyError}
                    </div>
                )}

                <div 
                    className={`relative border-2 border-dashed rounded-2xl p-10 text-center transition-all mb-6 bg-gem-slate/40 backdrop-blur-sm shadow-sm ${
                        isDragging ? 'border-gem-blue bg-gem-blue/5' : 'border-gem-mist/50 hover:border-gem-blue/40'
                    }`}
                    onDrop={handleDrop} 
                    onDragOver={handleDragOver} 
                    onDragLeave={handleDragLeave}
                >
                    <div className="flex flex-col items-center justify-center">
                        <UploadCloudIcon />
                        <p className="mt-4 text-base sm:text-lg text-gem-offwhite/90 font-medium">
                            Tarik & letakkan file dokumen (PDF, TXT, atau MD) di sini
                        </p>
                        <p className="text-xs text-gem-offwhite/50 mt-1">
                            Bisa berupa catatan ringkas dashboard, FAQ, atau panduan modul
                        </p>
                        <input 
                            id="file-upload" 
                            type="file" 
                            multiple 
                            className="hidden" 
                            onChange={handleFileChange} 
                            accept=".pdf,.txt,.md"
                        />
                        <label 
                            htmlFor="file-upload" 
                            className="mt-5 cursor-pointer px-6 py-2.5 bg-gem-blue text-white rounded-full font-semibold hover:bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gem-blue shadow-sm" 
                            title="Pilih file dari perangkat Anda"
                            tabIndex={0}
                            onKeyDown={e => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    (document.getElementById('file-upload') as HTMLInputElement)?.click();
                                }
                            }}
                        >
                            Pilih Dokumen
                        </label>
                    </div>
                </div>

                {files.length > 0 && (
                    <div className="w-full max-w-xl mx-auto mb-6 text-left">
                        <h4 className="font-semibold mb-2 text-gem-offwhite/90 text-sm">Dokumen Terpilih ({files.length}):</h4>
                        <ul className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                            {files.map((file, index) => (
                                <li key={`${file.name}-${index}`} className="text-sm bg-gem-slate border border-gem-mist/40 p-2.5 rounded-xl flex justify-between items-center shadow-xs">
                                    <span className="truncate font-medium text-gem-offwhite" title={file.name}>{file.name}</span>
                                    <div className="flex items-center flex-shrink-0 ml-3">
                                        <span className="text-xs text-gem-offwhite/50">{(file.size / 1024).toFixed(1)} KB</span>
                                        <button 
                                            onClick={() => handleRemoveFile(index)}
                                            className="ml-2.5 p-1 text-red-500 hover:text-red-400 rounded-md transition-colors"
                                            aria-label={`Hapus ${file.name}`}
                                            title="Hapus file ini"
                                        >
                                            <TrashIcon />
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                
                <div className="w-full max-w-xl mx-auto">
                    {files.length > 0 && (
                        <button 
                            onClick={handleConfirmUpload}
                            className="w-full px-6 py-3.5 rounded-xl bg-gem-blue hover:bg-blue-600 text-white font-bold transition-all shadow-md active:scale-[0.99]"
                            title="Mulai sesi tanya jawab dan penyusunan manual"
                        >
                            Proses & Buat Manual Book
                        </button>
                    )}
                </div>
                
                <div className="flex items-center my-8 max-w-xl mx-auto">
                    <div className="flex-grow border-t border-gem-mist/50"></div>
                    <span className="flex-shrink mx-4 text-xs font-semibold text-gem-offwhite/50 tracking-wider">ATAU PILIH CONTOH</span>
                    <div className="flex-grow border-t border-gem-mist/50"></div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto mb-8">
                    {sampleDocuments.map(doc => (
                        <button
                            key={doc.name}
                            onClick={() => handleSelectSample(doc.name, doc.url, doc.fileName)}
                            disabled={!!loadingSample}
                            className="bg-gem-slate p-4 rounded-xl border border-gem-mist/50 hover:border-gem-blue/50 hover:bg-gem-mist/10 transition-all text-left flex items-center space-x-4 disabled:opacity-50 disabled:cursor-wait shadow-xs"
                            title={`Coba dokumen ${doc.name}`}
                        >
                            <div className="w-12 h-12 flex items-center justify-center flex-shrink-0 bg-gem-mist/30 rounded-lg">
                                {loadingSample === doc.name ? <Spinner /> : doc.icon}
                            </div>
                            <div className="overflow-hidden">
                                <p className="font-semibold text-gem-offwhite text-sm truncate">{doc.name}</p>
                                <p className="text-xs text-gem-offwhite/60">{doc.details}</p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default WelcomeScreen;
