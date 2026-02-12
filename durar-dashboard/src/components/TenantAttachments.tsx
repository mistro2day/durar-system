import { useState } from "react";
import { Plus, FileText, Image, File as FileIcon, Trash2, Download, Eye, X, Pencil } from "lucide-react";
import { TenantAttachment } from "../pages/hotel/tenantShared";
import { formatDateTime } from "../pages/hotel/tenantShared";
import api from "../lib/api";

type Props = {
    attachments: TenantAttachment[];
    onAdd: () => void;
    onDelete: (id: number) => Promise<void>;
    onUpdate?: () => void;
};

const TYPE_LABELS: Record<string, string> = {
    CONTRACT: "عقد إيجار",
    ID: "هوية وطنية - اقامة - جواز سفر",
    RECEIPT: "إيصال سداد",
    OTHER: "أخرى",
};

const ATTACHMENT_TYPES = [
    { value: "CONTRACT", label: "نسخة عقد إيجار" },
    { value: "ID", label: "هوية وطنية - اقامة - جواز سفر" },
    { value: "RECEIPT", label: "إيصال سداد" },
    { value: "OTHER", label: "أخرى" },
];

export default function TenantAttachments({ attachments, onAdd, onDelete, onUpdate }: Props) {
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [viewingAttachment, setViewingAttachment] = useState<TenantAttachment | null>(null);
    const [editingAttachment, setEditingAttachment] = useState<TenantAttachment | null>(null);
    const [editForm, setEditForm] = useState({ description: "", fileType: "" });
    const [saving, setSaving] = useState(false);

    const handleDelete = async (id: number) => {
        if (!confirm("هل أنت متأكد من حذف هذا المرفق؟")) return;
        setDeletingId(id);
        try {
            await onDelete(id);
        } finally {
            setDeletingId(null);
        }
    };

    const handleEditClick = (att: TenantAttachment) => {
        setEditingAttachment(att);
        setEditForm({
            description: att.description || "",
            fileType: att.fileType || "OTHER",
        });
    };

    const handleSaveEdit = async () => {
        if (!editingAttachment) return;
        setSaving(true);
        try {
            await api.put(`/api/attachments/${editingAttachment.id}`, {
                description: editForm.description,
                fileType: editForm.fileType,
            });
            setEditingAttachment(null);
            if (onUpdate) onUpdate();
        } catch (e: any) {
            alert(e?.response?.data?.message || "تعذر تحديث المرفق");
        } finally {
            setSaving(false);
        }
    };

    const getIcon = (fileName: string) => {
        const ext = fileName.split('.').pop()?.toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) return <Image className="h-5 w-5 text-purple-500" />;
        if (ext === 'pdf') return <FileText className="h-5 w-5 text-red-500" />;
        return <FileIcon className="h-5 w-5 text-gray-500" />;
    };

    const getDownloadUrl = (filePath: string) => {
        const normalizedPath = filePath.replace(/\\/g, '/');
        const parts = normalizedPath.split('uploads/');
        const relativePath = parts.length > 1 ? parts[1] : normalizedPath;

        const base = import.meta.env.VITE_API_URL || "";
        // If the base URL ends with /api, we should use the new /api/uploads route
        if (base.endsWith('/api')) {
            return `${base}/uploads/${relativePath}`;
        }
        return `${base}/uploads/${relativePath}`;
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
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-50 dark:bg-white/10">
                                    {getIcon(att.fileName)}
                                </div>
                                <div className="min-w-0">
                                    <div className="font-medium text-gray-900 dark:text-white truncate">{att.description || att.fileName}</div>
                                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400">
                                        <span className="rounded-full bg-gray-100 px-2 py-0.5 dark:bg-white/10 whitespace-nowrap">
                                            {TYPE_LABELS[att.fileType] || att.fileType}
                                        </span>
                                        <span className="whitespace-nowrap">{formatDateTime(att.createdAt)}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-1 sm:gap-2 shrink-0 pr-2">
                                <button
                                    onClick={() => handleEditClick(att)}
                                    className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-blue-600 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-blue-400"
                                    title="تعديل"
                                >
                                    <Pencil className="h-4 w-4" />
                                </button>
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
                        <div className="flex items-center justify-center min-h-[400px]">
                            {(() => {
                                const url = getDownloadUrl(viewingAttachment.filePath);
                                const ext = viewingAttachment.fileName.split('.').pop()?.toLowerCase();
                                const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '');

                                return (
                                    <div className="flex flex-col items-center gap-4 w-full">
                                        {isImage ? (
                                            <img
                                                src={url}
                                                alt={viewingAttachment.description || ''}
                                                className="max-h-[80vh] w-auto rounded-lg object-contain shadow-md"
                                                onError={(e) => {
                                                    (e.target as any).src = "https://placehold.co/600x400?text=Error+Loading+Image";
                                                }}
                                            />
                                        ) : ext === 'pdf' ? (
                                            <iframe
                                                src={url}
                                                className="h-[80vh] w-full rounded-lg border-0"
                                                title={viewingAttachment.fileName}
                                                style={{ display: 'block' }}
                                            />
                                        ) : (
                                            <div className="text-center p-10">
                                                <FileIcon className="mx-auto h-20 w-20 text-gray-300" />
                                                <p className="mt-4 text-lg font-medium text-gray-900 dark:text-white">لا يمكن معاينة هذا النوع من الملفات</p>
                                            </div>
                                        )}

                                        <div className="flex gap-4 p-2">
                                            <a
                                                href={url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                            >
                                                <Eye className="h-4 w-4" />
                                                فتح في نافذة جديدة
                                            </a>
                                            <a
                                                href={url}
                                                download
                                                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors dark:bg-white/10 dark:text-gray-300 dark:hover:bg-white/20"
                                            >
                                                <Download className="h-4 w-4" />
                                                تحميل الملف
                                            </a>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            )}

            {editingAttachment && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={() => setEditingAttachment(null)}>
                    <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-slate-800" onClick={e => e.stopPropagation()}>
                        <h3 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">تعديل المرفق</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">نوع المرفق</label>
                                <select
                                    className="form-select w-full"
                                    value={editForm.fileType}
                                    onChange={e => setEditForm({ ...editForm, fileType: e.target.value })}
                                >
                                    {ATTACHMENT_TYPES.map(t => (
                                        <option key={t.value} value={t.value}>{t.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">الوصف</label>
                                <input
                                    type="text"
                                    className="form-input w-full"
                                    value={editForm.description}
                                    onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                                    placeholder="وصف المرفق..."
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    className="btn-soft btn-soft-secondary"
                                    onClick={() => setEditingAttachment(null)}
                                    disabled={saving}
                                >
                                    إلغاء
                                </button>
                                <button
                                    className="btn-primary"
                                    onClick={handleSaveEdit}
                                    disabled={saving}
                                >
                                    {saving ? "جاري الحفظ..." : "حفظ التغييرات"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
