// Shared helper function to get API base URL
export const getApiBaseUrl = (): string => {
  // In browser environment, use same host as current page
  if (typeof window !== "undefined" && window.location) {
    const { hostname } = window.location;

    // If we're on the production domain, use relative path
    if (hostname !== "localhost" && hostname !== "127.0.0.1") {
      return "/api/v1";
    }
  }

  // Fallback for development
  return "http://localhost:8080/api/v1";
};
