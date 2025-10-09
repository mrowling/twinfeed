// Twin color utility functions

export const colorMap = {
  blue: {
    bg: "bg-blue-500",
    bgLight: "bg-blue-100",
    bgDark: "bg-blue-600",
    text: "text-blue-700",
    textDark: "text-blue-300",
    border: "border-blue-500",
    ring: "ring-blue-500",
  },
  pink: {
    bg: "bg-pink-500",
    bgLight: "bg-pink-100",
    bgDark: "bg-pink-600",
    text: "text-pink-700",
    textDark: "text-pink-300",
    border: "border-pink-500",
    ring: "ring-pink-500",
  },
  green: {
    bg: "bg-green-500",
    bgLight: "bg-green-100",
    bgDark: "bg-green-600",
    text: "text-green-700",
    textDark: "text-green-300",
    border: "border-green-500",
    ring: "ring-green-500",
  },
  purple: {
    bg: "bg-purple-500",
    bgLight: "bg-purple-100",
    bgDark: "bg-purple-600",
    text: "text-purple-700",
    textDark: "text-purple-300",
    border: "border-purple-500",
    ring: "ring-purple-500",
  },
  orange: {
    bg: "bg-orange-500",
    bgLight: "bg-orange-100",
    bgDark: "bg-orange-600",
    text: "text-orange-700",
    textDark: "text-orange-300",
    border: "border-orange-500",
    ring: "ring-orange-500",
  },
  red: {
    bg: "bg-red-500",
    bgLight: "bg-red-100",
    bgDark: "bg-red-600",
    text: "text-red-700",
    textDark: "text-red-300",
    border: "border-red-500",
    ring: "ring-red-500",
  },
  yellow: {
    bg: "bg-yellow-500",
    bgLight: "bg-yellow-100",
    bgDark: "bg-yellow-600",
    text: "text-yellow-700",
    textDark: "text-yellow-300",
    border: "border-yellow-500",
    ring: "ring-yellow-500",
  },
  teal: {
    bg: "bg-teal-500",
    bgLight: "bg-teal-100",
    bgDark: "bg-teal-600",
    text: "text-teal-700",
    textDark: "text-teal-300",
    border: "border-teal-500",
    ring: "ring-teal-500",
  },
  indigo: {
    bg: "bg-indigo-500",
    bgLight: "bg-indigo-100",
    bgDark: "bg-indigo-600",
    text: "text-indigo-700",
    textDark: "text-indigo-300",
    border: "border-indigo-500",
    ring: "ring-indigo-500",
  },
  gray: {
    bg: "bg-gray-500",
    bgLight: "bg-gray-100",
    bgDark: "bg-gray-600",
    text: "text-gray-700",
    textDark: "text-gray-300",
    border: "border-gray-500",
    ring: "ring-gray-500",
  },
};

export function getTwinColor(twin: "A" | "B"): string {
  if (twin === "A") {
    return localStorage.getItem("twinAColor") || "blue";
  } else {
    return localStorage.getItem("twinBColor") || "pink";
  }
}

export function getTwinColorClasses(twin: "A" | "B") {
  const color = getTwinColor(twin);
  return colorMap[color as keyof typeof colorMap] || colorMap.blue;
}
