import log from "electron-log/main";

const secretPatterns = [
  /sk-[A-Za-z0-9_-]+/g,
  /(?:api[-_ ]?key|authorization|password)["':= ]+[^\s,"'}]+/gi,
];
export function redact(value: unknown): string {
  let text = typeof value === "string" ? value : JSON.stringify(value);
  for (const pattern of secretPatterns)
    text = text.replace(pattern, "[REDACTED]");
  return text;
}
export function configureLogging(): void {
  log.initialize();
  log.transports.file.maxSize = 2 * 1024 * 1024;
  log.hooks.push((message) => ({ ...message, data: message.data.map(redact) }));
}
export const logger = {
  info: (event: string, detail?: unknown) =>
    log.info(event, detail === undefined ? "" : redact(detail)),
  error: (event: string, detail?: unknown) =>
    log.error(event, detail === undefined ? "" : redact(detail)),
};
