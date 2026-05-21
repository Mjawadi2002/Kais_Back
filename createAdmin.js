#!/usr/bin/env node
/**
 * RouteFlow — Create Admin User
 * Usage:
 *   node createAdmin.js                              (interactive prompts)
 *   node createAdmin.js --name "Ali" --email "ali@example.com" --password "secret123"
 */

require('dotenv').config();
const readline = require('readline');
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const User     = require('./models/UserModel');

// ── ANSI colours ────────────────────────────────────────────────────────────
const c = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  cyan:   '\x1b[36m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  red:    '\x1b[31m',
  dim:    '\x1b[2m',
};
const log   = (msg) => console.log(msg);
const ok    = (msg) => console.log(`${c.green}✔${c.reset}  ${msg}`);
const warn  = (msg) => console.log(`${c.yellow}⚠${c.reset}  ${msg}`);
const err   = (msg) => console.log(`${c.red}✖${c.reset}  ${msg}`);
const title = (msg) => console.log(`\n${c.bold}${c.cyan}${msg}${c.reset}\n`);

// ── Parse --flag value args ──────────────────────────────────────────────────
function parseArgs() {
  const args = process.argv.slice(2);
  const map  = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--') && args[i + 1] && !args[i + 1].startsWith('--')) {
      map[args[i].slice(2)] = args[++i];
    }
  }
  return map;
}

// ── Readline helper ──────────────────────────────────────────────────────────
function ask(rl, question, defaultVal = '', hidden = false) {
  return new Promise((resolve) => {
    if (hidden && process.stdin.isTTY) {
      process.stdout.write(question);
      process.stdin.setRawMode(true);
      process.stdin.resume();
      let input = '';
      process.stdin.on('data', function handler(ch) {
        const char = ch.toString();
        if (char === '\n' || char === '\r' || char === '') {
          process.stdin.setRawMode(false);
          process.stdin.removeListener('data', handler);
          process.stdout.write('\n');
          resolve(input || defaultVal);
        } else if (char === '') {
          process.exit();
        } else if (char === '') {
          if (input.length) { input = input.slice(0, -1); process.stdout.write('\b \b'); }
        } else {
          input += char;
          process.stdout.write('*');
        }
      });
    } else {
      rl.question(question, (answer) => resolve(answer.trim() || defaultVal));
    }
  });
}

// ── Validation ───────────────────────────────────────────────────────────────
function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  title('RouteFlow — Admin Account Setup');

  // 1. Check MONGO_URI
  const MONGO_URI = process.env.MONGO_URI;
  if (!MONGO_URI) {
    err('MONGO_URI is not set. Make sure backend/.env exists and contains MONGO_URI.');
    process.exit(1);
  }

  // 2. Collect credentials
  const flags = parseArgs();
  let name, email, password;

  if (flags.name && flags.email && flags.password) {
    // Non-interactive mode
    name     = flags.name.trim();
    email    = flags.email.trim().toLowerCase();
    password = flags.password;
    log(`${c.dim}Using flags: name="${name}", email="${email}", password=${'*'.repeat(password.length)}${c.reset}`);
  } else {
    // Interactive mode
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

    log(`${c.dim}Press Enter to use the default value shown in [brackets].${c.reset}\n`);

    name = await ask(rl, `  Full name       : `);
    while (!name) {
      warn('Name cannot be empty.');
      name = await ask(rl, `  Full name       : `);
    }

    email = await ask(rl, `  Email address   : `);
    while (!email || !validateEmail(email)) {
      warn('Please enter a valid email address.');
      email = await ask(rl, `  Email address   : `);
    }
    email = email.toLowerCase();

    password = await ask(rl, `  Password        : `, '', true);
    while (!password || password.length < 6) {
      warn('Password must be at least 6 characters.');
      password = await ask(rl, `  Password        : `, '', true);
    }

    rl.close();
  }

  // 3. Connect to MongoDB
  log('');
  log(`${c.dim}Connecting to database…${c.reset}`);
  try {
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 8000 });
    ok(`Connected to MongoDB  ${c.dim}(${mongoose.connection.host}/${mongoose.connection.name})${c.reset}`);
  } catch (e) {
    err(`Could not connect to MongoDB: ${e.message}`);
    process.exit(1);
  }

  // 4. Check for duplicate email
  const existing = await User.findOne({ email });
  if (existing) {
    warn(`A user with email "${email}" already exists (role: ${existing.role}).`);
    if (existing.role === 'admin') {
      ok('An admin account already exists — nothing to do.');
    } else {
      err('Cannot create admin: email belongs to a non-admin account.');
    }
    await mongoose.disconnect();
    process.exit(0);
  }

  // 5. Hash password & create admin
  const hashed = await bcrypt.hash(password, 12);
  const admin  = await User.create({ name, email, password: hashed, role: 'admin' });

  // 6. Success
  log('');
  log('─'.repeat(52));
  ok(`${c.bold}Admin account created successfully!${c.reset}`);
  log('─'.repeat(52));
  log(`  ${c.dim}ID    :${c.reset}  ${admin._id}`);
  log(`  ${c.dim}Name  :${c.reset}  ${admin.name}`);
  log(`  ${c.dim}Email :${c.reset}  ${admin.email}`);
  log(`  ${c.dim}Role  :${c.reset}  ${admin.role}`);
  log('─'.repeat(52));
  log(`\n  You can now sign in at the RouteFlow login page.\n`);

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((e) => {
  err(`Unexpected error: ${e.message}`);
  process.exit(1);
});
