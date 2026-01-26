# Scripts

Operational tooling and local developer utilities live in this workspace. Scripts may be plain Node.js executables, shell scripts, or TypeScript programs compiled during CI.

## Usage

- Prefer authoring scripts in TypeScript where shared types are beneficial, and compile them via workspace build steps if needed.
- Keep command entry points executable by running `chmod +x` where appropriate.
- Document required environment variables at the top of each script file.
