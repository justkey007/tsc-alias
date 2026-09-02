import { join } from 'path';
import * as rimraf from 'rimraf';
import * as shell from 'shelljs';

const projectsRoot = join(__dirname, '../projects');

function runTestProject(projectName: string) {
  const projectDir = join(projectsRoot, projectName);
  rimraf.sync(join(projectDir, 'dist'));
  rimraf.sync(join(projectDir, 'app/dist'));
  rimraf.sync(join(projectDir, 'core/dist'));
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

it.each([171, 251, 261, 263, 265])('issue %d should work correctly', (value) => {
  runTestProject(`issue${value}`);
});
