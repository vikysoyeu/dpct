export function rescueRequestDisplayName(request: { code?: string | null; name?: string | null }) {
  return request.code ? `Yêu cầu cứu trợ #${request.code}` : "Yêu cầu cứu trợ";
}

export function rescueRequestSearchText(request: { code?: string | null; name?: string | null }) {
  return `${rescueRequestDisplayName(request)} ${request.name ?? ""}`;
}
