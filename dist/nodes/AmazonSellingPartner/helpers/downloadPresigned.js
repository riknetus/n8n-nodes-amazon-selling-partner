"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadPresigned = void 0;
const axios_1 = __importDefault(require("axios"));
async function downloadPresigned(url) {
    const res = await axios_1.default.get(url, { responseType: 'arraybuffer', validateStatus: s => s < 500 });
    if (res.status >= 400) {
        throw new Error(`Failed to download document: HTTP ${res.status}`);
    }
    const contentType = res.headers['content-type'];
    return { buffer: Buffer.from(res.data), contentType };
}
exports.downloadPresigned = downloadPresigned;
