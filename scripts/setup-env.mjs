import { randomBytes } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
const databasePassword = randomBytes(24).toString('hex');
const values = {
  POSTGRES_PASSWORD: databasePassword,
  DATABASE_URL: `postgresql://hockey:${databasePassword}@127.0.0.1:5432/hockey_iq`,
  MINIO_ROOT_PASSWORD: randomBytes(24).toString('hex'),
  SESSION_SECRET: randomBytes(32).toString('hex'),
};
const template = await readFile(
  new URL('../.env.example', import.meta.url),
  'utf8',
);
const content = template.replace(
  /^(POSTGRES_PASSWORD|DATABASE_URL|MINIO_ROOT_PASSWORD|SESSION_SECRET)=$/gm,
  (_line, key) => `${key}=${values[key]}`,
);
try {
  await writeFile(new URL('../.env', import.meta.url), content, {
    flag: 'wx',
    mode: 0o600,
  });
  console.info('Created .env with random local credentials.');
} catch (error) {
  if (error.code === 'EEXIST')
    console.info('.env already exists; no changes made.');
  else throw error;
}
