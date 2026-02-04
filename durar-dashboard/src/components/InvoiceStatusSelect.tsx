
import { useState, useRef, useEffect } from 'react';
import api from '../lib/api';

const STATUS_OPTIONS = [
    { value: 'PENDING', label: 'معلقة', color: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' },
    { value: 'PAID', label: 'مدفوعة', color: 'bg-green-100 text-green-700 hover:bg-green-200' },
    { value: 'CANCELLED', label: 'ملغاة', color: 'bg-gray-100 text-gray-700 hover:bg-gray-200' },
];

export function InvoiceStatusSelect({ invoice, onUpdate }: { invoice: any; onUpdate: (id: number, status: string) => void }) {
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const [coords, setCoords] = useState({ top: 0, right: 0 });

    const isLate = invoice.status === 'PENDING' && new Date(invoice.dueDate) < new Date();

    // Computed current display
    let currentLabel = STATUS_OPTIONS.find(o => o.value === invoice.status)?.label;
    let currentColor = STATUS_OPTIONS.find(o => o.value === invoice.status)?.color?.split(' ')[0] + ' ' + STATUS_OPTIONS.find(o => o.value === invoice.status)?.color?.split(' ')[1];

    if (isLate) {
        currentLabel = 'متأخرة';
        currentColor = 'bg-red-100 text-red-700';
    }

    const updatePosition = () => {
        if (buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            // Align to the right edge of the button
            // window.innerWidth - rect.right gives distance from right edge
            setCoords({
                top: rect.bottom + 5,
                right: window.innerWidth - rect.right
            });
        }
    };

    useEffect(() => {
        if (isOpen) {
            updatePosition();
            window.addEventListener('resize', updatePosition);
            window.addEventListener('scroll', updatePosition, true);
        }
        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
        };
    }, [isOpen]);

    const handleSelect = async (status: string) => {
        setLoading(true);
        setIsOpen(false);
        try {
            await api.put(`/api/invoices/${invoice.id}/status`, { status });
            onUpdate(invoice.id, status);
        } catch (error) {
            console.error("Failed to update status", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative inline-block">
            <button
                ref={buttonRef}
                onClick={() => {
                    updatePosition();
                    setIsOpen(!isOpen);
                }}
                disabled={loading}
                className={`px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 ${currentColor} ${loading ? 'opacity-50' : ''}`}
            >
                {loading ? '...' : currentLabel}
                <svg className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
                    <div
                        className="fixed z-50 flex items-center gap-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-100 dark:border-gray-700 p-2 whitespace-nowrap"
                        style={{ top: coords.top, right: coords.right }}
                    >
                        {STATUS_OPTIONS.map((option) => (
                            <button
                                key={option.value}
                                onClick={() => handleSelect(option.value)}
                                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${option.color}
                                    ${invoice.status === option.value ? 'ring-2 ring-offset-1 ring-blue-500' : ''}
                                `}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
