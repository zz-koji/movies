// api.ts
export async function getStorageUsage() {
    const res = await fetch('/api/storage/usage');
    return res.json();
}

export async function getDisks() {
    const res = await fetch('/api/storage/disks');
    return res.json();
}
