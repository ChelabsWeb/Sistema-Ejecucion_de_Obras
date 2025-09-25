# syntax=docker/dockerfile:1
FROM node:20-bullseye AS base

ENV PNPM_HOME="/usr/local/share/pnpm"     PATH=":/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/games:/usr/local/games:/usr/lib/wsl/lib:/mnt/c/Users/ESTUDI~1/AppData/Local/Temp/.tmpcGxQmQ:/mnt/c/Users/Estudiante UCU/AppData/Roaming/npm/node_modules/@openai/codex/vendor/x86_64-pc-windows-msvc/path:/mnt/c/Program Files/Common Files/Oracle/Java/javapath:/mnt/c/Program Files (x86)/Common Files/Oracle/Java/javapath:/mnt/c/WINDOWS/system32:/mnt/c/WINDOWS:/mnt/c/WINDOWS/System32/Wbem:/mnt/c/WINDOWS/System32/WindowsPowerShell/v1.0/:/mnt/c/WINDOWS/System32/OpenSSH/:/mnt/c/Program Files/dotnet/:/mnt/c/Program Files/Git/cmd:/mnt/c/Program Files/doxygen/bin:/mnt/c/Users/Estudiante UCU/AppData/Local/Programs/cursor/resources/app/bin:/mnt/c/Program Files/nodejs/:/Docker/host/bin:/mnt/c/Users/Estudiante UCU/AppData/Local/Programs/Python/Python312/Scripts/:/mnt/c/Users/Estudiante UCU/AppData/Local/Programs/Python/Python312/:/mnt/c/Users/Estudiante UCU/AppData/Local/Microsoft/WindowsApps:/mnt/c/Program Files/JetBrains/PyCharm Community Edition 2024.1/bin:/mnt/c/Users/Estudiante UCU/.dotnet/tools:/mnt/c/Users/Estudiante UCU/AppData/Local/GitHubDesktop/bin:/mnt/c/Users/Estudiante UCU/AppData/Local/Programs/Microsoft VS Code/bin:/mnt/c/Users/Estudiante UCU/AppData/Local/Programs/cursor/resources/app/bin:/mnt/c/Users/Estudiante UCU/AppData/Roaming/npm"

RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps ./apps
COPY packages ./packages

# Install all workspace dependencies (pnpm uses the lockfile to keep versions pinned)
RUN pnpm install --frozen-lockfile

CMD ["pnpm", "--help"]
