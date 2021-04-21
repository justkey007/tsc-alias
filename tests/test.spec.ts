import { join } from 'path';
import * as rimraf from 'rimraf';
import * as shell from 'shelljs';

const projectsRoot = join(__dirname, '../projects');

[1, 3, 4, 5, 6, 7, 8].forEach((value) => {
  it(`Project ${value}`, () => {
    const projectDir = join(projectsRoot, `project${value}`);
    rimraf.sync(join(projectDir, 'dist'));
    const { code, stderr } = shell.exec('npm start', {
      cwd: projectDir,
      silent: true
    });
    if (code !== 0) console.error(stderr);
    expect(code).toEqual(0);
  });
});
