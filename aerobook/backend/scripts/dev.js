
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const backendDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
);

const port = Number(process.env.PORT || 5000);

function getPortPids() {
  if (process.platform !== 'win32') return [];

  try {
    const output = execFileSync(
      'powershell.exe',
      [
        '-NoProfile',
        '-Command',
        `(Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue).OwningProcess`
      ],
      { encoding: 'utf8' }
    );

    return [...new Set(
      output.trim().split(/\s+/).map(Number).filter(Boolean)
    )];
  } catch {
    return [];
  }
}

async function clearPort() {
  const pids = getPortPids();

  for (const pid of pids) {
    try {
      const command = execFileSync(
        'powershell.exe',
        [
          '-NoProfile',
          '-Command',
          `(Get-CimInstance Win32_Process -Filter "ProcessId=${pid}").CommandLine`
        ],
        { encoding: 'utf8' }
      );

      // Only stop an existing AeroBook backend process.
      if (
        !command.includes('server.js') &&
        !command.includes('nodemon')
      ) {
        console.error(
          `Port ${port} is occupied by PID ${pid}. ` +
          'It does not appear to be the AeroBook backend.'
        );
        process.exit(1);
      }

      console.log(`Stopping old backend process ${pid}...`);

      execFileSync(
        'taskkill',
        ['/PID', String(pid), '/T', '/F'],
        { stdio: 'ignore' }
      );
    } catch (error) {
      console.error(
        `Could not safely clear port ${port}:`,
        error.message
      );
      process.exit(1);
    }
  }
}

await clearPort();

const nodemonPath = path.join(
  backendDir,
  'node_modules',
  'nodemon',
  'bin',
  'nodemon.js'
);

const child = spawn(
  process.execPath,
  [nodemonPath, 'src/server.js'],
  {
    cwd: backendDir,
    stdio: 'inherit'
  }
);

function shutdown() {
  if (child.pid && process.platform === 'win32') {
    try {
      execFileSync(
        'taskkill',
        ['/PID', String(child.pid), '/T', '/F'],
        { stdio: 'ignore' }
      );
    } catch {
      // Child may already have exited.
    }
  } else if (!child.killed) {
    child.kill();
  }
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
