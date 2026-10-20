
export const formatNumber = (num: number | string): string => {
    if (num === '' || num === null || num === undefined) return '';
    const n = typeof num === 'string' ? parseFloat(num) : num;
    if (isNaN(n)) return '';
    return n.toLocaleString('th-TH', { maximumFractionDigits: 2 });
};

export const parseNumber = (str: string): number => {
    if (!str) return 0;
    return parseFloat(str.replace(/,/g, '')) || 0;
};

export const getCurrentTimestamp = (): string => {
    return new Date().toLocaleString('th-TH');
};

export const formatDateThai = (dateStr: string): string => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};
