import { useState } from "react";
import { Plus, FileText, Image, File as FileIcon, Trash2, Download, Eye, X } from "lucide-react";
import { TenantAttachment } from "../pages/hotel/tenantShared";
import { formatDateTime } from "../pages/hotel/tenantShared";
import api from "../lib/api";

type Props = {
    attachments: TenantAttachment[];
    onAdd: () => void;
    onDelete: (id: number) => Promise<void>;
};

const TYPE_LABELS: Record<string, string> = {
    CONTRACT: "عقد إيجار",
    ID: "هوية",
    RECEIPT: "إيصال",
    OTHER: "أخرى",
};

export default function TenantAttachments({ attachments, onAdd, onDelete }: Props) {
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [viewingAttachment, setViewingAttachment] = useState<TenantAttachment | null>(null);

    const handleDelete = async (id: number) => {
        if (!confirm("هل أنت متأكد من حذف هذا المرفق؟")) return;
        setDeletingId(id);
        try {
            await onDelete(id);
        } finally {
            setDeletingId(null);
        }
    };

    const getIcon = (fileName: string) => {
        const ext = fileName.split('.').pop()?.toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif'].includes(ext || '')) return <Image className="h-5 w-5 text-purple-500" />;
        if (ext === 'pdf') return <FileText className="h-5 w-5 text-red-500" />;
        return <FileIcon className="h-5 w-5 text-gray-500" />;
    };

    const getDownloadUrl = (filePath: string) => {
        // Assuming filePath is relative to uploads directory
        // Backend serves uploads at /uploads
        // filePath stored in DB might be absolute or relative "uploads\tenants\..."
        // We need to extract the part after "uploads"
        const normalizedPath = filePath.replace(/\\/g, '/');
        const parts = normalizedPath.split('uploads/');
        const relativePath = parts.length > 1 ? parts[1] : normalizedPath;

        // Construct URL based on backend URL (assuming proxied or same origin)
        // If running separately, might need API_URL
        return `${import.meta.env.VITE_API_URL || ''}/uploads/${relativePath}`;
    };

    return (
        <div className="card space-y-4">
            <header className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">المرفقات</h3>
                <button
                    onClick={onAdd}
                    className="btn-soft btn-soft-primary text-xs px-3 py-1 flex items-center gap-1"
                >
                    <Plus className="h-3 w-3" />
                    إضافة مرفق
                </button>
            </header>

            {attachments.length > 0 ? (
                <div className="space-y-3">
                    {attachments.map((att) => (
                        <div
                            key={att.id}
                            className="flex items-center justify-between rounded-lg border border-gray-100 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-white/5"
                        >
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-50 dark:bg-white/10">
                                    {getIcon(att.fileName)}
                                </div>
                                <div>
                                    <div className="font-medium text-gray-900 dark:text-white">{att.description || att.fileName}</div>
                                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400">
                                        <span className="rounded-full bg-gray-100 px-2 py-0.5 dark:bg-white/10">
                                            {TYPE_LABELS[att.fileType] || att.fileType}
                                        </span>
                                        <span>{formatDateTime(att.createdAt)}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setViewingAttachment(att)}
                                        className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-blue-600 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-blue-400"
                                        title="عرض"
                                    >
                                        <Eye className="h-4 w-4" />
                                    </button>
                                    <a
                                        href={getDownloadUrl(att.filePath)}
                                        download
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-indigo-600 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-indigo-400"
                                        title="تحميل"
                                    >
                                        <Download className="h-4 w-4" />
                                    </a>
                                    <button
                                        onClick={() => handleDelete(att.id)}
                                        disabled={deletingId === att.id}
                                        className="rounded-lg p-2 text-gray-500 hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                                        title="حذف"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-6 text-center text-gray-500 dark:text-slate-400">
                    <FileIcon className="mb-2 h-8 w-8 opacity-20" />
                    <p className="text-sm">لا توجد مرفقات</p>
                </div>
            )}

            {viewingAttachment && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onClick={() => setViewingAttachment(null)}>
                    <div className="relative w-full max-w-4xl max-h-[90vh] overflow-auto rounded-2xl bg-white p-2 shadow-2xl dark:bg-slate-800" onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => setViewingAttachment(null)}
                            className="absolute top-4 right-4 z-10 rounded-full bg-white/10 p-2 text-gray-500 hover:bg-white/20 hover:text-white transition-colors"
                        >
                            <X className="h-6 w-6" />
                        </button>
                        <div className="flex items-center justify-center min-h-[300px]">
                            {(() => {
                                const url = getDownloadUrl(viewingAttachment.filePath);
                                const ext = viewingAttachment.fileName.split('.').pop()?.toLowerCase();

                                if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) {
                                    return <img src={url} alt={viewingAttachment.description || ''} className="max-h-[85vh] w-auto rounded-lg object-contain" />;
                                }
                                if (ext === 'pdf') {
                                    return <iframe src={url} className="h-[85vh] w-full rounded-lg" title={viewingAttachment.fileName} />;
                                }
                                return (
                                    <div className="text-center">
                                        <FileIcon className="mx-auto h-16 w-16 text-gray-400" />
                                        <p className="mt-4 text-lg font-medium text-gray-900 dark:text-white">لا يمكن عرض هذا الملف</p>
                                        <a href={url} download className="mt-2 text-indigo-600 hover:text-indigo-800 hover:underline">
                                            تحميل الملف
                                        </a>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
