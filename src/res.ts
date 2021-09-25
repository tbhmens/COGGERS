import { lookup } from "filename2mime";
import { readFileSync } from "node:fs";
import { ServerResponse } from "node:http";

export class Response extends ServerResponse {
	protocol: string;
	query: Record<string, string>;
	ip: string;
	secure: boolean;
	/**
	 * Extends ServerResponse (Basically a constructor)
	 * @private
	 */
	extend(): Response {
		// @ts-ignore Exists on HTTPS IncomingMessage
		this.secure = this.socket.encrypted;
		this.protocol = this.secure ? "https" : "http";
		this.ip = this.socket.remoteAddress;
		return this;
	}
	get headers(): Record<string, string | number | string[]> {
		return new Proxy({} as Record<string, string | number | string[]>, {
			/* Use lambdas instead of functions to make `this` refer to res and not the proxy */
			get: (_, name: string) => {
				return this.getHeader(name);
			},
			set: (_, name: string, value) => {
				this.setHeader(name, value);
				return true;
			},
			deleteProperty: (_, name: string) => {
				this.removeHeader(name);
				return true;
			},
			has: (_, name: string) => {
				return this.hasHeader(name);
			},
		});
	}
	status(code: number, message?: string): Response {
		if (code) this.statusCode = code;
		if (message) this.statusMessage = message ?? statusCodes[code];
		return this;
	}
	sendStatus(code: number, message?: string): void {
		this.status(code, message).end();
	}
	json(data: unknown): void {
		this.headers["Content-Type"] ??= "application/json; charset=UTF-8";
		this.end(JSON.stringify(data));
	}
	send(data: unknown): void {
		if (data instanceof Uint8Array) {
			this.headers["Content-Type"] ??= "application/octet-stream";
			this.end(data);
		} else if (typeof data === "string") {
			this.headers["Content-Type"] ??= "text/html; charset=UTF-8";
			this.end(data);
		} else if (data == null) this.end();
		else this.json(data);
	}
	sendFile(file: string): void {
		this.headers["Content-Type"] ??= lookup(file);
		this.end(readFileSync(file));
	}
	set(headers: Record<string, string | number | string[]>): Response;
	set(header: string, value: string | number | string[]): Response;
	set(
		header: string | Record<string, string | number | string[]>,
		value?: string | number | string[]
	): Response {
		if (typeof header === "object")
			for (const key in header) this.headers[key] = header[key];
		else this.headers[header] = value;
		return this;
	}
	redirect(url: string, status?: number): void {
		this.status(status || 302);
		this.headers.Location = url;
		this.end();
	}
	static extend(res: ServerResponse): Response {
		const proto = Response.prototype;
		/* Support HTTPS by setting the `extends` to the prototype of `res`.*/
		Object.setPrototypeOf(proto, Object.getPrototypeOf(res));
		Object.setPrototypeOf(res, proto);
		return (res as Response).extend();
	}
}

const statusCodes = {
	100: "Continue",
	101: "Switching Protocols",
	102: "Processing",
	103: "Early Hints",
	200: "OK",
	201: "Created",
	202: "Accepted",
	203: "Non-Authoritative Information",
	204: "No Content",
	205: "Reset Content",
	206: "Partial Content",
	207: "Multi-Status",
	208: "Already Reported",
	226: "IM Used",
	300: "Multiple Choices",
	301: "Moved Permanently",
	302: "Found",
	303: "See Other",
	304: "Not Modified",
	307: "Temporary Redirect",
	308: "Permanent Redirect",
	400: "Bad Request",
	401: "Unauthorized",
	402: "Payment Required",
	403: "Forbidden",
	404: "Not Found",
	405: "Method Not Allowed",
	406: "Not Acceptable",
	407: "Proxy Authentication Required",
	408: "Request Timeout",
	409: "Conflict",
	410: "Gone",
	411: "Length Required",
	412: "Precondition Failed",
	413: "Payload Too Large",
	414: "URI Too Long",
	415: "Unsupported Media Type",
	416: "Range Not Satisfiable",
	417: "Expectation Failed",
	418: "I'm a teapot",
	421: "Misdirected Request",
	422: "Unprocessable Entity",
	423: "Locked",
	424: "Failed Dependency",
	425: "Too Early",
	426: "Upgrade Required",
	428: "Precondition Required",
	429: "Too Many Requests",
	431: "Request Header Fields Too Large",
	451: "Unavailable For Legal Reasons",
	500: "Internal Server Error",
	501: "Not Implemented",
	502: "Bad Gateway",
	503: "Service Unavailable",
	504: "Gateway Timeout",
	505: "HTTP Version Not Supported",
	506: "Variant Also Negotiates",
	507: "Insufficient Storage",
	508: "Loop Detected",
	510: "Not Extended",
	511: "Network Authentication Required",
};