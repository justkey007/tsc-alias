import { existsSync, readdirSync } from 'fs';
import { join } from 'path';
import * as rimraf from 'rimraf';
import * as shell from 'shelljs';

const projectsRoot = join(__dirname, '../projects');

function cleanDistDirectories(dir: string) {
  if (!existsSync(dir)) return;
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'dist') {
        rimraf.sync(fullPath);
      } else {
        cleanDistDirectories(fullPath);
      }
    }
  }
}

function runTestProject(projectName: string) {
  const projectDir = join(projectsRoot, projectName);
  cleanDistDirectories(projectDir);
  const { code, stdout, stderr } = shell.exec('npm start', {
    cwd: projectDir,
    silent: true
  });

  if (code !== 0) {
    console.error(`Project ${projectName} failed`);
    console.error('stdout:\n', stdout);
    console.error('stderr:\n', stderr);
  }

  expect(code).toEqual(0);
}

// Run tests on projects. 9-11 are for testing fullpath file resolution
it.each([1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 20, 21, 22, 23, 24, 25, 26])(
  'Project %d runs after alias resolution',
  (value) => {
    runTestProject(`project${value}`);
  }
);

it.each([171, 229, 233, 251, 261, 263, 265, 275, 276])('issue %d should work correctly', (value) => {
  runTestProject(`issue${value}`);
});
