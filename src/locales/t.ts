// Utility to load Spanish localization
// Usage: import { t } from "../locales/t";
import es from "./es";

export const t = (key: keyof typeof es) => es[key];
