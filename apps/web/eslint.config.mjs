import next from "eslint-config-next";

const config = [
  ...next,
  {
    rules: {
      // Introduced by eslint-plugin-react-hooks v6. Pre-existing patterns in
      // connection-manager, profile-manager, publish-dialog and theme-toggle
      // predate the rule; keep them as warnings instead of refactoring.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
];

export default config;
