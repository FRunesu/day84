import { storageGet, storageSet } from "../lib/storage.js";

const THEME_KEY = "day84:theme";

let theme = $state("dark");

export function themeState() {
  return {
    get theme() { return theme; },
    get isLight() { return theme === "light"; },
  };
}

function apply(value) {
  const root = document.documentElement;
  if (value === "light") root.dataset.theme = "light";
  else delete root.dataset.theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", value === "light" ? "#ebebeb" : "#000000");
}

export async function loadTheme() {
  const stored = await storageGet(THEME_KEY);
  theme = stored === "light" ? "light" : "dark";
  apply(theme);
}

export async function setTheme(value) {
  theme = value === "light" ? "light" : "dark";
  apply(theme);
  await storageSet(THEME_KEY, theme);
}
