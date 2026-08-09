- **PR #795** Hold back TypeScript majors in dependabot — TS 7 makes `typescript-eslint`
  8.x throw on load, so `pnpm lint` failed before ESLint read a file and took the whole
  grouped dev-dependency PR red. The hold is now a config rule rather than closing that
  PR by hand each week; TS 6.x patches and minors still flow. files:
  `.github/dependabot.yml`
