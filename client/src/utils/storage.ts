export function formatBytes(bytes: number) {
    if (!bytes) return '—';
    const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    let i = 0;
    let num = bytes;

    while (num >= 1024 && i < units.length - 1) {
        num /= 1024;
        i++;
    }

    return `${num.toFixed(1)} ${units[i]}`;
}
