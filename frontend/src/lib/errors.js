// Turns anything that can go wrong with a request into one short sentence a person can act on.
export const getErrorMessage = (error, fallback = "Something went wrong. Please try again.") => {
  if (!error) return fallback;

  const res = error.response;
  const serverMessage = res?.data?.message;

  if (res) {
    if (res.status === 429) {
      const retry = Number(res.headers?.["retry-after"]);
      const wait = Number.isFinite(retry) && retry > 0 ? ` Try again in ${retry > 90 ? `${Math.ceil(retry / 60)} min` : `${retry}s`}.` : "";
      return serverMessage || `You're going too fast.${wait}`;
    }
    if (typeof serverMessage === "string" && serverMessage) return serverMessage;
    if (res.status === 413) return "That file is too large.";
    if (res.status === 401) return "Please log in again.";
    if (res.status === 403) return "You don't have permission to do that.";
    if (res.status === 404) return "We couldn't find that.";
    if (res.status >= 500) return "The server had a problem. Please try again in a moment.";
    return fallback;
  }

  // no response at all: offline, DNS, server asleep, timeout
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return "You're offline. Check your connection.";
  }
  if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
    return "The server took too long to answer. Please try again.";
  }
  if (error.code === "ERR_NETWORK" || error.message === "Network Error") {
    return "Can't reach the server. Please check your connection and try again.";
  }
  if (error.code === "ERR_CANCELED") return "";
  return error.message && !/^Request failed/.test(error.message) ? error.message : fallback;
};

export const errorCode = (error) => error?.response?.data?.code;
