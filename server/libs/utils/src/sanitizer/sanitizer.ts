
export class Sanitizer {
    static parseNumericQueryParam(value: unknown) {
        if (value === undefined || value === null || value === '') {
            return null;
        }

        const parsed = Number.parseInt(String(value), 10);

        if (Number.isNaN(parsed)) {
            return null;
        }

        return parsed;
    }

    static parseFloatQueryParam(value: unknown) {
        if (value === undefined || value === null || value === '') {
            return null;
        }

        const parsed = Number.parseFloat(String(value));

        if (Number.isNaN(parsed)) {
            return null;
        }

        return parsed;
    }

    static parseBooleanQueryParam(value: unknown) {
        if (typeof value === 'boolean') {
            return value;
        }

        if (typeof value !== 'string') {
            return null;
        }

        const normalized = value.trim().toLowerCase();

        if (normalized === 'true') {
            return true;
        }

        if (normalized === 'false') {
            return false;
        }

        return null;
    }

    static normalizeTextQueryParam(value?: string | null) {
        if (value === undefined || value === null) {
            return null;
        }

        const text = value.trim();
        return text.length > 0 ? text : null;
    }

    static buildSearchPattern(rawTerm?: string | null) {
        if (!rawTerm) {
            return null;
        }

        const escaped = rawTerm.replace(/[%_]/g, '\\$&');
        return `%${escaped}%`;
    }

    static resolvePagination<T>(query: T & { page?: number; limit?: number; }) {
        const rawPage = Sanitizer.parseNumericQueryParam(query.page);
        const rawLimit = Sanitizer.parseNumericQueryParam(query.limit);

        const page = rawPage && rawPage > 0 ? rawPage : 1;
        const limit = rawLimit && rawLimit > 0 ? Math.min(rawLimit, 50) : 10;

        return { page, limit };
    }
}
