"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.minifyGraphql = void 0;
function minifyGraphql(query) {
    if (!query)
        return '';
    let q = query;
    // Remove block comments /* ... */
    q = q.replace(/\/\*[\s\S]*?\*\//g, '');
    // Remove line comments # ... (but not inside strings)
    q = q.replace(/(^|\s)#[^\n]*/g, '$1');
    // Collapse whitespace
    q = q.replace(/\s+/g, ' ').trim();
    return q;
}
exports.minifyGraphql = minifyGraphql;
