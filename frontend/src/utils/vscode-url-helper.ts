/**
 * Helper function to transform VS Code URLs
 *
 * This function checks if a VS Code URL points to localhost and replaces it with
 * the current window's hostname if they don't match. When the resulting hostname
 * matches the current page, the protocol is also updated and the port is
 * stripped so the VS Code server can be served through a reverse proxy under the
 * `/vscode/` path.
 *
 * @param vsCodeUrl The original VS Code URL from the backend
 * @returns The transformed URL with the correct hostname
 */
export function transformVSCodeUrl(vsCodeUrl: string | null): string | null {
  if (!vsCodeUrl) return null;

  try {
    const url = new URL(vsCodeUrl);
    const currentHost = window.location.hostname;
    const currentProtocol = window.location.protocol;

    // If the backend returns a localhost style URL (localhost, 127.0.0.1,
    // host.docker.internal, 0.0.0.0 or a private IP) but the current page is
    // served from another host, replace it with the page's hostname so the
    // iframe can be embedded.
    const isLocalHostname = [
      "localhost",
      "127.0.0.1",
      "host.docker.internal",
      "0.0.0.0",
    ].includes(url.hostname);

    const isPrivateIp = /^(10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|192\.168\.|169\.254\.)/.test(
      url.hostname,
    );

    if ((isLocalHostname || isPrivateIp) && currentHost !== "localhost") {
      url.hostname = currentHost;
    }

    // If the hostname now matches the current page, update the protocol and
    // strip the port. This allows the VS Code server to be proxied under the
    // same origin as the app.
    if (url.hostname === currentHost) {
      url.protocol = currentProtocol;

      if (url.port) {
        url.port = "";

        if (!url.pathname.startsWith("/vscode")) {
          const trimmed = url.pathname.startsWith("/")
            ? url.pathname.slice(1)
            : url.pathname;
          url.pathname = `/vscode/${trimmed}`;
        }
      }
    }

    return url.toString();
  } catch {
    return vsCodeUrl;
  }
}
