const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const envPath = path.resolve(__dirname, '..', '.env');
require('dotenv').config({ path: envPath });

const PGDATA = path.resolve(__dirname, '..', process.env.PGDATA_DIR || './pgdata');
const PORT = process.env.DATABASE_PORT || '5433';
const DB_NAME = 'vial2';
const isWin = process.platform === 'win32';

const WHICH = isWin ? 'where' : 'which';

function run(cmd, opts = {}) {
  console.log(`> ${cmd}`);
  return execSync(cmd, { stdio: 'inherit', windowsHide: true, ...opts });
}

function q(s) {
  return isWin ? `"${s}"` : `'${s}'`;
}

function qSql(s) {
  return isWin ? `"${s.replace(/"/g, '\\"')}"` : `"${s}"`;
}

function cmdExists(name) {
  try {
    execSync(`${WHICH} ${name}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function ensureTools() {
  for (const tool of ['initdb', 'pg_ctl', 'psql', 'createdb']) {
    if (!cmdExists(tool)) {
      console.error(`ERROR: PostgreSQL tool '${tool}' not found in PATH.`);
      console.error('Install PostgreSQL and ensure its bin directory is on your PATH.');
      if (isWin) {
        console.error('  Download from: https://www.postgresql.org/download/windows/');
      } else {
        console.error('  Fedora: sudo dnf install postgresql-server');
        console.error('  macOS:  brew install postgresql');
        console.error('  Ubuntu: sudo apt install postgresql');
      }
      process.exit(1);
    }
  }
}

function init() {
  ensureTools();

  if (fs.existsSync(path.join(PGDATA, 'PG_VERSION'))) {
    console.log(`Database already initialized at ${PGDATA}`);
    return;
  }

  fs.mkdirSync(PGDATA, { recursive: true });
  run(`initdb -D ${q(PGDATA)}`);

  const pgHba = path.join(PGDATA, 'pg_hba.conf');
  let hba = fs.readFileSync(pgHba, 'utf-8');

  const hostLine = 'host all all 127.0.0.1/32 trust';
  if (!hba.includes(hostLine)) {
    hba += `\n${hostLine}\n`;
  }

  const localLine = 'local all all trust';
  const localPeer = /^local\s+all\s+all\s+peer$/m;
  if (localPeer.test(hba)) {
    hba = hba.replace(localPeer, localLine);
  } else if (!hba.includes('local all all trust')) {
    hba = hba.replace(/^local\s+all\s+all\s+\S+/m, localLine);
  }
  fs.writeFileSync(pgHba, hba);

  const pgConf = path.join(PGDATA, 'postgresql.conf');
  let conf = fs.readFileSync(pgConf, 'utf-8');
  conf = conf.replace(/#?port\s*=\s*\d+/, `port = ${PORT}`);
  if (!conf.includes('listen_addresses')) {
    conf += `\nlisten_addresses = 'localhost'\n`;
  } else {
    conf = conf.replace(/#?\s*listen_addresses\s*=.*/, `listen_addresses = 'localhost'`);
  }
  fs.writeFileSync(pgConf, conf);

  console.log(`Database initialized at ${PGDATA}`);
}

function start() {
  ensureTools();
  const s = getStatus();
  if (s.running) {
    console.log(`PostgreSQL already running (PID ${s.pid}) on port ${PORT}`);
    return;
  }
  run(`pg_ctl -D ${q(PGDATA)} -l ${q(path.join(PGDATA, 'pg.log'))} -o ${q(`-p ${PORT} -k ${PGDATA}`)} start`);
  console.log(`PostgreSQL started on port ${PORT}`);
  ensureRoleAndDb();
}

function stop() {
  const s = getStatus();
  if (!s.running) {
    console.log('PostgreSQL is not running');
    return;
  }
  run(`pg_ctl -D ${q(PGDATA)} stop`);
}

function status() {
  const s = getStatus();
  if (s.running) {
    console.log(`PostgreSQL is running (PID ${s.pid}) on port ${PORT}`);
    console.log(`Data directory: ${PGDATA}`);
  } else {
    console.log('PostgreSQL is not running');
  }
}

function getStatus() {
  try {
    const out = execSync(`pg_ctl -D ${q(PGDATA)} status`, { encoding: 'utf-8' });
    const m = out.match(/PID:\s*(\d+)/);
    return { running: true, pid: m ? m[1] : 'unknown' };
  } catch {
    return { running: false, pid: null };
  }
}

function ensureRoleAndDb() {
  const socketPsql = isWin
    ? `psql -p ${PORT} -h localhost -U postgres`
    : `psql -p ${PORT} -h ${PGDATA} -d postgres`;
  const tcpPsql = `psql -p ${PORT} -h localhost -U postgres`;

  const postgresExists = trySql(socketPsql, "SELECT 1 FROM pg_roles WHERE rolname='postgres'");
  if (postgresExists !== '1') {
    run(`${socketPsql} -c "CREATE ROLE postgres WITH LOGIN SUPERUSER;"`);
    console.log('Created postgres role');
  }

  const dbExists = trySql(tcpPsql, `SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'`);
  if (dbExists !== '1') {
    run(`createdb -p ${PORT} -h localhost -U postgres ${DB_NAME}`);
    console.log(`Database '${DB_NAME}' created`);
  }
}

function trySql(psqlCmd, query) {
  try {
    return execSync(`${psqlCmd} -c ${qSql(query)} -tA`, { encoding: 'utf-8' }).trim();
  } catch {
    return '';
  }
}

const cmd = process.argv[2];
switch (cmd) {
  case 'init':    init();    break;
  case 'start':   start();   break;
  case 'stop':    stop();    break;
  case 'status':  status();  break;
  case 'restart': stop(); start(); break;
  default:
    console.log('Usage: node scripts/manage-db.js {init|start|stop|restart|status}');
    process.exit(1);
}
