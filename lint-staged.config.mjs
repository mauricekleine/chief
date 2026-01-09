/**
 * @type {import('lint-staged').Configuration}
 */
const config = {
  "*": ["prettier --ignore-unknown --write"],
  "package.json": ["sort-package-json"],
};

export default config;
