import { useState, useRef } from "react";
import { X, Upload, File } from "lucide-react";

type Props = {
    onClose: () => void;
    onSave: (file: File, type: string, description: string) => Promise<void>;
    saving: boolean;
};

const ATTACHMENT_TYPES = [
    { value: "CONTRACT", label: "نسخة عقد إيجار" },
    { value: "ID", label: "هوية وطنية - اقامة - جواز سفر" },
    { value: "RECEIPT", label: "إيصال سداد" },
    { value: "OTHER", label: "أخرى" },
];

export default function AddAttachmentModal({ onClose, onSave, saving }: Props) {
    const [file, setFile] = useState<File | null>(null);
    const [type, setType] = useState("OTHER");
    const [description, setDescription] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) return;
        await onSave(file, type, description);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md animate-in fade-in zoom-in-95 rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800">
                <div className="mb-6 flex items-center justify-between">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">إضافة مرفق</h3>
                    <button onClick={onClose} className="rounded-full p-1 hover:bg-gray-100 dark:hover:bg-white/10">
                        <X className="h-5 w-5 text-gray-500 dark:text-slate-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div
                        className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 transition-colors ${file ? "border-indigo-500 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-500/10" : "border-gray-300 hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5"
                            }`}
                    >
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="absolute inset-0 cursor-pointer opacity-0"
                            accept=".pdf,image/*"
                        />
                        {file ? (
                            <div className="text-center">
                                <File className="mx-auto h-10 w-10 text-indigo-600 dark:text-indigo-400" />
                                <p className="mt-2 text-sm font-medium text-gray-900 dark:text-white truncate max-w-[200px]">{file.name}</p>
                                <p className="text-xs text-gray-500 dark:text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setFile(null);
                                        if (fileInputRef.current) fileInputRef.current.value = "";
                                    }}
                                    className="mt-2 text-xs text-red-600 hover:text-red-700 hover:underline"
                                >
                                    إزالة
                                </button>
                            </div>
                        ) : (
                            <div className="text-center">
                                <Upload className="mx-auto h-10 w-10 text-gray-400" />
                                <p className="mt-2 text-sm font-medium text-gray-900 dark:text-white">اضغط لاختيار ملف</p>
                                <p className="text-xs text-gray-500 dark:text-slate-400">PDF, JPG, PNG (Max 5MB)</p>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">نوع المرفق</label>
                        <select
                            value={type}
                            onChange={(e) => setType(e.target.value)}
                            className="form-select w-full"
                        >
                            {ATTACHMENT_TYPES.map((t) => (
                                <option key={t.value} value={t.value}>
                                    {t.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">وصف (اختياري)</label>
                        <input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="form-input w-full"
                            placeholder="وصف مختصر للمرفق"
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            className="btn-soft btn-soft-secondary flex-1"
                            onClick={onClose}
                            disabled={saving}
                        >
                            إلغاء
                        </button>
                        <button
                            type="submit"
                            className="btn-solid btn-solid-primary flex-1"
                            disabled={saving || !file}
                        >
                            {saving ? "جاري الرفع..." : "حفظ المرفق"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
