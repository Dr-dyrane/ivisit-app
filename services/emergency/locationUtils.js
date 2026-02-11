// Helper to parse WKT Point
export const parsePoint = (wkt) => {
    if (!wkt || typeof wkt !== 'string' || !wkt.startsWith('POINT')) return null;
    try {
        const matches = wkt.match(/POINT\(([-\d.]+) ([-\d.]+)\)/);
        if (matches && matches.length === 3) {
            return { longitude: parseFloat(matches[1]), latitude: parseFloat(matches[2]) };
        }
    } catch (e) { return null; }
    return null;
};

export const parseEtaToSeconds = (eta) => {
    if (eta === null || eta === undefined) return null;

    // If it's already a number, just return it
    if (typeof eta === "number") return eta;

    if (typeof eta !== "string") return null;

    const lower = eta.toLowerCase();
    if (lower === "unknown") return 600; // Fallback to 10 mins if unknown

    const minutesMatch = lower.match(/(\d+)\s*(min|mins|minute|minutes)/);
    if (minutesMatch) return Number(minutesMatch[1]) * 60;
    const secondsMatch = lower.match(/(\d+)\s*(sec|secs|second|seconds)/);
    if (secondsMatch) return Number(secondsMatch[1]);

    // If it's a numeric string like "407", parse it as seconds
    if (/^\d+$/.test(eta)) return Number(eta);

    return 600; // Final fallback for other non-parseable strings
};
