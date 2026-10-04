// The Test Lab only exists on the dev server. It is code-split and removed from production builds,
// because its tools and canned reports touch the solution.
export const IS_TEST = import.meta.env.DEV
