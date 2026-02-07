import { useState, useMemo } from "react";
import { X, RefreshCw } from "lucide-react";
import api from "../lib/api";

export function RenewContractModal({ contract, onClose, onSuccess }: { contract: any; onClose: () => void; onSuccess: () => void }) {
    const [amount, setAmount] = useState<string>(String(contract.rentAmount || contract.amount || ""));
    const [loading, setLoading] = useState(false);

    // Calculate new dates
    const { newStartDate, newEndDate } = useMemo(() => {
        if (!contract.startDate || !contract.endDate) return { newStartDate: new Date(), newEndDate: new Date() };

        const oldStart = new Date(contract.startDate);
        const oldEnd = new Date(contract.endDate);
        const durationTime = oldEnd.getTime() - oldStart.getTime();

        // New start = Old end + 1 day
        const start = new Date(oldEnd);
        start.setDate(start.getDate() + 1);

        // New end = New start + duration
        const end = new Date(start.getTime() + durationTime);

        return { newStartDate: start, newEndDate: end };
    }, [contract]);

    const handleConfirm = async () => {
        if (!amount) return alert("الرجاء إدخال مبلغ الإيجار");

        setLoading(true);
        try {
            // Use the new atomic renewal endpoint
            await api.post(`/api/contracts/${contract.id}/renew`, {
                startDate: newStartDate,
                endDate: newEndDate,
                amount: Number(amount),
            });

            onSuccess();
        } catch (e: any) {
            alert(e.response?.data?.message || "فشل التجديد");
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[1500] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md p-6 relative">
                <button onClick={onClose} className="absolute top-4 left-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                    <X className="w-5 h-5" />
                </button>

                <h3 className="text-xl font-bold mb-6 text-gray-800 dark:text-gray-100 text-right">تجديد العقد</h3>

                <div className="space-y-4" dir="rtl">
                    <div className="grid grid-cols-2 gap-4 text-right">
                        <div className="bg-gray-50 dark:bg-slate-700/50 p-3 rounded-lg">
                            <label className="text-xs text-gray-500 dark:text-slate-400 block mb-1">بداية العقد الجديد</label>
                            <div className="font-semibold text-gray-800 dark:text-gray-200" dir="ltr">{newStartDate.toLocaleDateString('en-CA')}</div>
                        </div>
                        <div className="bg-gray-50 dark:bg-slate-700/50 p-3 rounded-lg">
                            <label className="text-xs text-gray-500 dark:text-slate-400 block mb-1">نهاية العقد الجديد</label>
                            <div className="font-semibold text-gray-800 dark:text-gray-200" dir="ltr">{newEndDate.toLocaleDateString('en-CA')}</div>
                        </div>
                    </div>

                    <div className="text-right">
                        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">مبلغ الإيجار (ريال)</label>
                        <input
                            type="number"
                            className="form-input w-full dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                        />
                        <p className="text-xs text-gray-500 mt-1">نفس المبلغ السابق افتراضياً، يمكنك تعديله.</p>
                    </div>
                </div>

                <div className="flex justify-start gap-3 mt-8">
                    <button onClick={handleConfirm} className="btn-primary flex items-center gap-2" disabled={loading}>
                        {loading ? (
                            <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                <span>جاري التجديد...</span>
                            </>
                        ) : (
                            "تأكيد التجديد"
                        )}
                    </button>
                    <button onClick={onClose} className="btn-outline" disabled={loading}>إلغاء</button>
                </div>
            </div>
        </div>
    );
}
