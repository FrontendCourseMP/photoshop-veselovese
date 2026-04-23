export const rgbToLab = (r: number, g: number, b: number): { L: number; A: number; B: number } => {
    let r1 = r / 255;
    let g1 = g / 255;
    let b1 = b / 255;

    const toLinear = (c: number) => (c > 0.04045 ? Math.pow((c + 0.055) / 1.055, 2.4) : c / 12.92);

    r1 = toLinear(r1);
    g1 = toLinear(g1);
    b1 = toLinear(b1);

    const x = (r1 * 0.4124 + g1 * 0.3576 + b1 * 0.1805) / 0.95047; // Xr
    const y = (r1 * 0.2126 + g1 * 0.7152 + b1 * 0.0722) / 1.00000; // Yr
    const z = (r1 * 0.0193 + g1 * 0.1192 + b1 * 0.9505) / 1.08883; // Zr

    const f = (t: number) => (t > 0.008856 ? Math.pow(t, 1 / 3) : (7.787 * t + 16) / 116);

    const L = 116 * f(y) - 16;
    const a = 500 * (f(x) - f(y));
    const bVal = 200 * (f(y) - f(z));

    return {
        L: Math.round(L * 10) / 10, // Округление
        A: Math.round(a * 10) / 10,
        B: Math.round(bVal * 10) / 10
    };
};